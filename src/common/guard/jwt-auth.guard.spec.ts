import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let blacklist: jest.Mocked<Pick<RedisService, 'isBlacklisted'>>;

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
    blacklist = { isBlacklisted: jest.fn() };

    guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      { accessSecret: 'test-secret' } as never,
      reflector as unknown as Reflector,
      blacklist as unknown as RedisService,
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
      jti: 'jti-1',
    });
    blacklist.isBlacklisted.mockResolvedValue(true);
    const context = createContext({
      headers: { authorization: 'Bearer good-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(blacklist.isBlacklisted).toHaveBeenCalledWith('jti-1');
  });

  it('allows access and attaches the payload to the request for a valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const payload = { sub: 'user-1', email: 'a@b.com', jti: 'jti-1' };
    jwt.verifyAsync.mockResolvedValue(payload);
    blacklist.isBlacklisted.mockResolvedValue(false);
    const request: Partial<Request> & { user?: unknown } = {
      headers: { authorization: 'Bearer good-token' },
    };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('skips the blacklist check when the payload has no jti', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });
    const context = createContext({
      headers: { authorization: 'Bearer good-token' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(blacklist.isBlacklisted).not.toHaveBeenCalled();
  });
});
