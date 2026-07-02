import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { MAIL_JOB, MAIL_QUEUE } from './mail.constants';

interface CardAssignedData {
  to: string;
  cardTitle: string;
}

interface DueReminderData {
  cardId: string;
}

interface SendEmailData {
  to: string;
  subject: string;
  html: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue,
  ) {
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

      case MAIL_JOB.DUE_REMINDER: {
        const { cardId } = job.data as DueReminderData;

        const card = await this.prisma.card.findUnique({
          where: { id: cardId },
          select: {
            title: true,
            dueDate: true,
            assignees: { select: { email: true } },
          },
        });

        if (!card || !card.dueDate) break;

        for (const assignee of card.assignees) {
          await this.queue.add(MAIL_JOB.SEND_EMAIL, {
            to: assignee.email,
            subject: `Nhắc hạn: ${card.title}`,
            html: `<p>Thẻ <b>${card.title}</b> đã tới hạn.</p>`,
          });
        }
        break;
      }

      case MAIL_JOB.SEND_EMAIL: {
        const { to, subject, html } = job.data as SendEmailData;
        await this.mail.sendMail({ to, subject, html });
        break;
      }
    }
  }
}
