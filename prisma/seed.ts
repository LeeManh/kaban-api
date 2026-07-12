import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { CardPriority, Role } from '../generated/prisma/enums';

const SEED_BOARD_NAME = 'Kanvas Product Launch';
const SEED_PASSWORD = '12345678';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function upsertUser(email: string, name: string) {
  const password = await bcrypt.hash(SEED_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, password },
  });
}

async function main() {
  const owner = await upsertUser('lemanhddt@gmail.com', 'Manh Lee');
  const member1 = await upsertUser('contact.vocatomo@gmail.com', 'Vocatomo');

  const existing = await prisma.board.findFirst({
    where: { name: SEED_BOARD_NAME, ownerId: owner.id },
    select: { id: true },
  });
  if (existing) {
    await prisma.board.delete({ where: { id: existing.id } });
  }

  const board = await prisma.board.create({
    data: {
      name: SEED_BOARD_NAME,
      background: '#2563eb',
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: Role.OWNER },
          { userId: member1.id, role: Role.MEMBER },
        ],
      },
      stars: { create: [{ userId: owner.id }] },
      views: { create: [{ userId: owner.id }] },
      labels: {
        create: [
          { name: 'Design', color: '#a855f7' },
          { name: 'Bug', color: '#ef4444' },
        ],
      },
    },
    include: { labels: true },
  });

  const labelByName = Object.fromEntries(
    board.labels.map((l) => [l.name, l.id]),
  );

  const backlogList = await prisma.list.create({
    data: { title: 'Backlog', order: 1000, boardId: board.id },
  });
  const todoList = await prisma.list.create({
    data: { title: 'To Do', order: 2000, boardId: board.id },
  });
  const inProgressList = await prisma.list.create({
    data: { title: 'In Progress', order: 3000, boardId: board.id },
  });
  const reviewList = await prisma.list.create({
    data: { title: 'Review', order: 4000, boardId: board.id },
  });
  await prisma.list.create({
    data: { title: 'Done', order: 5000, boardId: board.id },
  });

  await prisma.card.create({
    data: {
      title: 'Thiết kế trang landing page',
      order: 1000,
      priority: CardPriority.MEDIUM,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      reminderOffsetMinutes: 60,
      listId: todoList.id,
      labels: { connect: [{ id: labelByName.Design }] },
      assignees: { connect: [{ id: member1.id }] },
      checklists: {
        create: [
          {
            title: 'Checklist thiết kế',
            order: 1000,
            items: {
              create: [
                { content: 'Wireframe', order: 1000, isDone: true },
                {
                  content: 'Review với team',
                  order: 2000,
                  isDone: false,
                },
                { content: 'Approve final', order: 3000, isDone: false },
              ],
            },
          },
        ],
      },
    },
  });

  const bugCard = await prisma.card.create({
    data: {
      title: 'Fix bug đăng nhập trên Safari',
      order: 1000,
      priority: CardPriority.HIGH,
      dueDate: new Date(Date.now() + 15 * 60 * 1000),
      reminderOffsetMinutes: 10,
      listId: inProgressList.id,
      labels: { connect: [{ id: labelByName.Bug }] },
      assignees: { connect: [{ id: owner.id }] },
    },
  });

  await prisma.comment.create({
    data: {
      content:
        'Đã repro được, lỗi do Safari không hỗ trợ đúng cookie SameSite=None 🔥',
      cardId: bugCard.id,
      authorId: owner.id,
    },
  });

  await prisma.attachment.create({
    data: {
      filename: 'safari-bug-screenshot.png',
      key: `cards/${bugCard.id}/seed-safari-bug-screenshot.png`,
      mimeType: 'image/png',
      size: 102400,
      cardId: bugCard.id,
      uploadedById: owner.id,
    },
  });

  await prisma.card.create({
    data: {
      title: 'Viết tài liệu API cho FE',
      description:
        'Tổng hợp lại toàn bộ endpoint hiện có kèm ví dụ request/response.\n\n![sơ đồ](cards/seed-api-doc-diagram.png)',
      order: 1000,
      priority: CardPriority.LOW,
      listId: reviewList.id,
      assignees: { connect: [{ id: member1.id }] },
    },
  });

  await prisma.card.create({
    data: {
      title: 'Research đối thủ cạnh tranh',
      order: 1000,
      priority: CardPriority.LOW,
      listId: backlogList.id,
    },
  });

  console.log('Seed thành công!');
  console.log(`Board: ${board.name} (${board.id})`);
  console.log(`Owner: ${owner.email} / ${SEED_PASSWORD}`);
  console.log(`Member1: ${member1.email} / ${SEED_PASSWORD}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
