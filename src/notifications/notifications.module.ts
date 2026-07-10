import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../mail/mail.module';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsController } from './notifications.controller';
import { DueReminderProcessor } from './due-reminder.processor';
import { DUE_REMINDER_QUEUE } from './notifications.constants';

@Module({
  imports: [MailModule, BullModule.registerQueue({ name: DUE_REMINDER_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsListener,
    DueReminderProcessor,
  ],
  exports: [NotificationsService, BullModule],
})
export class NotificationsModule {}
