import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import type {
  AttachmentAddedEvent,
  CardAssigneeChangedEvent,
  CardMovedEvent,
  CommentAddedEvent,
} from '../events/events.types';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(APP_EVENT.CARD_ASSIGNEE_CHANGED)
  async onCardAssigneeChanged(payload: CardAssigneeChangedEvent) {
    const card = await this.prisma.card.findUnique({
      where: { id: payload.cardId },
      select: { title: true },
    });
    if (!card) return;

    if (payload.action === 'assigned') {
      await this.notifications.create({
        userId: payload.userId,
        type: NotificationType.CARD_ASSIGNED,
        message: `Bạn được giao thẻ "${card.title}"`,
        link: `/boards/${payload.boardId}?card=${payload.cardId}`,
      });
      return;
    }

    if (payload.userId === payload.actorId) return;
    await this.notifications.create({
      userId: payload.userId,
      type: NotificationType.CARD_REMOVED,
      message: `Bạn đã bị gỡ khỏi thẻ "${card.title}"`,
      link: `/boards/${payload.boardId}?card=${payload.cardId}`,
    });
  }

  @OnEvent(APP_EVENT.CARD_MOVED)
  async onCardMoved(payload: CardMovedEvent) {
    const card = await this.prisma.card.findUnique({
      where: { id: payload.cardId },
      select: { title: true, assignees: { select: { id: true } } },
    });
    if (!card) return;

    const recipients = card.assignees
      .map((a) => a.id)
      .filter((id) => id !== payload.actorId);

    await Promise.all(
      recipients.map((userId) =>
        this.notifications.create({
          userId,
          type: NotificationType.CARD_MOVED,
          message: `Thẻ "${card.title}" đã được di chuyển`,
          link: `/boards/${payload.boardId}?card=${payload.cardId}`,
        }),
      ),
    );
  }

  @OnEvent(APP_EVENT.ATTACHMENT_ADDED)
  async onAttachmentAdded(payload: AttachmentAddedEvent) {
    const card = await this.prisma.card.findUnique({
      where: { id: payload.cardId },
      select: { title: true, assignees: { select: { id: true } } },
    });
    if (!card) return;

    const recipients = card.assignees
      .map((a) => a.id)
      .filter((id) => id !== payload.actorId);

    await Promise.all(
      recipients.map((userId) =>
        this.notifications.create({
          userId,
          type: NotificationType.ATTACHMENT_ADDED,
          message: `"${payload.filename}" đã được thêm vào thẻ "${card.title}"`,
          link: `/boards/${payload.boardId}?card=${payload.cardId}`,
        }),
      ),
    );
  }

  @OnEvent(APP_EVENT.COMMENT_ADDED)
  async onCommentAdded(payload: CommentAddedEvent) {
    const card = await this.prisma.card.findUnique({
      where: { id: payload.comment.cardId },
      select: { title: true, assignees: { select: { id: true } } },
    });
    if (!card) return;

    const recipients = card.assignees
      .map((a) => a.id)
      .filter((id) => id !== payload.actorId);

    await Promise.all(
      recipients.map((userId) =>
        this.notifications.create({
          userId,
          type: NotificationType.COMMENT_MENTION,
          message: `Có bình luận mới trên thẻ "${card.title}"`,
          link: `/boards/${payload.boardId}?card=${payload.comment.cardId}`,
        }),
      ),
    );
  }
}
