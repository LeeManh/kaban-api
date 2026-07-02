import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { MAIL_JOB, MAIL_QUEUE } from './mail.constants';

interface CardAssignedData {
  to: string;
  cardTitle: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case MAIL_JOB.CARD_ASSIGNED: {
        const { to, cardTitle } = job.data as CardAssignedData;
        await this.mail.sendMail({
          to,
          subject: `Bạn được giao thẻ: ${cardTitle}`,
          html: `<p>Bạn vừa được giao thẻ <b>${cardTitle}</b> trên Kanvas.</p>`,
        });
        break;
      }
    }
  }
}
