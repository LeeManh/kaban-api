import { PrismaClient } from '../generated/prisma/client';
import { CardPriority, Role } from '../generated/prisma/enums';

type AssigneeRole = 'owner' | 'member1';

interface SeedChecklist {
  title: string;
  items: { content: string; isDone: boolean }[];
}

interface SeedAttachment {
  filename: string;
  url: string;
  mimeType: string;
}

interface SeedCard {
  title: string;
  description?: string;
  priority: CardPriority;
  isDone?: boolean;
  dueDate?: Date;
  reminderOffsetMinutes?: number;
  labelNames?: string[];
  assigneeRoles?: AssigneeRole[];
  checklists?: SeedChecklist[];
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
  { name: 'Feature', color: '#22c55e' },
  { name: 'Urgent', color: '#f97316' },
  { name: 'Docs', color: '#3b82f6' },
];

const ATTACHMENT_IMAGES = [
  'https://images.unsplash.com/photo-1782332576250-4241b7763180?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1780321100374-f10cd7172e77?q=80&w=2371&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1774711268987-a56e0de1d79d?q=80&w=2728&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1777799589789-fa55d10cf81d?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=2371&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function attachmentAt(
  index: number,
  filename: string,
  mimeType: string,
): SeedAttachment {
  return {
    filename,
    url: ATTACHMENT_IMAGES[index % ATTACHMENT_IMAGES.length],
    mimeType,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

const SEED_LISTS: SeedList[] = [
  {
    title: 'Backlog',
    cards: [
      {
        title: 'Research đối thủ cạnh tranh',
        description:
          'Tổng hợp bảng so sánh tính năng, giá, và điểm mạnh/yếu của 3 đối thủ chính trong mảng kanban tool.',
        priority: CardPriority.LOW,
        labelNames: ['Docs'],
        assigneeRoles: ['owner'],
        checklists: [
          {
            title: 'Đối thủ cần research',
            items: [
              { content: 'Trello', isDone: true },
              { content: 'Asana', isDone: false },
              { content: 'Linear', isDone: false },
            ],
          },
        ],
        attachments: [
          attachmentAt(
            0,
            'competitor-comparison.xlsx',
            'application/vnd.ms-excel',
          ),
        ],
      },
      {
        title: 'Đề xuất tích hợp Slack notification',
        description:
          'Cho phép user nhận thông báo card/comment mới ngay trong Slack channel của team thay vì chỉ qua email.',
        priority: CardPriority.MEDIUM,
        labelNames: ['Feature'],
        assigneeRoles: ['member1'],
        checklists: [
          {
            title: 'Việc cần làm',
            items: [
              {
                content: 'So sánh Slack API vs Webhook đơn giản',
                isDone: true,
              },
              { content: 'Viết proposal ngắn', isDone: false },
            ],
          },
        ],
        attachments: [
          attachmentAt(1, 'slack-integration-proposal.pdf', 'application/pdf'),
        ],
      },
      {
        title: 'Khảo sát nhu cầu dark mode custom theme',
        description:
          'Gửi survey ngắn cho 20 user thân thiết để xem có nên đầu tư custom theme hay không.',
        priority: CardPriority.LOW,
        labelNames: ['Feature'],
        assigneeRoles: ['member1'],
        checklists: [
          {
            title: 'Survey checklist',
            items: [
              { content: 'Soạn câu hỏi', isDone: true },
              { content: 'Gửi cho user', isDone: false },
              { content: 'Tổng hợp kết quả', isDone: false },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'To Do',
    cards: [
      {
        title: 'Thiết kế trang landing page',
        description:
          'Landing page giới thiệu sản phẩm cho chiến dịch ra mắt, tối ưu cho mobile trước.',
        priority: CardPriority.MEDIUM,
        dueDate: new Date(Date.now() + 3 * DAY_MS),
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
        attachments: [
          attachmentAt(2, 'landing-page-wireframe.png', 'image/png'),
        ],
      },
      {
        title: 'Viết test case cho luồng thanh toán',
        description:
          'Cover đầy đủ happy path và edge case cho tích hợp payment gateway mới.',
        priority: CardPriority.HIGH,
        dueDate: new Date(Date.now() + DAY_MS),
        reminderOffsetMinutes: 30,
        labelNames: ['Feature'],
        assigneeRoles: ['owner'],
        checklists: [
          {
            title: 'Test cases',
            items: [
              { content: 'Thanh toán thành công', isDone: false },
              { content: 'Thẻ hết hạn', isDone: false },
              { content: 'Số dư không đủ', isDone: false },
              { content: 'Timeout gateway', isDone: false },
            ],
          },
        ],
        attachments: [
          attachmentAt(3, 'payment-test-plan.docx', 'application/msword'),
        ],
      },
      {
        title: 'Chuẩn bị slide demo cho investor',
        description:
          'Slide 10 trang: vấn đề, giải pháp, demo sản phẩm, roadmap, và số liệu traction.',
        priority: CardPriority.MEDIUM,
        dueDate: new Date(Date.now() + 5 * DAY_MS),
        reminderOffsetMinutes: 120,
        labelNames: ['Urgent'],
        assigneeRoles: ['owner', 'member1'],
        checklists: [
          {
            title: 'Slide outline',
            items: [
              { content: 'Problem & solution', isDone: true },
              { content: 'Live demo script', isDone: false },
              { content: 'Traction & roadmap', isDone: false },
            ],
          },
        ],
        attachments: [
          attachmentAt(4, 'investor-deck-draft.pdf', 'application/pdf'),
        ],
      },
    ],
  },
  {
    title: 'In Progress',
    cards: [
      {
        title: 'Fix bug đăng nhập trên Safari',
        description:
          'User report không đăng nhập được trên Safari kể từ bản deploy tuần trước.',
        priority: CardPriority.HIGH,
        dueDate: new Date(Date.now() + 15 * 60 * 1000),
        reminderOffsetMinutes: 10,
        labelNames: ['Bug', 'Urgent'],
        assigneeRoles: ['owner'],
        checklists: [
          {
            title: 'Debug steps',
            items: [
              { content: 'Repro trên Safari 17', isDone: true },
              { content: 'Kiểm tra cookie SameSite', isDone: true },
              { content: 'Deploy hotfix', isDone: false },
            ],
          },
        ],
        attachments: [
          attachmentAt(0, 'safari-bug-screenshot.png', 'image/png'),
          attachmentAt(1, 'safari-console-log.txt', 'text/plain'),
        ],
      },
      {
        title: 'Tối ưu tốc độ tải trang board',
        description:
          'Giảm thời gian load board detail xuống dưới 300ms bằng cách thêm index và cache background.',
        priority: CardPriority.MEDIUM,
        dueDate: new Date(Date.now() + 2 * DAY_MS),
        labelNames: ['Feature'],
        assigneeRoles: ['member1'],
        reminderOffsetMinutes: 60,
        checklists: [
          {
            title: 'Optimization tasks',
            items: [
              { content: 'Thêm index cho Card.listId + order', isDone: true },
              { content: 'Cache resolved background URL', isDone: false },
            ],
          },
        ],
        attachments: [
          attachmentAt(2, 'query-benchmark-before-after.png', 'image/png'),
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
        labelNames: ['Docs'],
        assigneeRoles: ['member1'],
        checklists: [
          {
            title: 'Modules cần viết doc',
            items: [
              { content: 'Auth', isDone: true },
              { content: 'Boards', isDone: false },
              { content: 'Cards & Checklists', isDone: false },
            ],
          },
        ],
        attachments: [attachmentAt(3, 'api-doc-draft.md', 'text/plain')],
      },
      {
        title: 'Review PR: refactor notification service',
        description:
          'Tách EventEmitter listener ra khỏi NotificationsService để dễ test hơn.',
        priority: CardPriority.MEDIUM,
        dueDate: new Date(Date.now() - DAY_MS),
        labelNames: ['Feature'],
        assigneeRoles: ['owner'],
        checklists: [
          {
            title: 'Review checklist',
            items: [
              { content: 'Đọc qua diff', isDone: true },
              { content: 'Chạy test local', isDone: true },
              { content: 'Kiểm tra edge case retry email', isDone: true },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Done',
    cards: [
      {
        title: 'Setup CI/CD pipeline',
        description:
          'Tự động test, build Docker image, và deploy qua SSH mỗi khi push lên main.',
        priority: CardPriority.HIGH,
        isDone: true,
        labelNames: ['Feature'],
        assigneeRoles: ['owner'],
        checklists: [
          {
            title: 'Pipeline steps',
            items: [
              { content: 'Test job', isDone: true },
              { content: 'Build & push Docker image', isDone: true },
              { content: 'Deploy job qua SSH', isDone: true },
            ],
          },
        ],
        attachments: [
          attachmentAt(4, 'ci-cd-pipeline-diagram.png', 'image/png'),
        ],
      },
      {
        title: 'Thiết kế logo và bộ nhận diện thương hiệu',
        description:
          'Logo, color palette, và font chính cho toàn bộ sản phẩm và landing page.',
        priority: CardPriority.MEDIUM,
        isDone: true,
        labelNames: ['Design'],
        assigneeRoles: ['member1'],
        checklists: [
          {
            title: 'Brand assets',
            items: [
              { content: 'Logo (light + dark)', isDone: true },
              { content: 'Color palette', isDone: true },
              { content: 'Typography guide', isDone: true },
            ],
          },
        ],
        attachments: [
          attachmentAt(0, 'logo-final.png', 'image/png'),
          attachmentAt(1, 'brand-guideline.pdf', 'application/pdf'),
        ],
      },
      {
        title: 'Migrate database sang connection pooling',
        description:
          'Chuyển sang PgBouncer để tránh hết connection khi traffic tăng đột biến.',
        priority: CardPriority.LOW,
        isDone: true,
        labelNames: ['Bug'],
        assigneeRoles: ['owner'],
        checklists: [
          {
            title: 'Migration steps',
            items: [
              { content: 'Setup PgBouncer', isDone: true },
              { content: 'Update connection string', isDone: true },
              { content: 'Load test lại', isDone: true },
            ],
          },
        ],
      },
    ],
  },
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
          isDone: card.isDone ?? false,
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
          attachments: {
            create: (card.attachments ?? []).map((att) => ({
              filename: att.filename,
              key: att.url,
              mimeType: att.mimeType,
              uploadedById: users.owner.id,
            })),
          },
        },
      });
    }
  }

  return board;
}
