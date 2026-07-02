import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { StorageService } from '../storage/storage.service';
import { ATTACHMENT_JOB, ATTACHMENTS_QUEUE } from './attachment.constants';

@Processor(ATTACHMENTS_QUEUE)
export class AttachmentsProcessor extends WorkerHost {
  constructor(private readonly storage: StorageService) {
    super();
  }

  async process(job: Job<{ key: string }>): Promise<void> {
    switch (job.name) {
      case ATTACHMENT_JOB.DELETE_OBJECT:
        // Xóa file vật lý trên storage
        await this.storage.deleteObject(job.data.key);
        break;
    }
  }
}
