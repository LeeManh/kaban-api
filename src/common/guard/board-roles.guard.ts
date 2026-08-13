import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from 'generated/prisma/enums';
import { JwtPayload } from 'src/auth/types/jwt-payload.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_LEVEL: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

const ROLE_CACHE_TTL_SECONDS = 10;

interface CachedBoardAccess {
  ownerId: string;
  role: Role | null;
}

@Injectable()
export class BoardRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload; boardRole?: Role }>();
    const userId = request.user?.sub;
    if (!userId) throw new ForbiddenException('Không xác định được người dùng');

    const boardId = this.extractBoardId(request);
    if (!boardId)
      throw new ForbiddenException('Không xác định được board từ request');

    const access = await this.resolveBoardAccess(boardId, userId);
    if (!access) throw new ForbiddenException('Không tìm thấy board');

    if (access.ownerId === userId) {
      request.boardRole = Role.OWNER;
      return true;
    }

    if (!access.role)
      throw new ForbiddenException('Bạn không phải thành viên của board này');

    const minRequired = Math.min(...required.map((r) => ROLE_LEVEL[r]));
    if (ROLE_LEVEL[access.role] < minRequired)
      throw new ForbiddenException(
        'Bạn không đủ quyền thực hiện hành động này',
      );

    request.boardRole = access.role;
    return true;
  }

  private async resolveBoardAccess(
    boardId: string,
    userId: string,
  ): Promise<CachedBoardAccess | null> {
    const cacheKey = `board:role:${boardId}:${userId}`;
    const cached = await this.redis.getJson<CachedBoardAccess>(cacheKey);
    if (cached) return cached;

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        ownerId: true,
        members: { where: { userId }, select: { role: true } },
      },
    });
    if (!board) return null;

    const access: CachedBoardAccess = {
      ownerId: board.ownerId,
      role: board.members[0]?.role ?? null,
    };
    await this.redis.setJson(cacheKey, access, ROLE_CACHE_TTL_SECONDS);

    return access;
  }

  private extractBoardId(req: Request): string | undefined {
    return (
      (req.params?.boardId as string) ??
      req.params?.id ??
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (req.body?.boardId as string) ??
      (req.query?.boardId as string)
    );
  }
}
