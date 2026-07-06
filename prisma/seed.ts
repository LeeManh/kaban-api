import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { CardPriority, Role } from '../generated/prisma/enums';

const SEED_BOARD_NAME = 'Seed Test Board';
const SEED_PASSWORD = 'Password123!';

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
  const owner = await upsertUser('owner@kaban.dev', 'Avery Reyes');
  const member = await upsertUser('member@kaban.dev', 'Jamie Doe');

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
          { userId: member.id, role: Role.ADMIN },
        ],
      },
      stars: { create: [{ userId: owner.id }] },
      views: { create: [{ userId: owner.id }] },
      labels: {
        create: [
          { name: 'Bug', color: '#ef4444' },
          { name: 'Feature', color: '#22c55e' },
          { name: 'Urgent', color: '#f59e0b' },
        ],
      },
    },
    include: { labels: true },
  });

  const labelByName = Object.fromEntries(
    board.labels.map((l) => [l.name, l.id]),
  );

  const todoList = await prisma.list.create({
    data: { title: 'To Do', order: 1000, boardId: board.id },
  });
  const inProgressList = await prisma.list.create({
    data: { title: 'In Progress', order: 2000, boardId: board.id },
  });
  const doneList = await prisma.list.create({
    data: { title: 'Done', order: 3000, boardId: board.id },
  });

  await prisma.card.create({
    data: {
      title: 'Setup CI/CD pipeline',
      description: 'Cấu hình GitHub Actions để build và deploy tự động.',
      order: 1000,
      priority: CardPriority.HIGH,
      listId: todoList.id,
      labels: { connect: [{ id: labelByName.Feature }] },
      assignees: { connect: [{ id: owner.id }] },
      checklists: {
        create: [
          {
            title: 'Checklist triển khai',
            order: 1000,
            items: {
              create: [
                { content: 'Viết workflow build', order: 1000, isDone: true },
                { content: 'Viết workflow deploy', order: 2000, isDone: false },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.card.create({
    data: {
      title: 'Research competitor pricing',
      order: 2000,
      priority: CardPriority.LOW,
      listId: todoList.id,
    },
  });

  const oauthCard = await prisma.card.create({
    data: {
      title: 'Implement OAuth login',
      description: 'Tích hợp đăng nhập Google/GitHub.',
      order: 1000,
      priority: CardPriority.HIGH,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      listId: inProgressList.id,
      labels: {
        connect: [{ id: labelByName.Feature }, { id: labelByName.Urgent }],
      },
      assignees: { connect: [{ id: owner.id }, { id: member.id }] },
      checklists: {
        create: [
          {
            title: 'OAuth providers',
            order: 1000,
            items: {
              create: [
                { content: 'Google', order: 1000, isDone: true },
                { content: 'GitHub', order: 2000, isDone: false },
                { content: 'Facebook', order: 3000, isDone: false },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        content: 'Đã xong phần Google OAuth, đang làm GitHub.',
        cardId: oauthCard.id,
        authorId: owner.id,
      },
      {
        content: 'Nhớ thêm test cho refresh token nhé.',
        cardId: oauthCard.id,
        authorId: member.id,
      },
    ],
  });

  await prisma.attachment.create({
    data: {
      filename: 'oauth-flow-diagram.png',
      key: `cards/${oauthCard.id}/seed-oauth-flow-diagram.png`,
      mimeType: 'image/png',
      size: 102400,
      cardId: oauthCard.id,
      uploadedById: owner.id,
    },
  });

  await prisma.card.create({
    data: {
      title: 'Design landing page',
      order: 1000,
      priority: CardPriority.MEDIUM,
      isDone: true,
      listId: doneList.id,
      labels: { connect: [{ id: labelByName.Feature }] },
      assignees: { connect: [{ id: member.id }] },
    },
  });

  console.log('Seed thành công!');
  console.log(`Board: ${board.name} (${board.id})`);
  console.log(`Owner: ${owner.email} / ${SEED_PASSWORD}`);
  console.log(`Member: ${member.email} / ${SEED_PASSWORD}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
