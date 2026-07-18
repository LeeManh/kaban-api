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
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_LEVEL: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

@Injectable()
export class BoardRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
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

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        ownerId: true,
        members: { where: { userId }, select: { role: true } },
      },
    });
    if (!board) throw new ForbiddenException('Không tìm thấy board');

    if (board.ownerId === userId) {
      request.boardRole = Role.OWNER;
      return true;
    }

    const membership = board.members[0];
    if (!membership)
      throw new ForbiddenException('Bạn không phải thành viên của board này');

    const minRequired = Math.min(...required.map((r) => ROLE_LEVEL[r]));
    if (ROLE_LEVEL[membership.role] < minRequired)
      throw new ForbiddenException(
        'Bạn không đủ quyền thực hiện hành động này',
      );

    request.boardRole = membership.role;
    return true;
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
