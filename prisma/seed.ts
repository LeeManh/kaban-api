import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { seedDemoBoard } from './seed-demo-board';
import { seedTemplates } from './seed-templates';

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
  const owner = await upsertUser('admin-kavas@gmail.com', 'Admin');
  const member1 = await upsertUser('lemanhddt@gmail.com', 'Manh Lee');

  const board = await seedDemoBoard(prisma, { owner, member1 });
  await seedTemplates(prisma, owner.id);

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
