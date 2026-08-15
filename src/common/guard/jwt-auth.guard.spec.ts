import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let redis: jest.Mocked<
    Pick<RedisService, 'isBlacklisted' | 'getTokenVersion' | 'setTokenVersion'>
  >;
  let prisma: { user: { findUnique: jest.Mock } };

  const createContext = (request: Partial<Request>): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    redis = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
      getTokenVersion: jest.fn().mockResolvedValue(0),
      setTokenVersion: jest.fn(),
    };
    prisma = { user: { findUnique: jest.fn() } };

    guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      { accessSecret: 'test-secret' } as never,
      reflector as unknown as Reflector,
      redis as unknown as RedisService,
      prisma as unknown as PrismaService,
    );
  });

  it('allows access without checking the token when the route is @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createContext({ headers: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects when no Authorization header is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when the Authorization header is not a Bearer token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createContext({
      headers: { authorization: 'Basic abc123' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when the token fails verification', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const context = createContext({
      headers: { authorization: 'Bearer bad-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when the token jti is blacklisted', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.com',
      tokenVersion: 0,
      jti: 'jti-1',
    });
    redis.isBlacklisted.mockResolvedValue(true);
    const context = createContext({
      headers: { authorization: 'Bearer good-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(redis.isBlacklisted).toHaveBeenCalledWith('jti-1');
  });

  it('rejects when the token version is stale', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.com',
      tokenVersion: 0,
    });
    redis.getTokenVersion.mockResolvedValue(1);
    const context = createContext({
      headers: { authorization: 'Bearer good-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when the user for the token no longer exists', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.com',
      tokenVersion: 0,
    });
    redis.getTokenVersion.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    const context = createContext({
      headers: { authorization: 'Bearer good-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falls back to the database and caches the result when the token version is not cached', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const payload = {
      sub: 'user-1',
      email: 'a@b.com',
      tokenVersion: 2,
      jti: 'jti-1',
    };
    jwt.verifyAsync.mockResolvedValue(payload);
    redis.getTokenVersion.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ tokenVersion: 2 });
    const request: Partial<Request> & { user?: unknown } = {
      headers: { authorization: 'Bearer good-token' },
    };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { tokenVersion: true },
    });
    expect(redis.setTokenVersion).toHaveBeenCalledWith(
      'user-1',
      2,
      expect.any(Number),
    );
    expect(request.user).toEqual(payload);
  });

  it('allows access and attaches the payload to the request for a valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const payload = {
      sub: 'user-1',
      email: 'a@b.com',
      tokenVersion: 0,
      jti: 'jti-1',
    };
    jwt.verifyAsync.mockResolvedValue(payload);
    redis.isBlacklisted.mockResolvedValue(false);
    redis.getTokenVersion.mockResolvedValue(0);
    const request: Partial<Request> & { user?: unknown } = {
      headers: { authorization: 'Bearer good-token' },
    };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('skips the blacklist check when the payload has no jti', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.com',
      tokenVersion: 0,
    });
    redis.getTokenVersion.mockResolvedValue(0);
    const context = createContext({
      headers: { authorization: 'Bearer good-token' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.isBlacklisted).not.toHaveBeenCalled();
  });
});
