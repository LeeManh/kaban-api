import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StorageModule } from '../storage/storage.module';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsProcessor } from './attachments.processor';
import { ATTACHMENTS_QUEUE } from './attachment.constants';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue({ name: ATTACHMENTS_QUEUE }),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsProcessor],
})
export class AttachmentsModule {}
