import { execSync } from 'child_process';
import * as path from 'path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaService } from '../../src/prisma/prisma.service';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  prisma: PrismaService;
}

export async function setupTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const url = container.getConnectionUri();

  execSync(`npx prisma db push --url "${url}" --accept-data-loss`, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  const prisma = new PrismaService({ url });
  await prisma.onModuleInit();

  return { container, prisma };
}

export async function teardownTestDatabase({
  container,
  prisma,
}: TestDatabase): Promise<void> {
  await prisma.onModuleDestroy();
  await container.stop();
}
