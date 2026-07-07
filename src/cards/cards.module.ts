import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [MailModule, StorageModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
