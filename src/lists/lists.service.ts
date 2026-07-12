import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import type {
  ListCreatedEvent,
  ListDeletedEvent,
  ListMovedEvent,
  ListUpdatedEvent,
} from '../events/events.types';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { MoveListDto } from './dto/move-list.dto';
import { CopyListDto } from './dto/copy-list.dto';

const ORDER_STEP = 1000;

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(boardId: string, dto: CreateListDto, actorId: string) {
    const last = await this.prisma.list.findFirst({
      where: { boardId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? 0) + ORDER_STEP;

    const list = await this.prisma.list.create({
      data: { title: dto.title, order, boardId },
    });

    this.eventEmitter.emit(APP_EVENT.LIST_CREATED, {
      boardId,
      list,
      actorId,
    } satisfies ListCreatedEvent);

    return list;
  }

  findAll(boardId: string) {
    return this.prisma.list.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
    });
  }

  async update(
    boardId: string,
    listId: string,
    dto: UpdateListDto,
    actorId: string,
  ) {
    await this.ensureListInBoard(boardId, listId);
    const list = await this.prisma.list.update({
      where: { id: listId },
      data: dto,
    });

    this.eventEmitter.emit(APP_EVENT.LIST_UPDATED, {
      boardId,
      list,
      actorId,
    } satisfies ListUpdatedEvent);

    return list;
  }

  async move(
    boardId: string,
    listId: string,
    dto: MoveListDto,
    actorId: string,
  ) {
    await this.ensureListInBoard(boardId, listId);

    const { beforeId, afterId } = dto;
    if (!beforeId && !afterId)
      throw new BadRequestException('Cần cung cấp beforeId hoặc afterId');

    const before = beforeId
      ? await this.getNeighborOrder(boardId, beforeId, listId)
      : null;
    const after = afterId
      ? await this.getNeighborOrder(boardId, afterId, listId)
      : null;

    let order: number;
    if (before !== null && after !== null) {
      if (before >= after)
        throw new BadRequestException(
          'Vị trí beforeId/afterId không hợp lệ (before phải nhỏ hơn after)',
        );
      order = (before + after) / 2; // chèn vào giữa → trung bình cộng
    } else if (after !== null) {
      order = after - ORDER_STEP; // chèn lên đầu
    } else {
      order = (before as number) + ORDER_STEP; // chèn xuống cuối
    }

    const list = await this.prisma.list.update({
      where: { id: listId },
      data: { order },
    });

    this.eventEmitter.emit(APP_EVENT.LIST_MOVED, {
      boardId,
      listId: list.id,
      order: list.order,
      actorId,
    } satisfies ListMovedEvent);

    return list;
  }

  async copyList(
    boardId: string,
    listId: string,
    dto: CopyListDto,
    actorId: string,
  ) {
    const source = await this.prisma.list.findUnique({
      where: { id: listId },
      select: {
        boardId: true,
        title: true,
        order: true,
        cards: {
          orderBy: { order: 'asc' },
          include: {
            labels: { select: { id: true } },
            checklists: {
              orderBy: { order: 'asc' },
              include: { items: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });
    if (!source || source.boardId !== boardId)
      throw new NotFoundException('Không tìm thấy list trong board này');

    const next = await this.prisma.list.findFirst({
      where: { boardId, order: { gt: source.order } },
      orderBy: { order: 'asc' },
      select: { order: true },
    });
    const order = next
      ? (source.order + next.order) / 2
      : source.order + ORDER_STEP;

    const list = await this.prisma.$transaction(
      async (tx) => {
        const newList = await tx.list.create({
          data: {
            title: dto.title ?? `${source.title} (Copy)`,
            order,
            boardId,
          },
        });

        for (const [index, card] of source.cards.entries()) {
          await tx.card.create({
            data: {
              title: card.title,
              description: card.description,
              priority: card.priority,
              cover: card.cover,
              order: (index + 1) * ORDER_STEP,
              listId: newList.id,
              labels: { connect: card.labels.map((l) => ({ id: l.id })) },
              checklists: {
                create: card.checklists.map((cl) => ({
                  title: cl.title,
                  order: cl.order,
                  items: {
                    create: cl.items.map((item) => ({
                      content: item.content,
                      order: item.order,
                      isDone: false,
                    })),
                  },
                })),
              },
            },
          });
        }

        return newList;
      },
      { timeout: 30_000 },
    );

    this.eventEmitter.emit(APP_EVENT.LIST_CREATED, {
      boardId,
      list,
      actorId,
    } satisfies ListCreatedEvent);

    return list;
  }

  async remove(boardId: string, listId: string, actorId: string) {
    await this.ensureListInBoard(boardId, listId);
    await this.prisma.list.delete({ where: { id: listId } });

    this.eventEmitter.emit(APP_EVENT.LIST_DELETED, {
      boardId,
      listId,
      actorId,
    } satisfies ListDeletedEvent);

    return { id: listId };
  }

  private async getNeighborOrder(
    boardId: string,
    neighborId: string,
    movingId: string,
  ): Promise<number> {
    if (neighborId === movingId)
      throw new BadRequestException(
        'beforeId/afterId không được trùng list đang di chuyển',
      );
    const neighbor = await this.prisma.list.findUnique({
      where: { id: neighborId },
      select: { boardId: true, order: true },
    });
    if (!neighbor || neighbor.boardId !== boardId)
      throw new NotFoundException(
        'Không tìm thấy list lân cận trong board này',
      );
    return neighbor.order;
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
