import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_JOB, MAIL_QUEUE } from '../mail/mail.constants';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

const ORDER_STEP = 1000;

const LABEL_SELECT = { select: { id: true, name: true, color: true } };
const ASSIGNEE_SELECT = { select: { id: true, name: true, email: true } };

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async create(boardId: string, listId: string, dto: CreateCardDto) {
    await this.ensureListInBoard(boardId, listId);

    const last = await this.prisma.card.findFirst({
      where: { listId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? 0) + ORDER_STEP;

    return this.prisma.card.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate,
        order,
        listId,
      },
    });
  }

  async findAll(boardId: string, listId: string) {
    await this.ensureListInBoard(boardId, listId);
    return this.prisma.card.findMany({
      where: { listId },
      orderBy: { order: 'asc' },
      include: { labels: LABEL_SELECT, assignees: ASSIGNEE_SELECT },
    });
  }

  async findOne(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      include: { labels: LABEL_SELECT, assignees: ASSIGNEE_SELECT },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');
    return card;
  }

  async update(boardId: string, cardId: string, dto: UpdateCardDto) {
    await this.getCardInBoard(boardId, cardId);
    return this.prisma.card.update({
      where: { id: cardId },
      data: dto,
    });
  }

  async remove(boardId: string, cardId: string) {
    await this.getCardInBoard(boardId, cardId);
    await this.prisma.card.delete({ where: { id: cardId } });
    return { id: cardId };
  }

  async move(boardId: string, cardId: string, dto: MoveCardDto) {
    const card = await this.getCardInBoard(boardId, cardId);
    const targetListId = dto.listId ?? card.listId;

    if (dto.listId && dto.listId !== card.listId)
      await this.ensureListInBoard(boardId, dto.listId);

    const order = await this.computeOrder(targetListId, dto, cardId);

    return this.prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, order },
    });
  }

  private async computeOrder(
    listId: string,
    dto: MoveCardDto,
    movingId: string,
  ): Promise<number> {
    const before = dto.beforeId
      ? await this.getNeighborCardOrder(listId, dto.beforeId, movingId)
      : null;
    const after = dto.afterId
      ? await this.getNeighborCardOrder(listId, dto.afterId, movingId)
      : null;

    if (before !== null && after !== null) {
      if (before >= after)
        throw new BadRequestException(
          'Vị trí beforeId/afterId không hợp lệ (before phải nhỏ hơn after)',
        );
      return (before + after) / 2;
    }
    if (after !== null) return after - ORDER_STEP; // lên đầu
    if (before !== null) return before + ORDER_STEP; // xuống sau 1 card

    const last = await this.prisma.card.findFirst({
      where: { listId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + ORDER_STEP;
  }

  private async getNeighborCardOrder(
    listId: string,
    neighborId: string,
    movingId: string,
  ): Promise<number> {
    if (neighborId === movingId)
      throw new BadRequestException(
        'beforeId/afterId không được trùng card đang di chuyển',
      );
    const neighbor = await this.prisma.card.findUnique({
      where: { id: neighborId },
      select: { listId: true, order: true },
    });
    if (!neighbor || neighbor.listId !== listId)
      throw new NotFoundException(
        'Không tìm thấy card lân cận trong list đích',
      );
    return neighbor.order;
  }

  async assignMember(boardId: string, cardId: string, userId: string) {
    const card = await this.getCardInBoard(boardId, cardId);
    await this.ensureBoardMember(boardId, userId);

    await this.prisma.card.update({
      where: { id: cardId },
      data: { assignees: { connect: { id: userId } } },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user) {
      await this.mailQueue.add(
        MAIL_JOB.CARD_ASSIGNED,
        { to: user.email, cardTitle: card.title },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        },
      );
    }

    return { cardId, userId };
  }

  async unassignMember(boardId: string, cardId: string, userId: string) {
    await this.getCardInBoard(boardId, cardId);
    await this.prisma.card.update({
      where: { id: cardId },
      data: { assignees: { disconnect: { id: userId } } },
    });
    return { cardId, userId };
  }

  private async ensureBoardMember(boardId: string, userId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { userId: true },
    });
    if (!member)
      throw new BadRequestException(
        'Người dùng không phải thành viên của board',
      );
  }

  private async getCardInBoard(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');
    return card;
  }

  private async ensureListInBoard(boardId: string, listId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true },
    });
    if (!list || list.boardId !== boardId)
      throw new NotFoundException('Không tìm thấy list trong board này');
  }
}
