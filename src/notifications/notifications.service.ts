import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import type { NotificationCreatedEvent } from '../events/events.types';
import type { CreateNotificationParams } from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(params: CreateNotificationParams) {
    const notification = await this.prisma.notification.create({
      data: params,
    });

    this.eventEmitter.emit(APP_EVENT.NOTIFICATION_CREATED, {
      notification,
    } satisfies NotificationCreatedEvent);

    return notification;
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
