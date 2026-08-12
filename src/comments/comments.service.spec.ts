import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PUBLIC_USER_SELECT } from '../users/user.selects';
import { APP_EVENT } from '../events/events.constants';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: {
    card: { findFirst: jest.Mock };
    comment: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
    boardMember: { findUnique: jest.Mock };
  };
  let storage: jest.Mocked<
    Pick<StorageService, 'getUploadUrl' | 'getDownloadUrl'>
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const boardId = 'board-1';
  const cardId = 'card-1';
  const author = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    avatar: null,
  };

  beforeEach(() => {
    prisma = {
      card: { findFirst: jest.fn() },
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      boardMember: { findUnique: jest.fn() },
    };
    storage = {
      getUploadUrl: jest.fn(),
      getDownloadUrl: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    service = new CommentsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('presignImage', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.presignImage(boardId, cardId, {
          filename: 'a.png',
          contentType: 'image/png',
          size: 1024,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the key with an upload url and a view url', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      storage.getUploadUrl.mockResolvedValue('https://upload.url');
      storage.getDownloadUrl.mockResolvedValue('https://view.url');

      const result = await service.presignImage(boardId, cardId, {
        filename: 'a.png',
        contentType: 'image/png',
        size: 1024,
      });

      expect(result.uploadUrl).toBe('https://upload.url');
      expect(result.viewUrl).toBe('https://view.url');
      expect(result.key).toContain('comments/');
      expect(storage.getUploadUrl).toHaveBeenCalledWith(
        result.key,
        'image/png',
      );
    });
  });

  describe('create', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.create(boardId, cardId, 'user-1', { content: 'Hello' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('creates the comment and emits COMMENT_ADDED', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      const created = { id: 'comment-1', content: 'Hello', author };
      prisma.comment.create.mockResolvedValue(created);

      const result = await service.create(boardId, cardId, 'user-1', {
        content: 'Hello',
      });

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: { content: 'Hello', cardId, authorId: 'user-1' },
        include: { author: { select: PUBLIC_USER_SELECT } },
      });
      expect(result.content).toBe('Hello');
      expect(result.author.id).toBe('user-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.COMMENT_ADDED, {
        boardId,
        comment: created,
        actorId: 'user-1',
      });
    });
  });

  describe('findAll', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(service.findAll(boardId, cardId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns all comments for the card', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      prisma.comment.findMany.mockResolvedValue([
        { id: 'comment-1', content: 'Hi', author },
        { id: 'comment-2', content: 'There', author },
      ]);

      const result = await service.findAll(boardId, cardId);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Hi');
      expect(result[1].content).toBe('There');
    });
  });

  describe('update', () => {
    it('throws when the comment does not belong to the board', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(boardId, 'comment-1', 'user-1', { content: 'Edit' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when the caller is not the author', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
      });

      await expect(
        service.update(boardId, 'comment-1', 'user-2', { content: 'Edit' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it('updates the comment when the caller is the author', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.comment.update.mockResolvedValue({
        id: 'comment-1',
        content: 'Edited',
        author,
      });

      const result = await service.update(boardId, 'comment-1', 'user-1', {
        content: 'Edited',
      });

      expect(result.content).toBe('Edited');
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'Edited' },
        include: { author: { select: PUBLIC_USER_SELECT } },
      });
    });
  });

  describe('remove', () => {
    it('throws when the comment does not belong to the board', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(boardId, 'comment-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets the author delete their own comment without checking membership', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
      });

      const result = await service.remove(boardId, 'comment-1', 'user-1');

      expect(result).toEqual({ id: 'comment-1' });
      expect(prisma.boardMember.findUnique).not.toHaveBeenCalled();
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it("lets a board admin delete someone else's comment", async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.boardMember.findUnique.mockResolvedValue({ role: Role.ADMIN });

      const result = await service.remove(boardId, 'comment-1', 'user-2');

      expect(result).toEqual({ id: 'comment-1' });
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it("rejects a regular member deleting someone else's comment", async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.boardMember.findUnique.mockResolvedValue({ role: Role.MEMBER });

      await expect(
        service.remove(boardId, 'comment-1', 'user-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });
  });
});
