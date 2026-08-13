import { NotificationType } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let prisma: { card: { findUnique: jest.Mock } };
  let notifications: jest.Mocked<Pick<NotificationsService, 'create'>>;

  const boardId = 'board-1';
  const cardId = 'card-1';

  beforeEach(() => {
    prisma = { card: { findUnique: jest.fn() } };
    notifications = { create: jest.fn() };

    listener = new NotificationsListener(
      notifications as unknown as NotificationsService,
      prisma as unknown as PrismaService,
    );
  });

  describe('onCardAssigneeChanged', () => {
    it('does nothing when the card no longer exists', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await listener.onCardAssigneeChanged({
        boardId,
        cardId,
        userId: 'user-1',
        action: 'assigned',
        actorId: 'user-2',
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('notifies the assignee when a card is assigned to them', async () => {
      prisma.card.findUnique.mockResolvedValue({ title: 'Task' });

      await listener.onCardAssigneeChanged({
        boardId,
        cardId,
        userId: 'user-1',
        action: 'assigned',
        actorId: 'user-2',
      });

      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.CARD_ASSIGNED,
        message: 'Bạn được giao thẻ "Task"',
        link: `/boards/${boardId}?card=${cardId}`,
      });
    });

    it('notifies the assignee when unassigned by someone else', async () => {
      prisma.card.findUnique.mockResolvedValue({ title: 'Task' });

      await listener.onCardAssigneeChanged({
        boardId,
        cardId,
        userId: 'user-1',
        action: 'unassigned',
        actorId: 'user-2',
      });

      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.CARD_REMOVED,
        message: 'Bạn đã bị gỡ khỏi thẻ "Task"',
        link: `/boards/${boardId}?card=${cardId}`,
      });
    });

    it('does not notify a user who unassigned themselves', async () => {
      prisma.card.findUnique.mockResolvedValue({ title: 'Task' });

      await listener.onCardAssigneeChanged({
        boardId,
        cardId,
        userId: 'user-1',
        action: 'unassigned',
        actorId: 'user-1',
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('onCardMoved', () => {
    it('notifies every assignee except the actor', async () => {
      prisma.card.findUnique.mockResolvedValue({
        title: 'Task',
        assignees: [{ id: 'user-1' }, { id: 'user-2' }],
      });

      await listener.onCardMoved({
        boardId,
        cardId,
        listId: 'list-1',
        order: 1000,
        actorId: 'user-2',
      });

      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.CARD_MOVED,
        message: 'Thẻ "Task" đã được di chuyển',
        link: `/boards/${boardId}?card=${cardId}`,
      });
    });

    it('does nothing when the card no longer exists', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await listener.onCardMoved({
        boardId,
        cardId,
        listId: 'list-1',
        order: 1000,
        actorId: 'user-1',
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('onAttachmentAdded', () => {
    it('notifies every assignee except the actor', async () => {
      prisma.card.findUnique.mockResolvedValue({
        title: 'Task',
        assignees: [{ id: 'user-1' }, { id: 'user-2' }],
      });

      await listener.onAttachmentAdded({
        boardId,
        cardId,
        filename: 'design.png',
        actorId: 'user-1',
      });

      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'user-2',
        type: NotificationType.ATTACHMENT_ADDED,
        message: '"design.png" đã được thêm vào thẻ "Task"',
        link: `/boards/${boardId}?card=${cardId}`,
      });
    });
  });

  describe('onCommentAdded', () => {
    it('notifies every assignee except the actor', async () => {
      prisma.card.findUnique.mockResolvedValue({
        title: 'Task',
        assignees: [{ id: 'user-1' }, { id: 'user-2' }],
      });

      await listener.onCommentAdded({
        boardId,
        comment: {
          cardId,
          author: { id: 'user-1', name: 'Alice', email: 'a@b.com' },
        } as never,
        actorId: 'user-1',
      });

      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'user-2',
        type: NotificationType.COMMENT_MENTION,
        message: 'Có bình luận mới trên thẻ "Task"',
        link: `/boards/${boardId}?card=${cardId}`,
      });
    });
  });
});
