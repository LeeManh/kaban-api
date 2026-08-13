import { execSync } from 'child_process';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { AppModule } from '../src/app.module';
import { API_VERSION } from '../src/api-version';
import { configureApp } from '../src/configure-app';
import { MAIL_QUEUE } from '../src/mail/mail.constants';
import { MailProcessor } from '../src/mail/mail.processor';
import { DUE_REMINDER_QUEUE } from '../src/notifications/notifications.constants';
import { DueReminderProcessor } from '../src/notifications/due-reminder.processor';
import { ATTACHMENTS_QUEUE } from '../src/attachments/attachment.constants';
import { AttachmentsProcessor } from '../src/attachments/attachments.processor';

export const API_PREFIX = `/api/v${API_VERSION}`;

const QUEUE_NAMES = [MAIL_QUEUE, DUE_REMINDER_QUEUE, ATTACHMENTS_QUEUE];
const PROCESSOR_CLASSES = [
  MailProcessor,
  DueReminderProcessor,
  AttachmentsProcessor,
];

const PROJECT_ROOT = path.resolve(__dirname, '..');

export interface E2eContext {
  app: INestApplication;
  pgContainer: StartedPostgreSqlContainer;
  redisContainer: StartedRedisContainer;
}

export async function setupE2eApp(): Promise<E2eContext> {
  const pgContainer = await new PostgreSqlContainer(
    'postgres:17-alpine',
  ).start();
  const redisContainer = await new RedisContainer('redis:7-alpine').start();

  const databaseUrl = pgContainer.getConnectionUri();
  const redisUrl = redisContainer.getConnectionUrl();

  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = redisUrl;
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN = '30d';
  process.env.FRONTEND_URL = 'http://localhost:5173';

  execSync(`npx prisma db push --url "${databaseUrl}" --accept-data-loss`, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.enableShutdownHooks();
  configureApp(app);

  await app.init();

  for (const ProcessorClass of PROCESSOR_CLASSES) {
    app.get(ProcessorClass).worker.on('error', () => {});
  }

  return { app, pgContainer, redisContainer };
}

export async function teardownE2eApp({
  app,
  pgContainer,
  redisContainer,
}: E2eContext): Promise<void> {
  for (const name of QUEUE_NAMES) {
    const queue = app.get<Queue>(getQueueToken(name), { strict: false });
    await queue.close();
  }
  for (const ProcessorClass of PROCESSOR_CLASSES) {
    await app.get(ProcessorClass).worker.close();
  }
  await app.close();
  await pgContainer.stop();
  await redisContainer.stop();
}
