import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from 'generated/prisma/client';
import {
  Role,
  TemplateCategory,
  TemplateVisibility,
} from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { resolveStorageValue, StorageKeys } from '../storage/storage-keys.util';
import {
  ASSIGNEE_SELECT,
  CHECKLIST_ITEMS_SELECT,
  COUNT_SELECT,
  LABEL_SELECT,
  resolveAssigneeAvatars,
  resolveCardCover,
  withChecklistProgress,
} from '../cards/card.selects';
import { CardsService } from '../cards/cards.service';
import { PUBLIC_USER_SELECT, withResolvedAvatar } from '../users/user.selects';
import { APP_EVENT } from '../events/events.constants';
import type { BoardMemberRemovedEvent } from '../events/events.types';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateBoardFromTemplateDto } from './dto/create-board-from-template.dto';
import { CreateTemplateFromBoardDto } from './dto/create-template-from-board.dto';
import { FindMyTemplatesDto } from './dto/find-my-templates.dto';
import { FindTemplatesDto } from './dto/find-templates.dto';
import { PresignBoardBackgroundDto } from './dto/presign-board-background.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTemplateVisibilityDto } from './dto/update-template-visibility.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

const ORDER_STEP = 1000;

const BOARD_CONTENT_SELECT = {
  name: true,
  background: true,
  ownerId: true,
  isTemplate: true,
  templateVisibility: true,
  labels: { select: { id: true, name: true, color: true } },
  lists: {
    orderBy: { order: 'asc' },
    select: {
      title: true,
      cards: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          description: true,
          priority: true,
          cover: true,
          labels: { select: { id: true } },
          checklists: {
            orderBy: { order: 'asc' },
            select: {
              title: true,
              order: true,
              items: {
                orderBy: { order: 'asc' },
                select: { content: true, order: true },
              },
            },
          },
          attachments: {
            select: {
              filename: true,
              key: true,
              mimeType: true,
              size: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BoardSelect;

type BoardContent = Prisma.BoardGetPayload<{
  select: typeof BOARD_CONTENT_SELECT;
}>;

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cardsService: CardsService,
  ) {}

  async create(userId: string, dto: CreateBoardDto) {
    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: { name: dto.name, background: dto.background, ownerId: userId },
      });

      await tx.boardMember.create({
        data: { boardId: board.id, userId, role: Role.OWNER },
      });

      return board;
    });
  }

  async findAllForUser(userId: string, search?: string) {
    const boards = await this.prisma.board.findMany({
      where: {
        members: { some: { userId } },
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        stars: { where: { userId }, select: { userId: true } },
      },
    });

    return Promise.all(
      boards.map(async ({ stars, ...board }) => ({
        ...board,
        background: await this.resolveBackground(board.background),
        isStarred: stars.length > 0,
      })),
    );
  }

  async findTemplates(dto: FindTemplatesDto) {
    const pageSize = dto.pageSize ?? 3;

    if (!dto.category && !dto.name) {
      const nameFilter = dto.name
        ? { name: { contains: dto.name, mode: 'insensitive' as const } }
        : {};

      const grouped = await Promise.all(
        Object.values(TemplateCategory).map((category) =>
          this.prisma.board.findMany({
            where: {
              isTemplate: true,
              templateVisibility: TemplateVisibility.PUBLIC,
              templateCategory: category,
              ...nameFilter,
            },
            orderBy: { createdAt: 'desc' },
            take: pageSize,
            include: { owner: { select: PUBLIC_USER_SELECT } },
          }),
        ),
      );
      const items = grouped.flat();

      return {
        items: await Promise.all(
          items.map(async ({ owner, ...board }) => ({
            ...board,
            background: await this.resolveBackground(board.background),
            owner: await withResolvedAvatar(owner, this.storage),
          })),
        ),
        total: items.length,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }

    const page = dto.page ?? 1;
    const where = {
      isTemplate: true,
      templateVisibility: TemplateVisibility.PUBLIC,
      templateCategory: dto.category,
      ...(dto.name && {
        name: { contains: dto.name, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.board.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { owner: { select: PUBLIC_USER_SELECT } },
      }),
      this.prisma.board.count({ where }),
    ]);

    return {
      items: await Promise.all(
        items.map(async ({ owner, ...board }) => ({
          ...board,
          background: await this.resolveBackground(board.background),
          owner: await withResolvedAvatar(owner, this.storage),
        })),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findMyTemplates(userId: string, dto: FindMyTemplatesDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const where = { isTemplate: true, ownerId: userId };

    const [items, total] = await Promise.all([
      this.prisma.board.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { owner: { select: PUBLIC_USER_SELECT } },
      }),
      this.prisma.board.count({ where }),
    ]);

    return {
      items: await Promise.all(
        items.map(async ({ owner, ...board }) => ({
          ...board,
          background: await this.resolveBackground(board.background),
          owner: await withResolvedAvatar(owner, this.storage),
        })),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findTemplateById(templateId: string, userId: string) {
    const template = await this.prisma.board.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        background: true,
        ownerId: true,
        isTemplate: true,
        templateCategory: true,
        templateDescription: true,
        templateVisibility: true,
        createdAt: true,
        lists: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            cards: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                priority: true,
                dueDate: true,
                reminderOffsetMinutes: true,
                isDone: true,
                cover: true,
                version: true,
                listId: true,
                createdAt: true,
                updatedAt: true,
                labels: LABEL_SELECT,
                assignees: ASSIGNEE_SELECT,
                _count: COUNT_SELECT,
                checklists: CHECKLIST_ITEMS_SELECT,
              },
            },
          },
        },
      },
    });
    if (
      !template ||
      !template.isTemplate ||
      (template.templateVisibility !== TemplateVisibility.PUBLIC &&
        template.ownerId !== userId)
    )
      throw new NotFoundException('Không tìm thấy template');

    const { lists, ...rest } = template;

    return {
      ...rest,
      background: await this.resolveBackground(rest.background),
      lists: await Promise.all(
        lists.map(async ({ cards, ...list }) => ({
          ...list,
          cards: await Promise.all(
            cards.map(async (card) => ({
              ...withChecklistProgress(card),
              cover: await resolveCardCover(card.cover, this.storage),
              assignees: await resolveAssigneeAvatars(
                card.assignees,
                this.storage,
              ),
            })),
          ),
        })),
      ),
    };
  }

  async findTemplateCardById(
    templateId: string,
    cardId: string,
    userId: string,
  ) {
    const template = await this.prisma.board.findFirst({
      where: { id: templateId, isTemplate: true },
      select: { ownerId: true, templateVisibility: true },
    });
    if (
      !template ||
      (template.templateVisibility !== TemplateVisibility.PUBLIC &&
        template.ownerId !== userId)
    )
      throw new NotFoundException('Không tìm thấy template');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { comments, ...card } = await this.cardsService.findOne(
      templateId,
      cardId,
    );
    return card;
  }

  async createFromTemplate(
    templateId: string,
    userId: string,
    dto: CreateBoardFromTemplateDto,
  ) {
    const template = await this.prisma.board.findUnique({
      where: { id: templateId },
      select: BOARD_CONTENT_SELECT,
    });
    if (
      !template ||
      !template.isTemplate ||
      (template.templateVisibility !== TemplateVisibility.PUBLIC &&
        template.ownerId !== userId)
    )
      throw new NotFoundException('Không tìm thấy template');

    return this.prisma.$transaction(
      async (tx) => {
        const board = await tx.board.create({
          data: {
            name: dto.name ?? template.name,
            background: dto.background ?? template.background,
            ownerId: userId,
          },
        });

        await tx.boardMember.create({
          data: { boardId: board.id, userId, role: Role.OWNER },
        });

        await this.cloneBoardContent(tx, template, board.id, userId);

        return board;
      },
      { timeout: 30_000 },
    );
  }

  async makeTemplate(
    boardId: string,
    userId: string,
    dto: CreateTemplateFromBoardDto,
  ) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: BOARD_CONTENT_SELECT,
    });
    if (!board) throw new NotFoundException('Không tìm thấy board');

    return this.prisma.$transaction(
      async (tx) => {
        const template = await tx.board.create({
          data: {
            name: dto.name ?? board.name,
            background: board.background,
            ownerId: userId,
            isTemplate: true,
            templateCategory: dto.templateCategory,
            templateDescription: dto.templateDescription,
            templateVisibility: TemplateVisibility.PRIVATE,
          },
        });

        await this.cloneBoardContent(tx, board, template.id, userId);

        return template;
      },
      { timeout: 30_000 },
    );
  }

  private async cloneBoardContent(
    tx: Prisma.TransactionClient,
    source: BoardContent,
    destBoardId: string,
    uploadedById: string,
  ) {
    const labelIdMap = new Map<string, string>();
    for (const label of source.labels) {
      const newLabel = await tx.label.create({
        data: { name: label.name, color: label.color, boardId: destBoardId },
      });
      labelIdMap.set(label.id, newLabel.id);
    }

    for (const [listIndex, list] of source.lists.entries()) {
      const newList = await tx.list.create({
        data: {
          title: list.title,
          order: (listIndex + 1) * ORDER_STEP,
          boardId: destBoardId,
        },
      });

      for (const [cardIndex, card] of list.cards.entries()) {
        await tx.card.create({
          data: {
            title: card.title,
            description: card.description,
            priority: card.priority,
            cover: card.cover,
            order: (cardIndex + 1) * ORDER_STEP,
            listId: newList.id,
            labels: {
              connect: card.labels
                .map((l) => labelIdMap.get(l.id))
                .filter((id): id is string => Boolean(id))
                .map((id) => ({ id })),
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
                uploadedById,
              })),
            },
          },
        });
      }
    }
  }

  async updateTemplateVisibility(
    boardId: string,
    dto: UpdateTemplateVisibilityDto,
  ) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { isTemplate: true },
    });
    if (!board || !board.isTemplate)
      throw new NotFoundException('Không tìm thấy template');

    return this.prisma.board.update({
      where: { id: boardId },
      data: { templateVisibility: dto.templateVisibility },
    });
  }

  async findOne(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          select: {
            user: { select: PUBLIC_USER_SELECT },
          },
        },
        stars: { where: { userId }, select: { userId: true } },
        lists: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
              orderBy: { order: 'asc' },
              include: {
                labels: LABEL_SELECT,
                assignees: ASSIGNEE_SELECT,
                _count: COUNT_SELECT,
                checklists: CHECKLIST_ITEMS_SELECT,
              },
            },
          },
        },
      },
    });

    if (!board) throw new NotFoundException('Không tìm thấy board');

    await this.prisma.boardView.upsert({
      where: { userId_boardId: { userId, boardId } },
      update: { viewedAt: new Date() },
      create: { userId, boardId },
    });

    const { stars, members, lists, ...rest } = board;
    return {
      ...rest,
      background: await this.resolveBackground(rest.background),
      isStarred: stars.length > 0,
      members: await Promise.all(
        members.map((m) => withResolvedAvatar(m.user, this.storage)),
      ),
      lists: await Promise.all(
        lists.map(async ({ cards, ...list }) => ({
          ...list,
          cards: await Promise.all(
            cards.map(async (card) => ({
              ...withChecklistProgress(card),
              cover: await resolveCardCover(card.cover, this.storage),
              assignees: await resolveAssigneeAvatars(
                card.assignees,
                this.storage,
              ),
            })),
          ),
        })),
      ),
    };
  }

  async presignBackground(boardId: string, dto: PresignBoardBackgroundDto) {
    await this.ensureExists(boardId);

    const key = StorageKeys.boardBackground(dto.filename);
    const uploadUrl = await this.storage.getUploadUrl(key, dto.contentType);

    return { key, uploadUrl };
  }

  private resolveBackground(background: string): Promise<string> {
    return resolveStorageValue(background, this.storage) as Promise<string>;
  }

  async starBoard(boardId: string, userId: string) {
    await this.ensureExists(boardId);
    await this.prisma.boardStar.upsert({
      where: { userId_boardId: { userId, boardId } },
      update: {},
      create: { userId, boardId },
    });
    return { boardId, isStarred: true };
  }

  async unstarBoard(boardId: string, userId: string) {
    await this.ensureExists(boardId);
    await this.prisma.boardStar.deleteMany({ where: { userId, boardId } });
    return { boardId, isStarred: false };
  }

  async findRecentlyViewed(userId: string, limit = 5) {
    const views = await this.prisma.boardView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      select: {
        viewedAt: true,
        board: {
          select: {
            id: true,
            name: true,
            background: true,
            createdAt: true,
            stars: { where: { userId }, select: { userId: true } },
          },
        },
      },
    });

    return Promise.all(
      views.map(async ({ viewedAt, board: { stars, ...board } }) => ({
        viewedAt,
        board: {
          ...board,
          background: await this.resolveBackground(board.background),
          isStarred: stars.length > 0,
        },
      })),
    );
  }

  async findMembers(boardId: string) {
    await this.ensureExists(boardId);
    const members = await this.prisma.boardMember.findMany({
      where: { boardId },
      select: {
        role: true,
        user: { select: PUBLIC_USER_SELECT },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    return Promise.all(
      members.map(async (m) => ({
        ...m,
        user: await withResolvedAvatar(m.user, this.storage),
      })),
    );
  }

  async addMember(boardId: string, dto: AddMemberDto) {
    await this.ensureExists(boardId);

    const role = dto.role ?? Role.MEMBER;
    if (role === Role.OWNER)
      throw new BadRequestException(
        'Không thể gán quyền OWNER khi thêm thành viên',
      );

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true },
    });
    if (!user)
      throw new NotFoundException('Không tìm thấy người dùng với email này');

    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
      select: { userId: true },
    });
    if (member)
      throw new ConflictException('Người dùng đã là thành viên của board');

    const created = await this.prisma.boardMember.create({
      data: { boardId, userId: user.id, role },
      select: {
        role: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });
    return {
      ...created,
      user: await withResolvedAvatar(created.user, this.storage),
    };
  }

  async updateMemberRole(
    boardId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    callerId: string,
  ) {
    await this.ensureExists(boardId);

    if (dto.role === Role.OWNER)
      throw new BadRequestException(
        'Không thể gán quyền OWNER. Hãy dùng chức năng chuyển quyền sở hữu.',
      );

    const target = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      select: { role: true },
    });
    if (!target)
      throw new NotFoundException('Người dùng không phải thành viên của board');
    if (target.role === Role.OWNER)
      throw new BadRequestException('Không thể đổi quyền của OWNER');

    const caller = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: callerId } },
      select: { role: true },
    });
    const callerIsOwner = caller?.role === Role.OWNER;
    if (
      !callerIsOwner &&
      (target.role === Role.ADMIN || dto.role === Role.ADMIN)
    )
      throw new ForbiddenException(
        'Chỉ OWNER mới được thay đổi quyền liên quan đến ADMIN',
      );

    const updated = await this.prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      data: { role: dto.role },
      select: {
        role: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });
    return {
      ...updated,
      user: await withResolvedAvatar(updated.user, this.storage),
    };
  }

  async removeMember(boardId: string, targetUserId: string, callerId: string) {
    await this.ensureExists(boardId);

    const target = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      select: { role: true },
    });
    if (!target)
      throw new NotFoundException('Người dùng không phải thành viên của board');

    if (target.role === Role.OWNER)
      throw new BadRequestException('Không thể xóa OWNER khỏi board');

    const caller = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: callerId } },
      select: { role: true },
    });
    if (caller?.role !== Role.OWNER && target.role === Role.ADMIN)
      throw new ForbiddenException('Chỉ OWNER mới được xóa ADMIN');

    await this.prisma.$transaction([
      this.prisma.boardMember.delete({
        where: { boardId_userId: { boardId, userId: targetUserId } },
      }),
      ...(await this.buildUnassignFromBoardCardsOps(boardId, targetUserId)),
    ]);

    this.eventEmitter.emit(APP_EVENT.BOARD_MEMBER_REMOVED, {
      boardId,
      userId: targetUserId,
    } satisfies BoardMemberRemovedEvent);

    return { boardId, userId: targetUserId };
  }

  async leaveBoard(boardId: string, userId: string) {
    const membership = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { role: true },
    });
    if (!membership)
      throw new NotFoundException('Bạn không phải thành viên của board này');

    if (membership.role === Role.OWNER)
      throw new ForbiddenException(
        'OWNER không thể rời board. Hãy chuyển quyền sở hữu hoặc xóa board.',
      );

    await this.prisma.$transaction([
      this.prisma.boardMember.delete({
        where: { boardId_userId: { boardId, userId } },
      }),
      ...(await this.buildUnassignFromBoardCardsOps(boardId, userId)),
    ]);

    this.eventEmitter.emit(APP_EVENT.BOARD_MEMBER_REMOVED, {
      boardId,
      userId,
    } satisfies BoardMemberRemovedEvent);

    return { boardId, userId };
  }

  private async buildUnassignFromBoardCardsOps(
    boardId: string,
    userId: string,
  ) {
    const cards = await this.prisma.card.findMany({
      where: { list: { boardId }, assignees: { some: { id: userId } } },
      select: { id: true },
    });
    return cards.map((card) =>
      this.prisma.card.update({
        where: { id: card.id },
        data: { assignees: { disconnect: { id: userId } } },
      }),
    );
  }

  async transferOwnership(
    boardId: string,
    dto: TransferOwnershipDto,
    callerId: string,
  ) {
    if (dto.newOwnerId === callerId)
      throw new BadRequestException('Bạn đã là OWNER của board này');

    const newOwner = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: dto.newOwnerId } },
      select: { userId: true },
    });
    if (!newOwner)
      throw new NotFoundException(
        'Người nhận quyền không phải thành viên của board',
      );

    return this.prisma.$transaction(async (tx) => {
      await tx.boardMember.update({
        where: { boardId_userId: { boardId, userId: callerId } },
        data: { role: Role.ADMIN },
      });
      await tx.boardMember.update({
        where: { boardId_userId: { boardId, userId: dto.newOwnerId } },
        data: { role: Role.OWNER },
      });
      await tx.board.update({
        where: { id: boardId },
        data: { ownerId: dto.newOwnerId },
      });
      return { boardId, ownerId: dto.newOwnerId };
    });
  }

  async update(boardId: string, dto: UpdateBoardDto) {
    await this.ensureExists(boardId);
    return this.prisma.board.update({
      where: { id: boardId },
      data: dto,
    });
  }

  async remove(boardId: string) {
    await this.ensureExists(boardId);
    await this.prisma.board.delete({ where: { id: boardId } });
    return { id: boardId };
  }

  private async ensureExists(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });
    if (!board) throw new NotFoundException('Không tìm thấy board');
  }
}
