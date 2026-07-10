import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type ConfigType } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { EmailFrequency, NotificationType } from 'generated/prisma/enums';
import { appConfig } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_JOB, MAIL_QUEUE } from '../mail/mail.constants';
import type { SendEmailData } from '../mail/mail.types';
import { APP_EVENT } from '../events/events.constants';
import type { NotificationCreatedEvent } from '../events/events.types';
import type { CreateNotificationParams } from './notifications.types';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

const AUTO_EMAIL_TYPES: NotificationType[] = [
  NotificationType.COMMENT_MENTION,
  NotificationType.CARD_REMOVED,
  NotificationType.ATTACHMENT_ADDED,
  NotificationType.CARD_MOVED,
];

const DEFAULT_PREFERENCE = {
  emailFrequency: EmailFrequency.INSTANT,
  commentsEnabled: true,
  dueDatesEnabled: true,
  removedFromCardEnabled: true,
  attachmentsEnabled: true,
  cardsMovedEnabled: true,
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async create(params: CreateNotificationParams) {
    const notification = await this.prisma.notification.create({
      data: params,
    });

    this.eventEmitter.emit(APP_EVENT.NOTIFICATION_CREATED, {
      notification,
    } satisfies NotificationCreatedEvent);

    if (AUTO_EMAIL_TYPES.includes(params.type)) {
      await this.maybeSendEmail(params);
    }

    return notification;
  }

  async getPreference(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    return pref ?? { userId, ...DEFAULT_PREFERENCE };
  }

  async updatePreference(userId: string, dto: UpdateNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...DEFAULT_PREFERENCE, ...dto },
    });
  }

  async canEmail(userId: string, type: NotificationType): Promise<boolean> {
    const pref = await this.getPreference(userId);
    if (pref.emailFrequency === EmailFrequency.NEVER) return false;

    switch (type) {
      case NotificationType.COMMENT_MENTION:
        return pref.commentsEnabled;
      case NotificationType.DUE_REMINDER:
        return pref.dueDatesEnabled;
      case NotificationType.CARD_REMOVED:
        return pref.removedFromCardEnabled;
      case NotificationType.ATTACHMENT_ADDED:
        return pref.attachmentsEnabled;
      case NotificationType.CARD_MOVED:
        return pref.cardsMovedEnabled;
      default:
        return true;
    }
  }

  private async maybeSendEmail(params: CreateNotificationParams) {
    const allowed = await this.canEmail(params.userId, params.type);
    if (!allowed) return;

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    });
    if (!user) return;

    await this.mailQueue.add(MAIL_JOB.SEND_EMAIL, {
      to: user.email,
      subject: params.message,
      template: 'notification',
      context: {
        message: params.message,
        link: params.link
          ? `${this.appCfg.frontendUrl}${params.link}`
          : this.appCfg.frontendUrl,
      },
    } satisfies SendEmailData);
  }

  findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(userId: string, notificationId: string) {
    await this.ensureOwnership(userId, notificationId);
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  private async ensureOwnership(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });
    if (!notification || notification.userId !== userId)
      throw new NotFoundException('Không tìm thấy thông báo');
  }
}
