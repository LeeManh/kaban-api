import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import { ListsService } from './lists.service';

describe('ListsService', () => {
  let service: ListsService;
  let prisma: DeepMockProxy<PrismaService>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const boardId = 'board-1';
  const listId = 'list-1';
  const actorId = 'user-1';

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    eventEmitter = { emit: jest.fn() };

    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (tx: typeof prisma) => unknown)(
        prisma,
      ) as Promise<unknown>;
    });
    prisma.list.findUnique.mockResolvedValue({ boardId } as never);

    service = new ListsService(
      prisma,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('create', () => {
    it('starts order at 1000 when the board has no lists yet', async () => {
      prisma.list.findFirst.mockResolvedValue(null);
      prisma.list.create.mockResolvedValue({ id: listId } as never);

      await service.create(boardId, { title: 'Todo' }, actorId);

      expect(prisma.list.create).toHaveBeenCalledWith({
        data: { title: 'Todo', order: 1000, boardId },
      });
    });

    it('increments order by 1000 from the last list and emits LIST_CREATED', async () => {
      prisma.list.findFirst.mockResolvedValue({ order: 2000 } as never);
      const list = { id: listId, order: 3000 };
      prisma.list.create.mockResolvedValue(list as never);

      await service.create(boardId, { title: 'Todo' }, actorId);

      expect(prisma.list.create).toHaveBeenCalledWith({
        data: { title: 'Todo', order: 3000, boardId },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.LIST_CREATED, {
        boardId,
        list,
        actorId,
      });
    });
  });

  describe('update', () => {
    it('throws when the list does not belong to the board', async () => {
      prisma.list.findUnique.mockResolvedValue(null);

      await expect(
        service.update(boardId, listId, { title: 'New' }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the list and emits LIST_UPDATED', async () => {
      const list = { id: listId, title: 'New' };
      prisma.list.update.mockResolvedValue(list as never);

      const result = await service.update(
        boardId,
        listId,
        { title: 'New' },
        actorId,
      );

      expect(result).toBe(list);
      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.LIST_UPDATED, {
        boardId,
        list,
        actorId,
      });
    });
  });

  describe('move (same board, by neighbors)', () => {
    it('throws when the list does not belong to the board', async () => {
      prisma.list.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.move(boardId, listId, { afterId: 'list-2' }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when neither beforeId, afterId, nor position is given', async () => {
      await expect(
        service.move(boardId, listId, {}, actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when beforeId order is not less than afterId order', async () => {
      prisma.list.findUnique
        .mockResolvedValueOnce({ boardId } as never) // ensureListInBoard
        .mockResolvedValueOnce({ boardId, order: 2000 } as never) // beforeId neighbor
        .mockResolvedValueOnce({ boardId, order: 1000 } as never); // afterId neighbor

      await expect(
        service.move(
          boardId,
          listId,
          { beforeId: 'list-before', afterId: 'list-after' },
          actorId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('averages the order between valid beforeId and afterId neighbors', async () => {
      prisma.list.findUnique
        .mockResolvedValueOnce({ boardId } as never)
        .mockResolvedValueOnce({ boardId, order: 1000 } as never)
        .mockResolvedValueOnce({ boardId, order: 2000 } as never);
      prisma.list.update.mockResolvedValue({
        id: listId,
        order: 1500,
      } as never);

      await service.move(
        boardId,
        listId,
        { beforeId: 'list-before', afterId: 'list-after' },
        actorId,
      );

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { order: 1500 },
      });
    });

    it('places the list 1000 after beforeId when only beforeId is given', async () => {
      prisma.list.findUnique
        .mockResolvedValueOnce({ boardId } as never)
        .mockResolvedValueOnce({ boardId, order: 2000 } as never);
      prisma.list.update.mockResolvedValue({
        id: listId,
        order: 3000,
      } as never);

      await service.move(boardId, listId, { beforeId: 'list-before' }, actorId);

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { order: 3000 },
      });
    });

    it('rejects when beforeId/afterId is the list being moved', async () => {
      prisma.list.findUnique.mockResolvedValueOnce({ boardId } as never);

      await expect(
        service.move(boardId, listId, { afterId: listId }, actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the neighbor list is in a different board', async () => {
      prisma.list.findUnique
        .mockResolvedValueOnce({ boardId } as never)
        .mockResolvedValueOnce({
          boardId: 'other-board',
          order: 2000,
        } as never);

      await expect(
        service.move(boardId, listId, { afterId: 'list-x' }, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('emits LIST_MOVED with the updated position', async () => {
      prisma.list.findUnique
        .mockResolvedValueOnce({ boardId } as never)
        .mockResolvedValueOnce({ boardId, order: 2000 } as never);
      const updated = { id: listId, order: 3000 };
      prisma.list.update.mockResolvedValue(updated as never);

      await service.move(boardId, listId, { beforeId: 'list-before' }, actorId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.LIST_MOVED, {
        boardId,
        listId: updated.id,
        order: updated.order,
        actorId,
      });
    });
  });

  describe('move (same board, by position)', () => {
    it('places the list at the very start when position resolves to index 0', async () => {
      prisma.list.findMany.mockResolvedValue([
        { order: 1000 },
        { order: 2000 },
      ] as never);
      prisma.list.update.mockResolvedValue({ id: listId, order: 0 } as never);

      await service.move(boardId, listId, { position: 1 }, actorId);

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { order: 0 },
      });
    });

    it('places the list at the very end when position is past the last item', async () => {
      prisma.list.findMany.mockResolvedValue([
        { order: 1000 },
        { order: 2000 },
      ] as never);
      prisma.list.update.mockResolvedValue({
        id: listId,
        order: 3000,
      } as never);

      await service.move(boardId, listId, { position: 99 }, actorId);

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { order: 3000 },
      });
    });

    it('starts an empty board at order 1000', async () => {
      prisma.list.findMany.mockResolvedValue([] as never);
      prisma.list.update.mockResolvedValue({
        id: listId,
        order: 1000,
      } as never);

      await service.move(boardId, listId, { position: 1 }, actorId);

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { order: 1000 },
      });
    });
  });

  describe('moveAllCards', () => {
    it('rejects moving cards into the same list', async () => {
      await expect(
        service.moveAllCards(
          boardId,
          listId,
          { targetListId: listId },
          actorId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the target list does not belong to the board', async () => {
      prisma.list.findUnique
        .mockResolvedValueOnce({ boardId } as never) // source list
        .mockResolvedValueOnce(null); // target list

      await expect(
        service.moveAllCards(
          boardId,
          listId,
          { targetListId: 'list-2' },
          actorId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('moves every card to the target list with incrementing order', async () => {
      prisma.card.findMany.mockResolvedValue([
        { id: 'card-1' },
        { id: 'card-2' },
      ] as never);
      prisma.card.findFirst.mockResolvedValue({ order: 2000 } as never);
      prisma.list.findUniqueOrThrow
        .mockResolvedValueOnce({ id: listId } as never)
        .mockResolvedValueOnce({ id: 'list-2' } as never);

      const result = await service.moveAllCards(
        boardId,
        listId,
        { targetListId: 'list-2' },
        actorId,
      );

      expect(result).toEqual({ movedCount: 2 });
      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { listId: 'list-2', order: 3000 },
      });
      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-2' },
        data: { listId: 'list-2', order: 4000 },
      });
    });
  });

  describe('remove', () => {
    it('throws when the list does not belong to the board', async () => {
      prisma.list.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(boardId, listId, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.list.delete).not.toHaveBeenCalled();
    });

    it('deletes the list and emits LIST_DELETED', async () => {
      const result = await service.remove(boardId, listId, actorId);

      expect(result).toEqual({ id: listId });
      expect(prisma.list.delete).toHaveBeenCalledWith({
        where: { id: listId },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(APP_EVENT.LIST_DELETED, {
        boardId,
        listId,
        actorId,
      });
    });
  });
});
