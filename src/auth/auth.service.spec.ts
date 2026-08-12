import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { APP_EVENT } from '../events/events.constants';
import { InvitesService } from '../invites/invites.service';
import { InviteLinksService } from '../invites/invite-links.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

const anyDate = () => expect.any(Date) as unknown as Date;
const anyString = () => expect.any(String) as unknown as string;
const stringContaining = (substring: string) =>
  expect.stringContaining(substring) as unknown as string;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwt: jest.Mocked<
    Pick<JwtService, 'verifyAsync' | 'signAsync' | 'decode'>
  >;
  let redis: jest.Mocked<
    Pick<
      RedisService,
      'blacklist' | 'isBlacklisted' | 'storeResetToken' | 'consumeResetToken'
    >
  >;
  let invites: jest.Mocked<Pick<InvitesService, 'accept'>>;
  let inviteLinks: jest.Mocked<Pick<InviteLinksService, 'join'>>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let mailQueue: jest.Mocked<Pick<Queue, 'add'>>;

  const jwtCfg = {
    accessSecret: 'access-secret',
    accessExpiresIn: '15m',
    refreshSecret: 'refresh-secret',
    refreshExpiresIn: '7d',
    refreshRememberExpiresIn: '30d',
  };
  const appCfg = { frontendUrl: 'https://app.example.com' };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    jwt = { verifyAsync: jest.fn(), signAsync: jest.fn(), decode: jest.fn() };
    redis = {
      blacklist: jest.fn(),
      isBlacklisted: jest.fn(),
      storeResetToken: jest.fn(),
      consumeResetToken: jest.fn(),
    };
    invites = { accept: jest.fn() };
    inviteLinks = { join: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    mailQueue = { add: jest.fn() };

    jwt.signAsync.mockResolvedValue('signed-token');
    jwt.decode.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      jwtCfg as never,
      appCfg as never,
      redis as unknown as RedisService,
      invites as unknown as InvitesService,
      inviteLinks as unknown as InviteLinksService,
      eventEmitter as unknown as EventEmitter2,
      mailQueue as unknown as Queue,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password, creates the user and issues tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'a@b.com', password: 'hashed-password' },
      });
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('still returns tokens even when accepting the invite fails', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
      });
      invites.accept.mockRejectedValue(new Error('invite expired'));

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
        inviteToken: 'invite-1',
      });

      expect(invites.accept).toHaveBeenCalledWith(
        'invite-1',
        'user-1',
        'a@b.com',
      );
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues tokens using the short-lived expiry when rememberMe is false', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        email: 'a@b.com',
        password: 'password123',
        rememberMe: false,
      });

      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: false }),
        expect.objectContaining({ expiresIn: jwtCfg.refreshExpiresIn }),
      );
    });

    it('issues tokens using the remember-me expiry when rememberMe is true', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        email: 'a@b.com',
        password: 'password123',
        rememberMe: true,
      });

      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
        expect.objectContaining({
          expiresIn: jwtCfg.refreshRememberExpiresIn,
        }),
      );
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      prisma.$transaction.mockImplementation(
        (cb: (tx: typeof prisma) => unknown) => cb(prisma),
      );
    });

    it('throws when the refresh token fails verification', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when no matching refresh token is stored', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('good-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when the stored refresh token was already revoked', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100_000),
      });

      await expect(service.refresh('good-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when the stored refresh token has expired', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('good-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('revokes the old token and issues a new pair on success', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        rememberMe: false,
      });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100_000),
      });

      const result = await service.refresh('good-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: anyDate() },
      });
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });
  });

  describe('logout', () => {
    it('revokes the matching refresh token', async () => {
      await service.logout({ sub: 'user-1', email: 'a@b.com' }, 'rt-raw');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: anyString(), revokedAt: null },
        data: { revokedAt: anyDate() },
      });
    });

    it('blacklists the access token when jti and exp are present', async () => {
      await service.logout(
        { sub: 'user-1', email: 'a@b.com', jti: 'jti-1', exp: 999999 },
        'rt-raw',
      );

      expect(redis.blacklist).toHaveBeenCalledWith('jti-1', 999999);
    });

    it('skips blacklisting when jti or exp is missing', async () => {
      await service.logout({ sub: 'user-1', email: 'a@b.com' }, 'rt-raw');

      expect(redis.blacklist).not.toHaveBeenCalled();
    });

    it('emits USER_LOGGED_OUT with the user id and jti', async () => {
      await service.logout(
        { sub: 'user-1', email: 'a@b.com', jti: 'jti-1' },
        'rt-raw',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        APP_EVENT.USER_LOGGED_OUT,
        { userId: 'user-1', jti: 'jti-1' },
      );
    });
  });

  describe('forgotPassword', () => {
    it('stores a reset token and queues an email when the user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
      });

      await service.forgotPassword({ email: 'a@b.com' });

      expect(redis.storeResetToken).toHaveBeenCalledWith(
        anyString(),
        'user-1',
        1800,
      );
      expect(mailQueue.add).toHaveBeenCalledWith(
        'password-reset',
        expect.objectContaining({
          to: 'a@b.com',
          resetUrl: stringContaining(
            'https://app.example.com/reset-password?token=',
          ),
        }),
      );
    });

    it('does not store a token or send an email when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword({ email: 'unknown@b.com' });

      expect(redis.storeResetToken).not.toHaveBeenCalled();
      expect(mailQueue.add).not.toHaveBeenCalled();
    });

    it('returns the same generic message whether or not the user exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'a@b.com',
      });
      const foundResult = await service.forgotPassword({ email: 'a@b.com' });

      prisma.user.findUnique.mockResolvedValueOnce(null);
      const notFoundResult = await service.forgotPassword({
        email: 'unknown@b.com',
      });

      expect(foundResult).toEqual(notFoundResult);
    });
  });

  describe('resetPassword', () => {
    it('throws when the reset token is invalid or expired', async () => {
      redis.consumeResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: 'newpass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the password and revokes all sessions on success', async () => {
      redis.consumeResetToken.mockResolvedValue('user-1');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword({
        token: 'good-token',
        newPassword: 'newpass1',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new-hashed-password' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: anyDate() },
      });
      expect(result).toEqual({ message: 'Đặt lại mật khẩu thành công' });
    });
  });
});
