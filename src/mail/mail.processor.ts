import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { MAIL_JOB, MAIL_QUEUE } from './mail.constants';
import type {
  BoardInvitationData,
  CardAssignedData,
  DueReminderData,
  PasswordResetData,
  SendEmailData,
} from './mail.types';

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
          template: 'card-assigned',
          context: { cardTitle },
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
            template: 'due-reminder',
            context: { cardTitle: card.title },
          } satisfies SendEmailData);
        }
        break;
      }

      case MAIL_JOB.SEND_EMAIL: {
        const { to, subject, template, context } = job.data as SendEmailData;
        await this.mail.sendMail({ to, subject, template, context });
        break;
      }

      case MAIL_JOB.PASSWORD_RESET: {
        const { to, resetUrl } = job.data as PasswordResetData;
        await this.mail.sendMail({
          to,
          subject: 'Đặt lại mật khẩu Kanvas',
          template: 'forgot-password',
          context: { resetUrl },
        });
        break;
      }

      case MAIL_JOB.BOARD_INVITATION: {
        const { to, boardName, invitedByName, acceptUrl } =
          job.data as BoardInvitationData;
        await this.mail.sendMail({
          to,
          subject: `${invitedByName} đã mời bạn vào board "${boardName}"`,
          template: 'board-invitation',
          context: { boardName, invitedByName, acceptUrl },
        });
        break;
      }
    }
  }
}
