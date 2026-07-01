import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  appConfig,
  dbConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, redisConfig, storageConfig],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    PrismaModule,
    JwtModule.register({ global: true }),
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
