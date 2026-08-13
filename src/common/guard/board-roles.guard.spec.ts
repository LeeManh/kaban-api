import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { BoardRolesGuard } from './board-roles.guard';

describe('BoardRolesGuard', () => {
  let guard: BoardRolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let prisma: {
    board: { findUnique: jest.Mock };
  };
  let redis: jest.Mocked<Pick<RedisService, 'getJson' | 'setJson'>>;

  const createContext = (request: Partial<Request>): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { board: { findUnique: jest.fn() } };
    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    guard = new BoardRolesGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('allows access when the route has no required roles', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.board.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when there is no authenticated user on the request', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
    const context = createContext({ params: { boardId: 'board-1' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when no boardId can be resolved from the request', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
    const context = createContext({
      user: { sub: 'user-1', email: 'a@b.com' },
      params: {},
      body: {},
      query: {},
    } as never);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when the board does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
    prisma.board.findUnique.mockResolvedValue(null);
    const context = createContext({
      user: { sub: 'user-1', email: 'a@b.com' },
      params: { boardId: 'board-1' },
    } as never);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows the board owner regardless of the required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    prisma.board.findUnique.mockResolvedValue({
      ownerId: 'user-1',
      members: [],
    });
    const request: Partial<Request> & {
      user: { sub: string };
      boardRole?: Role;
    } = {
      user: { sub: 'user-1' },
      params: { boardId: 'board-1' },
    } as never;
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.boardRole).toBe(Role.OWNER);
  });

  it('rejects when the user is not a member of the board', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
    prisma.board.findUnique.mockResolvedValue({
      ownerId: 'owner-x',
      members: [],
    });
    const context = createContext({
      user: { sub: 'user-1', email: 'a@b.com' },
      params: { boardId: 'board-1' },
    } as never);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when the member role is below the required level', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    prisma.board.findUnique.mockResolvedValue({
      ownerId: 'owner-x',
      members: [{ role: Role.VIEWER }],
    });
    const context = createContext({
      user: { sub: 'user-1', email: 'a@b.com' },
      params: { boardId: 'board-1' },
    } as never);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a member whose role meets the required level and attaches boardRole', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
    prisma.board.findUnique.mockResolvedValue({
      ownerId: 'owner-x',
      members: [{ role: Role.ADMIN }],
    });
    const request: Partial<Request> & {
      user: { sub: string };
      boardRole?: Role;
    } = {
      user: { sub: 'user-1' },
      params: { boardId: 'board-1' },
    } as never;
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.boardRole).toBe(Role.ADMIN);
  });

  it('falls back to params.id and then query.boardId when params.boardId is absent', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
    prisma.board.findUnique.mockResolvedValue({
      ownerId: 'user-1',
      members: [],
    });
    const context = createContext({
      user: { sub: 'user-1', email: 'a@b.com' },
      params: {},
      query: { boardId: 'board-from-query' },
    } as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.board.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'board-from-query' } }),
    );
  });

  describe('caching', () => {
    it('uses the cached access without querying the database on a cache hit', async () => {
      reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
      redis.getJson.mockResolvedValue({ ownerId: 'owner-x', role: Role.ADMIN });
      const context = createContext({
        user: { sub: 'user-1', email: 'a@b.com' },
        params: { boardId: 'board-1' },
      } as never);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(prisma.board.findUnique).not.toHaveBeenCalled();
      expect(redis.getJson).toHaveBeenCalledWith('board:role:board-1:user-1');
    });

    it('queries the database and populates the cache on a cache miss', async () => {
      reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
      prisma.board.findUnique.mockResolvedValue({
        ownerId: 'owner-x',
        members: [{ role: Role.ADMIN }],
      });
      const context = createContext({
        user: { sub: 'user-1', email: 'a@b.com' },
        params: { boardId: 'board-1' },
      } as never);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(prisma.board.findUnique).toHaveBeenCalled();
      expect(redis.setJson).toHaveBeenCalledWith(
        'board:role:board-1:user-1',
        { ownerId: 'owner-x', role: Role.ADMIN },
        10,
      );
    });

    it('does not cache when the board does not exist', async () => {
      reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
      prisma.board.findUnique.mockResolvedValue(null);
      const context = createContext({
        user: { sub: 'user-1', email: 'a@b.com' },
        params: { boardId: 'board-1' },
      } as never);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(redis.setJson).not.toHaveBeenCalled();
    });
  });
});
