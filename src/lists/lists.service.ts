import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import type {
  CardAssigneeChangedEvent,
  CardMovedEvent,
  ListCreatedEvent,
  ListDeletedEvent,
  ListMovedEvent,
  ListUpdatedEvent,
} from '../events/events.types';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { MoveListDto } from './dto/move-list.dto';
import { CopyListDto } from './dto/copy-list.dto';
import { MoveAllCardsDto } from './dto/move-all-cards.dto';

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

    const targetBoardId = dto.targetBoardId ?? boardId;
    if (targetBoardId !== boardId) {
      await this.ensureBoardMembership(targetBoardId, actorId);
      return this.moveToOtherBoard(
        boardId,
        targetBoardId,
        listId,
        dto,
        actorId,
      );
    }

    const order =
      dto.position !== undefined
        ? await this.computeOrderByPosition(boardId, listId, dto.position)
        : await this.computeOrderByNeighbors(boardId, listId, dto);

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

  private async moveToOtherBoard(
    sourceBoardId: string,
    targetBoardId: string,
    listId: string,
    dto: MoveListDto,
    actorId: string,
  ) {
    const cards = await this.prisma.card.findMany({
      where: { listId },
      include: { labels: true, assignees: { select: { id: true } } },
    });

    const uniqueLabels = new Map<string, { name: string; color: string }>();
    for (const card of cards) {
      for (const label of card.labels) {
        uniqueLabels.set(label.id, { name: label.name, color: label.color });
      }
    }

    const targetMembers = await this.prisma.boardMember.findMany({
      where: { boardId: targetBoardId },
      select: { userId: true },
    });
    const targetMemberIds = new Set(targetMembers.map((m) => m.userId));

    const order = await this.computeOrderByPosition(
      targetBoardId,
      null,
      dto.position ?? Infinity,
    );

    const removedAssignees: { cardId: string; userId: string }[] = [];

    const list = await this.prisma.$transaction(
      async (tx) => {
        const labelIdMap = new Map<string, string>();
        for (const [oldId, { name, color }] of uniqueLabels) {
          const existing = await tx.label.findFirst({
            where: { boardId: targetBoardId, name, color },
            select: { id: true },
          });
          const target =
            existing ??
            (await tx.label.create({
              data: { boardId: targetBoardId, name, color },
              select: { id: true },
            }));
          labelIdMap.set(oldId, target.id);
        }

        for (const card of cards) {
          const newLabelIds = card.labels.map(
            (l) => labelIdMap.get(l.id) as string,
          );
          const validAssigneeIds = card.assignees
            .filter((a) => targetMemberIds.has(a.id))
            .map((a) => a.id);
          for (const assignee of card.assignees) {
            if (!targetMemberIds.has(assignee.id))
              removedAssignees.push({ cardId: card.id, userId: assignee.id });
          }
          await tx.card.update({
            where: { id: card.id },
            data: {
              labels: { set: newLabelIds.map((id) => ({ id })) },
              assignees: { set: validAssigneeIds.map((id) => ({ id })) },
            },
          });
        }

        return tx.list.update({
          where: { id: listId },
          data: { boardId: targetBoardId, order },
        });
      },
      { timeout: 30_000 },
    );

    this.eventEmitter.emit(APP_EVENT.LIST_DELETED, {
      boardId: sourceBoardId,
      listId,
      actorId,
    } satisfies ListDeletedEvent);

    this.eventEmitter.emit(APP_EVENT.LIST_CREATED, {
      boardId: targetBoardId,
      list,
      actorId,
    } satisfies ListCreatedEvent);

    for (const removed of removedAssignees) {
      this.eventEmitter.emit(APP_EVENT.CARD_ASSIGNEE_CHANGED, {
        boardId: sourceBoardId,
        cardId: removed.cardId,
        userId: removed.userId,
        action: 'unassigned',
        actorId,
      } satisfies CardAssigneeChangedEvent);
    }

    return list;
  }

  private async computeOrderByNeighbors(
    boardId: string,
    listId: string,
    dto: MoveListDto,
  ): Promise<number> {
    const { beforeId, afterId } = dto;
    if (!beforeId && !afterId)
      throw new BadRequestException(
        'Cần cung cấp beforeId, afterId, hoặc position',
      );

    const before = beforeId
      ? await this.getNeighborOrder(boardId, beforeId, listId)
      : null;
    const after = afterId
      ? await this.getNeighborOrder(boardId, afterId, listId)
      : null;

    if (before !== null && after !== null) {
      if (before >= after)
        throw new BadRequestException(
          'Vị trí beforeId/afterId không hợp lệ (before phải nhỏ hơn after)',
        );
      return (before + after) / 2;
    }
    if (after !== null) return after - ORDER_STEP;
    return (before as number) + ORDER_STEP;
  }

  private async computeOrderByPosition(
    boardId: string,
    excludeListId: string | null,
    position: number,
  ): Promise<number> {
    const others = await this.prisma.list.findMany({
      where: {
        boardId,
        ...(excludeListId && { id: { not: excludeListId } }),
      },
      orderBy: { order: 'asc' },
      select: { order: true },
    });

    if (others.length === 0) return ORDER_STEP;

    const index = Math.min(Math.max(position - 1, 0), others.length);
    if (index === 0) return others[0].order - ORDER_STEP;
    if (index === others.length)
      return others[others.length - 1].order + ORDER_STEP;
    return (others[index - 1].order + others[index].order) / 2;
  }

  private async ensureBoardMembership(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });
    if (!board) throw new NotFoundException('Không tìm thấy board đích');

    const membership = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { role: true },
    });
    if (!membership || membership.role === Role.VIEWER)
      throw new ForbiddenException('Bạn không đủ quyền ở board đích');
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
            assignees: { select: { id: true } },
            attachments: {
              select: {
                filename: true,
                key: true,
                mimeType: true,
                size: true,
              },
            },
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
              assignees: {
                connect: card.assignees.map((a) => ({ id: a.id })),
              },
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
              attachments: {
                create: card.attachments.map((att) => ({
                  filename: att.filename,
                  key: att.key,
                  mimeType: att.mimeType,
                  size: att.size,
                  uploadedById: actorId,
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

  async moveAllCards(
    boardId: string,
    listId: string,
    dto: MoveAllCardsDto,
    actorId: string,
  ) {
    await this.ensureListInBoard(boardId, listId);
    await this.ensureListInBoard(boardId, dto.targetListId);

    if (listId === dto.targetListId)
      throw new BadRequestException('List đích phải khác list nguồn');

    const cards = await this.prisma.card.findMany({
      where: { listId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const lastInTarget = await this.prisma.card.findFirst({
      where: { listId: dto.targetListId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let nextOrder = (lastInTarget?.order ?? 0) + ORDER_STEP;
    const movedCards: { cardId: string; order: number }[] = [];

    await this.prisma.$transaction(
      async (tx) => {
        for (const card of cards) {
          await tx.card.update({
            where: { id: card.id },
            data: { listId: dto.targetListId, order: nextOrder },
          });
          movedCards.push({ cardId: card.id, order: nextOrder });
          nextOrder += ORDER_STEP;
        }
      },
      { timeout: 30_000 },
    );

    const [sourceList, targetList] = await Promise.all([
      this.prisma.list.findUniqueOrThrow({ where: { id: listId } }),
      this.prisma.list.findUniqueOrThrow({ where: { id: dto.targetListId } }),
    ]);

    this.eventEmitter.emit(APP_EVENT.LIST_UPDATED, {
      boardId,
      list: sourceList,
      actorId,
    } satisfies ListUpdatedEvent);
    this.eventEmitter.emit(APP_EVENT.LIST_UPDATED, {
      boardId,
      list: targetList,
      actorId,
    } satisfies ListUpdatedEvent);

    for (const moved of movedCards) {
      this.eventEmitter.emit(APP_EVENT.CARD_MOVED, {
        boardId,
        cardId: moved.cardId,
        listId: dto.targetListId,
        order: moved.order,
        actorId,
      } satisfies CardMovedEvent);
    }

    return { movedCount: cards.length };
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
