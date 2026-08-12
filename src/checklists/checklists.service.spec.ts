import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import { ChecklistsService } from './checklists.service';

describe('ChecklistsService', () => {
  let service: ChecklistsService;
  let prisma: {
    card: { findFirst: jest.Mock };
    checklist: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    checklistItem: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const boardId = 'board-1';
  const cardId = 'card-1';

  beforeEach(() => {
    prisma = {
      card: { findFirst: jest.fn() },
      checklist: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      checklistItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    eventEmitter = { emit: jest.fn() };

    service = new ChecklistsService(
      prisma as unknown as PrismaService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('create', () => {
    it('throws when the card does not belong to the board', async () => {
      prisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.create(boardId, cardId, { title: 'Todo' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.checklist.create).not.toHaveBeenCalled();
    });

    it('starts order at 1000 when there is no existing checklist', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      prisma.checklist.findFirst.mockResolvedValue(null);
      prisma.checklist.create.mockResolvedValue({ id: 'checklist-1' });

      await service.create(boardId, cardId, { title: 'Todo' });

      expect(prisma.checklist.create).toHaveBeenCalledWith({
        data: { title: 'Todo', order: 1000, cardId },
      });
    });

    it('increments order by 1000 from the last checklist', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      prisma.checklist.findFirst.mockResolvedValue({ order: 2000 });
      prisma.checklist.create.mockResolvedValue({ id: 'checklist-2' });

      await service.create(boardId, cardId, { title: 'Todo' });

      expect(prisma.checklist.create).toHaveBeenCalledWith({
        data: { title: 'Todo', order: 3000, cardId },
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

    it('returns the checklists with ordered items', async () => {
      prisma.card.findFirst.mockResolvedValue({ id: cardId });
      const checklists = [{ id: 'checklist-1', items: [] }];
      prisma.checklist.findMany.mockResolvedValue(checklists);

      const result = await service.findAll(boardId, cardId);

      expect(result).toBe(checklists);
      expect(prisma.checklist.findMany).toHaveBeenCalledWith({
        where: { cardId },
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      });
    });
  });

  describe('update', () => {
    it('throws when the checklist does not belong to the board', async () => {
      prisma.checklist.findFirst.mockResolvedValue(null);

      await expect(
        service.update(boardId, 'checklist-1', { title: 'New title' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.checklist.update).not.toHaveBeenCalled();
    });

    it('updates the checklist when it belongs to the board', async () => {
      prisma.checklist.findFirst.mockResolvedValue({ id: 'checklist-1' });
      prisma.checklist.update.mockResolvedValue({
        id: 'checklist-1',
        title: 'New title',
      });

      const result = await service.update(boardId, 'checklist-1', {
        title: 'New title',
      });

      expect(result).toEqual({ id: 'checklist-1', title: 'New title' });
      expect(prisma.checklist.update).toHaveBeenCalledWith({
        where: { id: 'checklist-1' },
        data: { title: 'New title' },
      });
    });
  });

  describe('remove', () => {
    it('throws when the checklist does not belong to the board', async () => {
      prisma.checklist.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(boardId, 'checklist-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.checklist.delete).not.toHaveBeenCalled();
    });

    it('deletes the checklist and returns its id', async () => {
      prisma.checklist.findFirst.mockResolvedValue({ id: 'checklist-1' });

      const result = await service.remove(boardId, 'checklist-1');

      expect(result).toEqual({ id: 'checklist-1' });
      expect(prisma.checklist.delete).toHaveBeenCalledWith({
        where: { id: 'checklist-1' },
      });
    });
  });

  describe('addItem', () => {
    it('throws when the checklist does not belong to the board', async () => {
      prisma.checklist.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem(boardId, 'checklist-1', { content: 'Buy milk' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('starts item order at 1000 when there is no existing item', async () => {
      prisma.checklist.findFirst.mockResolvedValue({ id: 'checklist-1' });
      prisma.checklistItem.findFirst.mockResolvedValue(null);
      prisma.checklistItem.create.mockResolvedValue({ id: 'item-1' });

      await service.addItem(boardId, 'checklist-1', { content: 'Buy milk' });

      expect(prisma.checklistItem.create).toHaveBeenCalledWith({
        data: { content: 'Buy milk', order: 1000, checklistId: 'checklist-1' },
      });
    });
  });

  describe('toggleItem', () => {
    it('throws when the item does not belong to the board', async () => {
      prisma.checklistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleItem(boardId, 'item-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('flips isDone and emits CHECKLIST_ITEM_TOGGLED', async () => {
      prisma.checklistItem.findFirst.mockResolvedValue({
        id: 'item-1',
        isDone: false,
      });
      const updated = { id: 'item-1', isDone: true };
      prisma.checklistItem.update.mockResolvedValue(updated);

      const result = await service.toggleItem(boardId, 'item-1', 'user-1');

      expect(prisma.checklistItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { isDone: true },
      });
      expect(result).toBe(updated);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        APP_EVENT.CHECKLIST_ITEM_TOGGLED,
        { boardId, item: updated, actorId: 'user-1' },
      );
    });
  });

  describe('removeItem', () => {
    it('throws when the item does not belong to the board', async () => {
      prisma.checklistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem(boardId, 'item-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.checklistItem.delete).not.toHaveBeenCalled();
    });

    it('deletes the item and returns its id', async () => {
      prisma.checklistItem.findFirst.mockResolvedValue({
        id: 'item-1',
        isDone: false,
      });

      const result = await service.removeItem(boardId, 'item-1');

      expect(result).toEqual({ id: 'item-1' });
      expect(prisma.checklistItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });
});
