import { PrismaClient } from '../generated/prisma/client';
import { CardPriority, Role } from '../generated/prisma/enums';
import { StorageKeys } from '../src/storage/storage-keys.util';

type AssigneeRole = 'owner' | 'member1';

interface SeedChecklist {
  title: string;
  items: { content: string; isDone: boolean }[];
}

interface SeedComment {
  content: string;
  authorRole: AssigneeRole;
}

interface SeedAttachment {
  filename: string;
  mimeType: string;
  size: number;
}

interface SeedCard {
  title: string;
  description?: string;
  priority: CardPriority;
  dueDate?: Date;
  reminderOffsetMinutes?: number;
  labelNames?: string[];
  assigneeRoles?: AssigneeRole[];
  checklists?: SeedChecklist[];
  comments?: SeedComment[];
  attachments?: SeedAttachment[];
}

interface SeedList {
  title: string;
  cards: SeedCard[];
}

const SEED_BOARD_NAME = 'Kanvas Product Launch';
const SEED_BOARD_BACKGROUND = '#2563eb';

const SEED_LABELS = [
  { name: 'Design', color: '#a855f7' },
  { name: 'Bug', color: '#ef4444' },
];

const SEED_LISTS: SeedList[] = [
  {
    title: 'Backlog',
    cards: [
      {
        title: 'Research đối thủ cạnh tranh',
        priority: CardPriority.LOW,
      },
    ],
  },
  {
    title: 'To Do',
    cards: [
      {
        title: 'Thiết kế trang landing page',
        priority: CardPriority.MEDIUM,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        reminderOffsetMinutes: 60,
        labelNames: ['Design'],
        assigneeRoles: ['member1'],
        checklists: [
          {
            title: 'Checklist thiết kế',
            items: [
              { content: 'Wireframe', isDone: true },
              { content: 'Review với team', isDone: false },
              { content: 'Approve final', isDone: false },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'In Progress',
    cards: [
      {
        title: 'Fix bug đăng nhập trên Safari',
        priority: CardPriority.HIGH,
        dueDate: new Date(Date.now() + 15 * 60 * 1000),
        reminderOffsetMinutes: 10,
        labelNames: ['Bug'],
        assigneeRoles: ['owner'],
        comments: [
          {
            content:
              'Đã repro được, lỗi do Safari không hỗ trợ đúng cookie SameSite=None 🔥',
            authorRole: 'owner',
          },
        ],
        attachments: [
          {
            filename: 'safari-bug-screenshot.png',
            mimeType: 'image/png',
            size: 102400,
          },
        ],
      },
    ],
  },
  {
    title: 'Review',
    cards: [
      {
        title: 'Viết tài liệu API cho FE',
        description:
          'Tổng hợp lại toàn bộ endpoint hiện có kèm ví dụ request/response.\n\n![sơ đồ](cards/seed-api-doc-diagram.png)',
        priority: CardPriority.LOW,
        assigneeRoles: ['member1'],
      },
    ],
  },
  { title: 'Done', cards: [] },
];

export async function seedDemoBoard(
  prisma: PrismaClient,
  users: { owner: { id: string }; member1: { id: string } },
) {
  const userIdByRole: Record<AssigneeRole, string> = {
    owner: users.owner.id,
    member1: users.member1.id,
  };

  const existing = await prisma.board.findFirst({
    where: { name: SEED_BOARD_NAME, ownerId: users.owner.id },
    select: { id: true },
  });
  if (existing) {
    await prisma.board.delete({ where: { id: existing.id } });
  }

  const board = await prisma.board.create({
    data: {
      name: SEED_BOARD_NAME,
      background: SEED_BOARD_BACKGROUND,
      ownerId: users.owner.id,
      members: {
        create: [
          { userId: users.owner.id, role: Role.OWNER },
          { userId: users.member1.id, role: Role.MEMBER },
        ],
      },
      stars: { create: [{ userId: users.owner.id }] },
      views: { create: [{ userId: users.owner.id }] },
      labels: { create: SEED_LABELS },
    },
    include: { labels: true },
  });

  const labelIdByName = Object.fromEntries(
    board.labels.map((l) => [l.name, l.id]),
  );

  for (const [listIndex, list] of SEED_LISTS.entries()) {
    const newList = await prisma.list.create({
      data: {
        title: list.title,
        order: (listIndex + 1) * 1000,
        boardId: board.id,
      },
    });

    for (const [cardIndex, card] of list.cards.entries()) {
      await prisma.card.create({
        data: {
          title: card.title,
          description: card.description,
          priority: card.priority,
          dueDate: card.dueDate,
          reminderOffsetMinutes: card.reminderOffsetMinutes,
          order: (cardIndex + 1) * 1000,
          listId: newList.id,
          labels: {
            connect: (card.labelNames ?? []).map((name) => ({
              id: labelIdByName[name],
            })),
          },
          assignees: {
            connect: (card.assigneeRoles ?? []).map((role) => ({
              id: userIdByRole[role],
            })),
          },
          checklists: {
            create: (card.checklists ?? []).map((checklist, clIndex) => ({
              title: checklist.title,
              order: (clIndex + 1) * 1000,
              items: {
                create: checklist.items.map((item, itemIndex) => ({
                  content: item.content,
                  isDone: item.isDone,
                  order: (itemIndex + 1) * 1000,
                })),
              },
            })),
          },
          comments: {
            create: (card.comments ?? []).map((comment) => ({
              content: comment.content,
              authorId: userIdByRole[comment.authorRole],
            })),
          },
          attachments: {
            create: (card.attachments ?? []).map((att) => ({
              filename: att.filename,
              key: StorageKeys.attachment(att.filename),
              mimeType: att.mimeType,
              size: att.size,
              uploadedById: users.owner.id,
            })),
          },
        },
      });
    }
  }

  return board;
}
