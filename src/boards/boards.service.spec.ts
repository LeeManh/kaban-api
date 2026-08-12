import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CardsService } from '../cards/cards.service';
import { APP_EVENT } from '../events/events.constants';
import { BoardsService } from './boards.service';

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: DeepMockProxy<PrismaService>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const boardId = 'board-1';

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    eventEmitter = { emit: jest.fn() };

    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (tx: typeof prisma) => unknown)(
        prisma,
      ) as Promise<unknown>;
    });
    prisma.card.findMany.mockResolvedValue([]);

    service = new BoardsService(
      prisma,
      {} as unknown as StorageService,
      eventEmitter as unknown as EventEmitter2,
      {} as unknown as CardsService,
    );
  });

  describe('create', () => {
    it('creates the board and adds the creator as OWNER', async () => {
      prisma.board.create.mockResolvedValue({
        id: boardId,
        name: 'My Board',
      } as never);

      const result = await service.create('user-1', {
        name: 'My Board',
        background: '#fff',
      });

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: { name: 'My Board', background: '#fff', ownerId: 'user-1' },
      });
      expect(prisma.boardMember.create).toHaveBeenCalledWith({
        data: { boardId, userId: 'user-1', role: Role.OWNER },
      });
      expect(result).toEqual({ id: boardId, name: 'My Board' });
    });
  });

  describe('update', () => {
    it('throws when the board does not exist', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.update(boardId, { name: 'New name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the board when it exists', async () => {
      prisma.board.findUnique.mockResolvedValue({ id: boardId } as never);
      prisma.board.update.mockResolvedValue({
        id: boardId,
        name: 'New name',
      } as never);

      const result = await service.update(boardId, { name: 'New name' });

      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: boardId },
        data: { name: 'New name' },
      });
      expect(result).toEqual({ id: boardId, name: 'New name' });
    });
  });

  describe('remove', () => {
    it('throws when the board does not exist', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.remove(boardId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.board.delete).not.toHaveBeenCalled();
    });

    it('deletes the board and returns its id', async () => {
      prisma.board.findUnique.mockResolvedValue({ id: boardId } as never);

      const result = await service.remove(boardId);

      expect(result).toEqual({ id: boardId });
      expect(prisma.board.delete).toHaveBeenCalledWith({
        where: { id: boardId },
      });
    });
  });

  describe('addMember', () => {
    beforeEach(() => {
      prisma.board.findUnique.mockResolvedValue({ id: boardId } as never);
    });

    it('rejects assigning the OWNER role directly', async () => {
      await expect(
        service.addMember(boardId, { email: 'a@b.com', role: Role.OWNER }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when no user exists with that email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(boardId, { email: 'a@b.com' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when the user is already a member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' } as never);
      prisma.boardMember.findUnique.mockResolvedValue({
        userId: 'user-2',
      } as never);

      await expect(
        service.addMember(boardId, { email: 'a@b.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.boardMember.create).not.toHaveBeenCalled();
    });

    it('defaults to the MEMBER role when none is given', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' } as never);
      prisma.boardMember.findUnique.mockResolvedValue(null);
      prisma.boardMember.create.mockResolvedValue({
        role: Role.MEMBER,
        user: { id: 'user-2', name: 'Bob', email: 'a@b.com', avatar: null },
      } as never);

      await service.addMember(boardId, { email: 'a@b.com' });

      expect(prisma.boardMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { boardId, userId: 'user-2', role: Role.MEMBER },
        }),
      );
    });
  });

  describe('updateMemberRole', () => {
    const targetUserId = 'user-2';
    const callerId = 'user-1';

    beforeEach(() => {
      prisma.board.findUnique.mockResolvedValue({ id: boardId } as never);
    });

    it('rejects assigning the OWNER role through this endpoint', async () => {
      await expect(
        service.updateMemberRole(
          boardId,
          targetUserId,
          { role: Role.OWNER },
          callerId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the target is not a board member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(
          boardId,
          targetUserId,
          { role: Role.ADMIN },
          callerId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects changing the role of the OWNER', async () => {
      prisma.boardMember.findUnique.mockResolvedValue({
        role: Role.OWNER,
      } as never);

      await expect(
        service.updateMemberRole(
          boardId,
          targetUserId,
          { role: Role.ADMIN },
          callerId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-owner caller promoting someone to ADMIN', async () => {
      prisma.boardMember.findUnique
        .mockResolvedValueOnce({ role: Role.MEMBER } as never) // target
        .mockResolvedValueOnce({ role: Role.MEMBER } as never); // caller

      await expect(
        service.updateMemberRole(
          boardId,
          targetUserId,
          { role: Role.ADMIN },
          callerId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a non-owner caller demoting an existing ADMIN', async () => {
      prisma.boardMember.findUnique
        .mockResolvedValueOnce({ role: Role.ADMIN } as never) // target
        .mockResolvedValueOnce({ role: Role.MEMBER } as never); // caller

      await expect(
        service.updateMemberRole(
          boardId,
          targetUserId,
          { role: Role.MEMBER },
          callerId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows the OWNER to promote a member to ADMIN', async () => {
      prisma.boardMember.findUnique
        .mockResolvedValueOnce({ role: Role.MEMBER } as never) // target
        .mockResolvedValueOnce({ role: Role.OWNER } as never); // caller
      prisma.boardMember.update.mockResolvedValue({
        role: Role.ADMIN,
        user: { id: targetUserId, name: 'Bob', email: 'a@b.com', avatar: null },
      } as never);

      const result = await service.updateMemberRole(
        boardId,
        targetUserId,
        { role: Role.ADMIN },
        callerId,
      );

      expect(result.role).toBe(Role.ADMIN);
    });

    it('allows a non-owner caller to change MEMBER/VIEWER without touching ADMIN', async () => {
      prisma.boardMember.findUnique
        .mockResolvedValueOnce({ role: Role.MEMBER } as never) // target
        .mockResolvedValueOnce({ role: Role.MEMBER } as never); // caller
      prisma.boardMember.update.mockResolvedValue({
        role: Role.VIEWER,
        user: { id: targetUserId, name: 'Bob', email: 'a@b.com', avatar: null },
      } as never);

      const result = await service.updateMemberRole(
        boardId,
        targetUserId,
        { role: Role.VIEWER },
        callerId,
      );

      expect(result.role).toBe(Role.VIEWER);
    });
  });

  describe('removeMember', () => {
    const targetUserId = 'user-2';
    const callerId = 'user-1';

    beforeEach(() => {
      prisma.board.findUnique.mockResolvedValue({ id: boardId } as never);
    });

    it('throws when the target is not a board member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(boardId, targetUserId, callerId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects removing the OWNER', async () => {
      prisma.boardMember.findUnique.mockResolvedValue({
        role: Role.OWNER,
      } as never);

      await expect(
        service.removeMember(boardId, targetUserId, callerId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-owner caller removing an ADMIN', async () => {
      prisma.boardMember.findUnique
        .mockResolvedValueOnce({ role: Role.ADMIN } as never) // target
        .mockResolvedValueOnce({ role: Role.MEMBER } as never); // caller

      await expect(
        service.removeMember(boardId, targetUserId, callerId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('removes the member and emits BOARD_MEMBER_REMOVED', async () => {
      prisma.boardMember.findUnique
        .mockResolvedValueOnce({ role: Role.MEMBER } as never) // target
        .mockResolvedValueOnce({ role: Role.OWNER } as never); // caller

      const result = await service.removeMember(
        boardId,
        targetUserId,
        callerId,
      );

      expect(result).toEqual({ boardId, userId: targetUserId });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        APP_EVENT.BOARD_MEMBER_REMOVED,
        { boardId, userId: targetUserId },
      );
    });
  });

  describe('leaveBoard', () => {
    it('throws when the caller is not a board member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.leaveBoard(boardId, 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects the OWNER leaving the board', async () => {
      prisma.boardMember.findUnique.mockResolvedValue({
        role: Role.OWNER,
      } as never);

      await expect(
        service.leaveBoard(boardId, 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets a non-owner member leave the board', async () => {
      prisma.boardMember.findUnique.mockResolvedValue({
        role: Role.MEMBER,
      } as never);

      const result = await service.leaveBoard(boardId, 'user-1');

      expect(result).toEqual({ boardId, userId: 'user-1' });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        APP_EVENT.BOARD_MEMBER_REMOVED,
        { boardId, userId: 'user-1' },
      );
    });
  });

  describe('transferOwnership', () => {
    it('rejects transferring ownership to yourself', async () => {
      await expect(
        service.transferOwnership(boardId, { newOwnerId: 'user-1' }, 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the new owner is not a board member', async () => {
      prisma.boardMember.findUnique.mockResolvedValue(null);

      await expect(
        service.transferOwnership(boardId, { newOwnerId: 'user-2' }, 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('demotes the caller to ADMIN and promotes the target to OWNER', async () => {
      prisma.boardMember.findUnique.mockResolvedValue({
        userId: 'user-2',
      } as never);

      const result = await service.transferOwnership(
        boardId,
        { newOwnerId: 'user-2' },
        'user-1',
      );

      expect(prisma.boardMember.update).toHaveBeenCalledWith({
        where: { boardId_userId: { boardId, userId: 'user-1' } },
        data: { role: Role.ADMIN },
      });
      expect(prisma.boardMember.update).toHaveBeenCalledWith({
        where: { boardId_userId: { boardId, userId: 'user-2' } },
        data: { role: Role.OWNER },
      });
      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: boardId },
        data: { ownerId: 'user-2' },
      });
      expect(result).toEqual({ boardId, ownerId: 'user-2' });
    });
  });
});
