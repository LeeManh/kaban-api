import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SentryModule } from '@sentry/nestjs/setup';

import {
  appConfig,
  dbConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
  mailConfig,
  validationSchema,
} from './config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guard/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { BoardsModule } from './boards/boards.module';
import { ListsModule } from './lists/lists.module';
import { CardsModule } from './cards/cards.module';
import { LabelsModule } from './labels/labels.module';
import { CommentsModule } from './comments/comments.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { MailModule } from './mail/mail.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InvitesModule } from './invites/invites.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        dbConfig,
        jwtConfig,
        redisConfig,
        storageConfig,
        mailConfig,
      ],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    JwtModule.register({ global: true }),
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (cfg: ConfigType<typeof redisConfig>) => {
        const url = new URL(cfg.url);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port),
            password: url.password,
          },
        };
      },
    }),
    AuthModule,
    RedisModule,
    UsersModule,
    BoardsModule,
    ListsModule,
    CardsModule,
    LabelsModule,
    CommentsModule,
    ChecklistsModule,
    AttachmentsModule,
    MailModule,
    EventsModule,
    NotificationsModule,
    InvitesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
