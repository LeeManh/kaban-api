import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { SOCKET_EVENT } from './events.constants';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwt: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let blacklist: jest.Mocked<Pick<RedisService, 'isBlacklisted'>>;
  let prisma: { boardMember: { findUnique: jest.Mock } };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let toEmit: jest.Mock;
  let toFn: jest.Mock;
  let inFetchSockets: jest.Mock;
  let inFn: jest.Mock;

  const jwtCfg = { accessSecret: 'access-secret' };

  const createSocket = (overrides: Partial<Socket> = {}): Socket =>
    ({
      id: 'socket-1',
      handshake: { auth: {}, query: {} },
      data: {},
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      ...overrides,
    }) as unknown as Socket;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    jwt = { verifyAsync: jest.fn() };
    blacklist = { isBlacklisted: jest.fn() };
    prisma = { boardMember: { findUnique: jest.fn() } };

    toEmit = jest.fn();
    toFn = jest.fn(() => ({ emit: toEmit }));
    inFetchSockets = jest.fn();
    inFn = jest.fn(() => ({ fetchSockets: inFetchSockets }));

    gateway = new EventsGateway(
      jwt as unknown as JwtService,
      jwtCfg as never,
      blacklist as unknown as RedisService,
      prisma as unknown as PrismaService,
    );
    gateway.server = { to: toFn, in: inFn } as unknown as Server;
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('handleConnection', () => {
    it('disconnects the client when no token is provided', async () => {
      const client = createSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('disconnects the client when the token fails verification', async () => {
      const client = createSocket({
        handshake: { auth: { token: 'bad-token' }, query: {} } as never,
      });
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects the client when the token jti is blacklisted', async () => {
      const client = createSocket({
        handshake: { auth: { token: 'good-token' }, query: {} } as never,
      });
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });
      blacklist.isBlacklisted.mockResolvedValue(true);

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('joins the user room and stores identity on the socket for a valid token', async () => {
      const client = createSocket({
        handshake: {
          auth: { token: 'Bearer good-token' },
          query: {},
        } as never,
      });
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });
      blacklist.isBlacklisted.mockResolvedValue(false);

      await gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith('user_user-1');
      expect(client.data).toEqual({ userId: 'user-1', jti: 'jti-1' });
    });
  });

  describe('joinBoard', () => {
    it('rejects when the socket has no authenticated user', async () => {
      const client = createSocket({ data: {} });

      const result = await gateway.joinBoard(client, { boardId: 'board-1' });

      expect(result).toEqual({ ok: false, error: 'invalid_payload' });
    });

    it('rejects when no boardId is given', async () => {
      const client = createSocket({ data: { userId: 'user-1' } as never });

      const result = await gateway.joinBoard(client, {});

      expect(result).toEqual({ ok: false, error: 'invalid_payload' });
    });

    it('rejects when the user is not a board member', async () => {
      const client = createSocket({ data: { userId: 'user-1' } as never });
      prisma.boardMember.findUnique.mockResolvedValue(null);

      const result = await gateway.joinBoard(client, { boardId: 'board-1' });

      expect(result).toEqual({ ok: false, error: 'forbidden' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('joins the board room when the user is a member', async () => {
      const client = createSocket({ data: { userId: 'user-1' } as never });
      prisma.boardMember.findUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await gateway.joinBoard(client, { boardId: 'board-1' });

      expect(client.join).toHaveBeenCalledWith('board_board-1');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('leaveBoard', () => {
    it('leaves the board room when a boardId is given', () => {
      const client = createSocket();

      const result = gateway.leaveBoard(client, { boardId: 'board-1' });

      expect(client.leave).toHaveBeenCalledWith('board_board-1');
      expect(result).toEqual({ ok: true });
    });

    it('does nothing when no boardId is given', () => {
      const client = createSocket();

      const result = gateway.leaveBoard(client, {});

      expect(client.leave).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });

  describe('event broadcasting', () => {
    it('broadcasts CARD_CREATED to the board room', () => {
      const payload = {
        boardId: 'board-1',
        card: { id: 'card-1' },
        actorId: 'user-1',
      };

      gateway.handleCardCreated(payload as never);

      expect(toFn).toHaveBeenCalledWith('board_board-1');
      expect(toEmit).toHaveBeenCalledWith(SOCKET_EVENT.CARD_CREATED, payload);
    });

    it('broadcasts CARD_MOVED to the board room', () => {
      const payload = {
        boardId: 'board-1',
        cardId: 'card-1',
        listId: 'list-1',
        order: 1000,
        actorId: 'user-1',
      };

      gateway.handleCardMoved(payload);

      expect(toFn).toHaveBeenCalledWith('board_board-1');
      expect(toEmit).toHaveBeenCalledWith(SOCKET_EVENT.CARD_MOVED, payload);
    });

    it('emits NOTIFICATION_CREATED to the recipient user room', () => {
      const payload = { notification: { id: 'notif-1', userId: 'user-1' } };

      gateway.handleNotificationCreated(payload as never);

      expect(toFn).toHaveBeenCalledWith('user_user-1');
      expect(toEmit).toHaveBeenCalledWith(
        SOCKET_EVENT.NOTIFICATION_CREATED,
        payload.notification,
      );
    });
  });

  describe('handleUserLoggedOut', () => {
    it('disconnects only sockets matching the logged-out jti', async () => {
      const matching = createSocket({ data: { jti: 'jti-1' } as never });
      const other = createSocket({ data: { jti: 'jti-2' } as never });
      inFetchSockets.mockResolvedValue([matching, other]);

      await gateway.handleUserLoggedOut({ userId: 'user-1', jti: 'jti-1' });

      expect(inFn).toHaveBeenCalledWith('user_user-1');
      expect(matching.disconnect).toHaveBeenCalledWith(true);
      expect(other.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects every socket when no jti is given (logout-all)', async () => {
      const a = createSocket({ data: { jti: 'jti-1' } as never });
      const b = createSocket({ data: { jti: 'jti-2' } as never });
      inFetchSockets.mockResolvedValue([a, b]);

      await gateway.handleUserLoggedOut({ userId: 'user-1' });

      expect(a.disconnect).toHaveBeenCalledWith(true);
      expect(b.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleBoardMemberRemoved', () => {
    it('removes only the matching user from the board room', async () => {
      const matching = createSocket({ data: { userId: 'user-1' } as never });
      const other = createSocket({ data: { userId: 'user-2' } as never });
      inFetchSockets.mockResolvedValue([matching, other]);

      await gateway.handleBoardMemberRemoved({
        boardId: 'board-1',
        userId: 'user-1',
      });

      expect(inFn).toHaveBeenCalledWith('board_board-1');
      expect(matching.leave).toHaveBeenCalledWith('board_board-1');
      expect(matching.emit).toHaveBeenCalledWith(
        SOCKET_EVENT.BOARD_MEMBER_REMOVED,
        { boardId: 'board-1' },
      );
      expect(other.leave).not.toHaveBeenCalled();
      expect(other.emit).not.toHaveBeenCalled();
    });
  });
});
