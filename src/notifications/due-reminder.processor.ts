import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { NotificationType } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_JOB, MAIL_QUEUE } from '../mail/mail.constants';
import type { SendEmailData } from '../mail/mail.types';
import { NotificationsService } from './notifications.service';
import { DUE_REMINDER_QUEUE } from './notifications.constants';

@Processor(DUE_REMINDER_QUEUE)
export class DueReminderProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { cardId } = job.data as { cardId: string };

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        title: true,
        dueDate: true,
        list: { select: { boardId: true } },
        assignees: { select: { id: true, email: true } },
      },
    });
    if (!card || !card.dueDate) return;

    const dueDateText = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(card.dueDate);

    for (const assignee of card.assignees) {
      await this.notifications.create({
        userId: assignee.id,
        type: NotificationType.DUE_REMINDER,
        message: `Thẻ "${card.title}" đã đến hạn`,
        link: `/boards/${card.list.boardId}?card=${cardId}`,
      });

      const allowed = await this.notifications.canEmail(
        assignee.id,
        NotificationType.DUE_REMINDER,
      );
      if (!allowed) continue;

      await this.mailQueue.add(MAIL_JOB.SEND_EMAIL, {
        to: assignee.email,
        subject: `Nhắc hạn: ${card.title}`,
        template: 'due-reminder',
        context: {
          cardTitle: card.title,
          dueDateText,
          boardId: card.list.boardId,
          cardId,
        },
      } satisfies SendEmailData);
    }
  }
}
