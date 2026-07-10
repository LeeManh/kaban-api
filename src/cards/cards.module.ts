import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [MailModule, NotificationsModule, StorageModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
