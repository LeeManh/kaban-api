import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { resolveMarkdownImages } from '../storage/markdown-images.util';
import { MAIL_JOB, MAIL_QUEUE } from '../mail/mail.constants';
import { APP_EVENT } from '../events/events.constants';
import type {
  CardAssigneeChangedEvent,
  CardCreatedEvent,
  CardDeletedEvent,
  CardUpdatedEvent,
} from '../events/events.types';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { PresignDescriptionImageDto } from './dto/presign-description-image.dto';
import {
  ASSIGNEE_SELECT,
  CARD_STORAGE_KEY_PREFIX,
  CHECKLIST_ITEMS_SELECT,
  COUNT_SELECT,
  LABEL_SELECT,
  resolveAssigneeAvatars,
  resolveCardCover,
  resolveDescriptionImages,
  withChecklistProgress,
} from './card.selects';
import { withResolvedAvatar } from '../users/user.selects';

const ORDER_STEP = 1000;

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    boardId: string,
    listId: string,
    dto: CreateCardDto,
    actorId: string,
  ) {
    await this.ensureListInBoard(boardId, listId);

    const last = await this.prisma.card.findFirst({
      where: { listId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? 0) + ORDER_STEP;

    const card = await this.prisma.card.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate,
        reminderOffsetMinutes: dto.reminderOffsetMinutes,
        cover: dto.cover,
        order,
        listId,
      },
    });

    try {
      await this.scheduleDueReminder(
        card.id,
        card.dueDate,
        card.reminderOffsetMinutes,
      );
    } catch (err) {
      this.logger.error('Không thể lên lịch nhắc hạn cho card', err);
    }

    this.eventEmitter.emit(APP_EVENT.CARD_CREATED, {
      boardId,
      card,
      actorId,
    } satisfies CardCreatedEvent);

    return card;
  }

  async findAll(boardId: string, listId: string) {
    await this.ensureListInBoard(boardId, listId);
    const cards = await this.prisma.card.findMany({
      where: { listId },
      orderBy: { order: 'asc' },
      include: {
        labels: LABEL_SELECT,
        assignees: ASSIGNEE_SELECT,
        _count: COUNT_SELECT,
        checklists: CHECKLIST_ITEMS_SELECT,
      },
    });
    return Promise.all(
      cards.map(async (card) => ({
        ...withChecklistProgress(card),
        cover: await resolveCardCover(card.cover, this.storage),
        assignees: await resolveAssigneeAvatars(card.assignees, this.storage),
      })),
    );
  }

  async findOne(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      include: {
        labels: LABEL_SELECT,
        assignees: ASSIGNEE_SELECT,
        checklists: {
          orderBy: { order: 'asc' },
          include: { items: { orderBy: { order: 'asc' } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: ASSIGNEE_SELECT },
        },
      },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');

    const items = card.checklists.flatMap((checklist) => checklist.items);
    const checklistProgress = {
      done: items.filter((item) => item.isDone).length,
      total: items.length,
    };

    const attachments = await Promise.all(
      card.attachments.map(async (attachment) => ({
        ...attachment,
        downloadUrl: await this.storage.getDownloadUrl(attachment.key),
      })),
    );

    const comments = await Promise.all(
      card.comments.map(async (comment) => ({
        ...comment,
        content: await resolveMarkdownImages(
          comment.content,
          this.storage,
          CARD_STORAGE_KEY_PREFIX,
        ),
        author: await withResolvedAvatar(comment.author, this.storage),
      })),
    );

    return {
      ...card,
      attachments,
      comments,
      checklistProgress,
      cover: await resolveCardCover(card.cover, this.storage),
      description: await resolveDescriptionImages(
        card.description,
        this.storage,
      ),
      assignees: await resolveAssigneeAvatars(card.assignees, this.storage),
    };
  }

  async update(
    boardId: string,
    cardId: string,
    dto: UpdateCardDto,
    actorId: string,
  ) {
    await this.getCardInBoard(boardId, cardId);
    const { version, ...data } = dto;
    const card = await this.updateWithVersion(cardId, version, data);

    try {
      await this.scheduleDueReminder(
        card.id,
        card.dueDate,
        card.reminderOffsetMinutes,
      );
    } catch (err) {
      this.logger.error('Không thể lên lịch nhắc hạn cho card', err);
    }

    this.eventEmitter.emit(APP_EVENT.CARD_UPDATED, {
      boardId,
      card,
      actorId,
    } satisfies CardUpdatedEvent);

    return card;
  }

  private async updateWithVersion(
    cardId: string,
    version: number,
    data: Omit<UpdateCardDto, 'version'>,
  ) {
    try {
      return await this.prisma.card.update({
        where: { id: cardId, version },
        data: { ...data, version: { increment: 1 } },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      )
        throw new ConflictException(
          'Card đã bị người khác cập nhật, vui lòng tải lại',
        );
      throw err;
    }
  }

  async remove(boardId: string, cardId: string, actorId: string) {
    const card = await this.getCardInBoard(boardId, cardId);
    await this.prisma.card.delete({ where: { id: cardId } });
    try {
      await this.scheduleDueReminder(cardId, null, null);
    } catch (err) {
      this.logger.error('Không thể huỷ lịch nhắc hạn cho card', err);
    }

    this.eventEmitter.emit(APP_EVENT.CARD_DELETED, {
      boardId,
      cardId,
      listId: card.listId,
      actorId,
    } satisfies CardDeletedEvent);

    return { id: cardId };
  }

  private async scheduleDueReminder(
    cardId: string,
    dueDate: Date | null,
    reminderOffsetMinutes: number | null,
  ) {
    const jobId = `due-reminder:${cardId}`;

    const existing = await this.mailQueue.getJob(jobId);
    if (existing) await existing.remove();

    if (!dueDate || reminderOffsetMinutes == null) return;

    const remindAt =
      new Date(dueDate).getTime() - reminderOffsetMinutes * 60_000;
    const delay = remindAt - Date.now();
    if (delay <= 0) return;

    await this.mailQueue.add(
      MAIL_JOB.DUE_REMINDER,
      { cardId },
      {
        jobId,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }

  async move(
    boardId: string,
    cardId: string,
    dto: MoveCardDto,
    actorId: string,
  ) {
    const card = await this.getCardInBoard(boardId, cardId);
    const targetListId = dto.listId ?? card.listId;

    if (dto.listId && dto.listId !== card.listId)
      await this.ensureListInBoard(boardId, dto.listId);

    const order = await this.computeOrder(targetListId, dto, cardId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, order },
    });

    this.eventEmitter.emit(APP_EVENT.CARD_MOVED, {
      boardId,
      cardId: updated.id,
      listId: updated.listId,
      order: updated.order,
      actorId,
    });

    return updated;
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
    if (after !== null) return after - ORDER_STEP;
    if (before !== null) return before + ORDER_STEP;

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

  async assignMember(
    boardId: string,
    cardId: string,
    userId: string,
    actorId: string,
  ) {
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
        { to: user.email, cardTitle: card.title, boardId, cardId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        },
      );
    }

    this.eventEmitter.emit(APP_EVENT.CARD_ASSIGNEE_CHANGED, {
      boardId,
      cardId,
      userId,
      action: 'assigned',
      actorId,
    } satisfies CardAssigneeChangedEvent);

    return { cardId, userId };
  }

  async unassignMember(
    boardId: string,
    cardId: string,
    userId: string,
    actorId: string,
  ) {
    await this.getCardInBoard(boardId, cardId);
    await this.prisma.card.update({
      where: { id: cardId },
      data: { assignees: { disconnect: { id: userId } } },
    });

    this.eventEmitter.emit(APP_EVENT.CARD_ASSIGNEE_CHANGED, {
      boardId,
      cardId,
      userId,
      action: 'unassigned',
      actorId,
    } satisfies CardAssigneeChangedEvent);

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

  async presignDescriptionImage(
    boardId: string,
    cardId: string,
    dto: PresignDescriptionImageDto,
  ) {
    await this.getCardInBoard(boardId, cardId);

    const safeName = dto.filename.replace(/[^\w.-]+/g, '_');
    const key = `cards/${cardId}/description/${randomUUID()}-${safeName}`;
    const uploadUrl = await this.storage.getUploadUrl(key, dto.contentType);
    const viewUrl = await this.storage.getDownloadUrl(key, 7 * 24 * 3600);

    return { key, uploadUrl, viewUrl };
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
