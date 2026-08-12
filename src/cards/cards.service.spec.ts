import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { APP_EVENT } from '../events/events.constants';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  let service: CardsService;
  let prisma: {
    card: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
    };
    list: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    boardMember: { findUnique: jest.Mock };
  };
  let storage: jest.Mocked<
    Pick<StorageService, 'getUploadUrl' | 'getDownloadUrl'>
  >;
  let mailQueue: jest.Mocked<Pick<Queue, 'add'>>;
  let dueReminderQueue: jest.Mocked<Pick<Queue, 'add' | 'getJob'>>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const boardId = 'board-1';
  const listId = 'list-1';
  const cardId = 'card-1';
  const actorId = 'user-1';

  beforeEach(() => {
    prisma = {
      card: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      list: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      boardMember: { findUnique: jest.fn() },
    };
    storage = { getUploadUrl: jest.fn(), getDownloadUrl: jest.fn() };
    mailQueue = { add: jest.fn() };
    dueReminderQueue = { add: jest.fn(), getJob: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    dueReminderQueue.getJob.mockResolvedValue(undefined);
    prisma.list.findUnique.mockResolvedValue({ boardId });

    service = new CardsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      mailQueue as unknown as Queue,
      dueReminderQueue as unknown as Queue,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('create', () => {
    it('throws when the list does not belong to the board', async () => {
      prisma.list.findUnique.mockResolvedValue({ boardId: 'other-board' });

      await expect(
        service.create(boardId, listId, { title: 'Task' }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.card.create).not.toHaveBeenCalled();
    });

    const expectedCreateData = (order: number) => ({
      title: 'Task',
      description: undefined,
      priority: undefined,
      dueDate: undefined,
      reminderOffsetMinutes: undefined,
      cover: undefined,
      order,
      listId,
    });

    it('appends to the bottom by default, starting at 1000', async () => {
      prisma.card.findFirst.mockResolvedValue(null);
      prisma.card.create.mockResolvedValue({ id: cardId });

      await service.create(boardId, listId, { title: 'Task' }, actorId);

      expect(prisma.card.create).toHaveBeenCalledWith({
        data: expectedCreateData(1000),
      });
    });

    it('appends 1000 past the last card when not adding to top', async () => {
      prisma.card.findFirst.mockResolvedValue({ order: 3000 });
      prisma.card.create.mockResolvedValue({ id: cardId });

      await service.create(boardId, listId, { title: 'Task' }, actorId);

      expect(prisma.card.create).toHaveBeenCalledWith({
        data: expectedCreateData(4000),
      });
    });

    it('places the card 1000 before the first one when addToTop is true', async () => {
      prisma.card.findFirst.mockResolvedValue({ order: 2000 });
      prisma.card.create.mockResolvedValue({ id: cardId });

      await service.create(
        boardId,
        listId,
        { title: 'Task', addToTop: true },
        actorId,
      );

      expect(prisma.card.create).toHaveBeenCalledWith({
        data: expectedCreateData(1000),
      });
    });

    it('starts at 1000 when adding to top of an empty list', async () => {
      prisma.card.findFirst.mockResolvedValue(null);
      prisma.card.create.mockResolvedValue({ id: cardId });

      await service.create(
        boardId,
        listId,
        { title: 'Task', addToTop: true },
        actorId,
      );

      expect(prisma.card.create).toHaveBeenCalledWith({
        data: expectedCreateData(1000),
      });
    });

    it('still creates the card when scheduling the due reminder fails', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      prisma.card.findFirst.mockResolvedValue(null);
      prisma.card.create.mockResolvedValue({ id: cardId });
      dueReminderQueue.getJob.mockRejectedValue(new Error('redis down'));

      const result = await service.create(
        boardId,
        listId,
        { title: 'Task' },
        actorId,
      );

      expect(result).toEqual({ id: cardId });
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('emits CARD_CREATED with the created card', async () => {
      prisma.card.findFirst.mockResolvedValue(null);
      const card = { id: cardId };
      prisma.card.create.mockResolvedValue(card);

      await service.create(boardId, listId, { title: 'Task' }, actorId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.CARD_CREATED, {
        boardId,
        card,
        actorId,
      });
    });
  });

  describe('update', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.update(boardId, cardId, { title: 'New', version: 0 }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException on a stale version write (P2025)', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      prisma.card.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.8.0',
        }),
      );

      await expect(
        service.update(boardId, cardId, { title: 'New', version: 0 }, actorId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unrelated Prisma errors', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      const otherError = new Prisma.PrismaClientKnownRequestError('Boom', {
        code: 'P2002',
        clientVersion: '7.8.0',
      });
      prisma.card.update.mockRejectedValue(otherError);

      await expect(
        service.update(boardId, cardId, { title: 'New', version: 0 }, actorId),
      ).rejects.toBe(otherError);
    });

    it('increments the version and emits CARD_UPDATED', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      const updated = { id: cardId, title: 'New', version: 1 };
      prisma.card.update.mockResolvedValue(updated);

      const result = await service.update(
        boardId,
        cardId,
        { title: 'New', version: 0 },
        actorId,
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId, version: 0 },
        data: { title: 'New', version: { increment: 1 } },
      });
      expect(result).toBe(updated);
      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.CARD_UPDATED, {
        boardId,
        card: updated,
        actorId,
      });
    });
  });

  describe('move', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.move(boardId, cardId, {}, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when moving into a list outside the board', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      prisma.list.findUnique.mockResolvedValue({ boardId: 'other-board' });

      await expect(
        service.move(boardId, cardId, { listId: 'list-2' }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('averages the order when both beforeId and afterId are valid', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      prisma.card.findUnique
        .mockResolvedValueOnce({ listId, order: 1000 })
        .mockResolvedValueOnce({ listId, order: 2000 });
      prisma.card.update.mockResolvedValue({ id: cardId, listId, order: 1500 });

      await service.move(
        boardId,
        cardId,
        { beforeId: 'card-before', afterId: 'card-after' },
        actorId,
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: { listId, order: 1500 },
      });
    });

    it('rejects when beforeId order is not less than afterId order', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      prisma.card.findUnique
        .mockResolvedValueOnce({ listId, order: 2000 })
        .mockResolvedValueOnce({ listId, order: 1000 });

      await expect(
        service.move(
          boardId,
          cardId,
          { beforeId: 'card-before', afterId: 'card-after' },
          actorId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('places the card 1000 before afterId when only afterId is given', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      prisma.card.findUnique.mockResolvedValueOnce({ listId, order: 2000 });
      prisma.card.update.mockResolvedValue({ id: cardId, listId, order: 1000 });

      await service.move(boardId, cardId, { afterId: 'card-after' }, actorId);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: { listId, order: 1000 },
      });
    });

    it('places the card 1000 after beforeId when only beforeId is given', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      prisma.card.findUnique.mockResolvedValueOnce({ listId, order: 2000 });
      prisma.card.update.mockResolvedValue({ id: cardId, listId, order: 3000 });

      await service.move(boardId, cardId, { beforeId: 'card-before' }, actorId);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: { listId, order: 3000 },
      });
    });

    it('appends to the bottom of the list when no neighbors are given', async () => {
      prisma.card.findFirst
        .mockResolvedValueOnce({ id: cardId, listId }) // getCardInBoard
        .mockResolvedValueOnce({ order: 2000 }); // computeOrder fallback: last card in list
      prisma.card.update.mockResolvedValue({ id: cardId, listId, order: 3000 });

      await service.move(boardId, cardId, {}, actorId);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: { listId, order: 3000 },
      });
    });

    it('rejects when beforeId/afterId is the same as the card being moved', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });

      await expect(
        service.move(boardId, cardId, { afterId: cardId }, actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the neighbor card is not in the target list', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      prisma.card.findUnique.mockResolvedValueOnce({
        listId: 'another-list',
        order: 2000,
      });

      await expect(
        service.move(boardId, cardId, { afterId: 'card-after' }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('emits CARD_MOVED with the updated position', async () => {
      prisma.card.findFirst
        .mockResolvedValueOnce({ id: cardId, listId }) // getCardInBoard
        .mockResolvedValueOnce(null); // computeOrder fallback: empty list
      const updated = { id: cardId, listId, order: 1000 };
      prisma.card.update.mockResolvedValue(updated);

      await service.move(boardId, cardId, {}, actorId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.CARD_MOVED, {
        boardId,
        cardId: updated.id,
        listId: updated.listId,
        order: updated.order,
        actorId,
      });
    });
  });

  describe('remove', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(boardId, cardId, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.card.delete).not.toHaveBeenCalled();
    });

    it('deletes the card, cancels its reminder job and emits CARD_DELETED', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, listId });
      const removeFn = jest.fn();
      dueReminderQueue.getJob.mockResolvedValue({ remove: removeFn } as never);

      const result = await service.remove(boardId, cardId, actorId);

      expect(prisma.card.delete).toHaveBeenCalledWith({
        where: { id: cardId },
      });
      expect(removeFn).toHaveBeenCalled();
      expect(result).toEqual({ id: cardId });
      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.CARD_DELETED, {
        boardId,
        cardId,
        listId,
        actorId,
      });
    });
  });

  describe('assignMember', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.assignMember(boardId, cardId, 'user-2', actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the target user is not a board member', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, title: 'Task' });
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.assignMember(boardId, cardId, 'user-2', actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.card.update).not.toHaveBeenCalled();
    });

    it('assigns the member, queues a notification email and emits the event', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, title: 'Task' });
      prisma.boardMember.findUnique.mockResolvedValue({ userId: 'user-2' });
      prisma.user.findUnique.mockResolvedValue({ email: 'u2@b.com' });

      const result = await service.assignMember(
        boardId,
        cardId,
        'user-2',
        actorId,
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: { assignees: { connect: { id: 'user-2' } } },
      });
      expect(mailQueue.add).toHaveBeenCalled();
      expect(result).toEqual({ cardId, userId: 'user-2' });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        APP_EVENT.CARD_ASSIGNEE_CHANGED,
        {
          boardId,
          cardId,
          userId: 'user-2',
          action: 'assigned',
          actorId,
        },
      );
    });

    it('skips queuing an email when the target user cannot be found', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId, title: 'Task' });
      prisma.boardMember.findUnique.mockResolvedValue({ userId: 'user-2' });
      prisma.user.findUnique.mockResolvedValue(null);

      await service.assignMember(boardId, cardId, 'user-2', actorId);

      expect(mailQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('unassignMember', () => {
    it('disconnects the member and emits the event', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });

      const result = await service.unassignMember(
        boardId,
        cardId,
        'user-2',
        actorId,
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: { assignees: { disconnect: { id: 'user-2' } } },
      });
      expect(result).toEqual({ cardId, userId: 'user-2' });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        APP_EVENT.CARD_ASSIGNEE_CHANGED,
        {
          boardId,
          cardId,
          userId: 'user-2',
          action: 'unassigned',
          actorId,
        },
      );
    });
  });

  describe('presignDescriptionImage', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.presignDescriptionImage(boardId, cardId, {
          filename: 'a.png',
          contentType: 'image/png',
          size: 1024,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the presigned key, upload url and view url', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      storage.getUploadUrl.mockResolvedValue('https://upload.url');
      storage.getDownloadUrl.mockResolvedValue('https://view.url');

      const result = await service.presignDescriptionImage(boardId, cardId, {
        filename: 'a.png',
        contentType: 'image/png',
        size: 1024,
      });

      expect(result.key).toContain('descriptions/');
      expect(result.uploadUrl).toBe('https://upload.url');
      expect(result.viewUrl).toBe('https://view.url');
    });
  });
});
