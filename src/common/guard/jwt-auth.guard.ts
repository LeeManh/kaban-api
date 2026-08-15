import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from 'src/auth/types/jwt-payload.type';
import { jwtConfig } from 'src/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';

const TOKEN_VERSION_CACHE_TTL_SECONDS = 30;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractToken(request);
    if (!token)
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.jwtCfg.accessSecret,
      });

      const [blacklisted, currentTokenVersion] = await Promise.all([
        payload.jti ? this.redis.isBlacklisted(payload.jti) : false,
        this.resolveTokenVersion(payload.sub),
      ]);

      if (blacklisted)
        throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');

      if (
        currentTokenVersion === null ||
        payload.tokenVersion !== currentTokenVersion
      )
        throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');

      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    return true;
  }

  private async resolveTokenVersion(userId: string): Promise<number | null> {
    const cached = await this.redis.getTokenVersion(userId);
    if (cached !== null) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!user) return null;

    await this.redis.setTokenVersion(
      userId,
      user.tokenVersion,
      TOKEN_VERSION_CACHE_TTL_SECONDS,
    );
    return user.tokenVersion;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
