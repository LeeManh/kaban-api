import { Job, Queue } from 'bullmq';
import { NotificationType } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_JOB } from '../mail/mail.constants';
import { NotificationsService } from './notifications.service';
import { DueReminderProcessor } from './due-reminder.processor';

const objectContaining = <T extends object>(obj: T) =>
  expect.objectContaining(obj) as unknown as T;

describe('DueReminderProcessor', () => {
  let processor: DueReminderProcessor;
  let prisma: { card: { findUnique: jest.Mock } };
  let notifications: jest.Mocked<
    Pick<NotificationsService, 'create' | 'canEmail'>
  >;
  let mailQueue: jest.Mocked<Pick<Queue, 'add'>>;

  const cardId = 'card-1';
  const dueDate = new Date('2026-01-15T10:00:00.000Z');

  beforeEach(() => {
    prisma = { card: { findUnique: jest.fn() } };
    notifications = { create: jest.fn(), canEmail: jest.fn() };
    mailQueue = { add: jest.fn() };

    processor = new DueReminderProcessor(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      mailQueue as unknown as Queue,
    );
  });

  const job = (data: object) => ({ data }) as Job;

  it('does nothing when the card no longer exists', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await processor.process(job({ cardId }));

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('does nothing when the card has no due date', async () => {
    prisma.card.findUnique.mockResolvedValue({
      title: 'Task',
      dueDate: null,
      list: { boardId: 'board-1' },
      assignees: [{ id: 'user-1', email: 'a@b.com' }],
    });

    await processor.process(job({ cardId }));

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('creates an in-app notification for every assignee', async () => {
    prisma.card.findUnique.mockResolvedValue({
      title: 'Task',
      dueDate,
      list: { boardId: 'board-1' },
      assignees: [
        { id: 'user-1', email: 'a@b.com' },
        { id: 'user-2', email: 'b@b.com' },
      ],
    });
    notifications.canEmail.mockResolvedValue(false);

    await processor.process(job({ cardId }));

    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'user-1',
      type: NotificationType.DUE_REMINDER,
      message: 'Thẻ "Task" đã đến hạn',
      link: '/boards/board-1?card=card-1',
    });
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'user-2',
      type: NotificationType.DUE_REMINDER,
      message: 'Thẻ "Task" đã đến hạn',
      link: '/boards/board-1?card=card-1',
    });
  });

  it('skips queuing an email when the assignee has emails disabled', async () => {
    prisma.card.findUnique.mockResolvedValue({
      title: 'Task',
      dueDate,
      list: { boardId: 'board-1' },
      assignees: [{ id: 'user-1', email: 'a@b.com' }],
    });
    notifications.canEmail.mockResolvedValue(false);

    await processor.process(job({ cardId }));

    expect(mailQueue.add).not.toHaveBeenCalled();
  });

  it('queues a reminder email when the assignee allows it', async () => {
    prisma.card.findUnique.mockResolvedValue({
      title: 'Task',
      dueDate,
      list: { boardId: 'board-1' },
      assignees: [{ id: 'user-1', email: 'a@b.com' }],
    });
    notifications.canEmail.mockResolvedValue(true);

    await processor.process(job({ cardId }));

    expect(mailQueue.add).toHaveBeenCalledWith(
      MAIL_JOB.SEND_EMAIL,
      objectContaining({
        to: 'a@b.com',
        subject: 'Nhắc hạn: Task',
        template: 'due-reminder',
        context: objectContaining({
          cardTitle: 'Task',
          boardId: 'board-1',
          cardId,
        }),
      }),
    );
  });
});
