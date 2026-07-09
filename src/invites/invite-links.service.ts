import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  InviteLinkPermission,
  JoinRequestStatus,
  NotificationType,
  Role,
} from 'generated/prisma/enums';
import { appConfig } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInviteLinkDto } from './dto/create-invite-link.dto';
import { UpdateInviteLinkDto } from './dto/update-invite-link.dto';
import { DecideJoinRequestDto } from './dto/decide-join-request.dto';

@Injectable()
export class InviteLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {}

  async create(boardId: string, creatorId: string, dto: CreateInviteLinkDto) {
    if (dto.role === Role.OWNER)
      throw new BadRequestException(
        'Không thể đặt OWNER làm quyền mặc định của invite link',
      );

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });
    if (!board) throw new NotFoundException('Không tìm thấy board');

    await this.prisma.boardInviteLink.deleteMany({ where: { boardId } });

    const token = randomBytes(24).toString('hex');
    const link = await this.prisma.boardInviteLink.create({
      data: {
        boardId,
        token,
        role: dto.role ?? Role.MEMBER,
        permission: dto.permission ?? InviteLinkPermission.OPEN,
        createdById: creatorId,
      },
    });

    return this.toResponse(link);
  }

  async get(boardId: string) {
    const link = await this.getLinkForBoard(boardId);
    return this.toResponse(link);
  }

  async update(boardId: string, dto: UpdateInviteLinkDto) {
    if (dto.role === Role.OWNER)
      throw new BadRequestException(
        'Không thể đặt OWNER làm quyền mặc định của invite link',
      );

    const link = await this.getLinkForBoard(boardId);
    const updated = await this.prisma.boardInviteLink.update({
      where: { id: link.id },
      data: { role: dto.role, permission: dto.permission },
    });
    return this.toResponse(updated);
  }

  async revoke(boardId: string) {
    await this.getLinkForBoard(boardId);
    await this.prisma.boardInviteLink.deleteMany({ where: { boardId } });
    return { boardId };
  }

  async preview(token: string) {
    const link = await this.getLinkByToken(token);
    const board = await this.prisma.board.findUnique({
      where: { id: link.boardId },
      select: { name: true },
    });
    return { boardName: board?.name ?? '', permission: link.permission };
  }

  async join(token: string, userId: string) {
    const link = await this.getLinkByToken(token);

    const existingMember = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: link.boardId, userId } },
      select: { userId: true },
    });
    if (existingMember)
      throw new ConflictException('Bạn đã là thành viên của board này');

    if (link.permission === InviteLinkPermission.OPEN) {
      await this.prisma.boardMember.create({
        data: { boardId: link.boardId, userId, role: link.role },
      });
      return { status: 'joined' as const, boardId: link.boardId };
    }

    await this.prisma.boardJoinRequest.upsert({
      where: {
        inviteLinkId_userId: { inviteLinkId: link.id, userId },
      },
      update: { status: JoinRequestStatus.PENDING, decidedAt: null },
      create: {
        inviteLinkId: link.id,
        userId,
        status: JoinRequestStatus.PENDING,
      },
    });

    await this.notifyAdmins(link.boardId, userId);

    return { status: 'pending' as const, boardId: link.boardId };
  }

  async findJoinRequests(boardId: string) {
    const link = await this.getLinkForBoard(boardId);
    return this.prisma.boardJoinRequest.findMany({
      where: { inviteLinkId: link.id, status: JoinRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async decideJoinRequest(
    boardId: string,
    requestId: string,
    dto: DecideJoinRequestDto,
  ) {
    const link = await this.getLinkForBoard(boardId);
    const request = await this.prisma.boardJoinRequest.findFirst({
      where: { id: requestId, inviteLinkId: link.id },
    });
    if (!request)
      throw new NotFoundException('Không tìm thấy yêu cầu tham gia');
    if (request.status !== JoinRequestStatus.PENDING)
      throw new ConflictException('Yêu cầu này đã được xử lý');

    if (dto.status === JoinRequestStatus.APPROVED) {
      const existingMember = await this.prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId: request.userId } },
        select: { userId: true },
      });
      if (!existingMember) {
        await this.prisma.boardMember.create({
          data: { boardId, userId: request.userId, role: link.role },
        });
      }
    }

    return this.prisma.boardJoinRequest.update({
      where: { id: request.id },
      data: { status: dto.status, decidedAt: new Date() },
    });
  }

  private async notifyAdmins(boardId: string, requesterId: string) {
    const [admins, requester, board] = await Promise.all([
      this.prisma.boardMember.findMany({
        where: { boardId, role: { in: [Role.OWNER, Role.ADMIN] } },
        select: { userId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { name: true, email: true },
      }),
      this.prisma.board.findUnique({
        where: { id: boardId },
        select: { name: true },
      }),
    ]);

    const requesterName = requester?.name ?? requester?.email ?? 'Ai đó';
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create({
          userId: admin.userId,
          type: NotificationType.BOARD_INVITATION,
          message: `${requesterName} muốn tham gia board "${board?.name ?? ''}"`,
          link: `/boards/${boardId}/join-requests`,
        }),
      ),
    );
  }

  private async getLinkForBoard(boardId: string) {
    const link = await this.prisma.boardInviteLink.findUnique({
      where: { boardId },
    });
    if (!link) throw new NotFoundException('Board chưa có invite link nào');
    return link;
  }

  private async getLinkByToken(token: string) {
    const link = await this.prisma.boardInviteLink.findUnique({
      where: { token },
    });
    if (!link) throw new NotFoundException('Invite link không hợp lệ');
    return link;
  }

  private toResponse(link: {
    role: Role;
    permission: InviteLinkPermission;
    token: string;
    createdAt: Date;
  }) {
    return {
      role: link.role,
      permission: link.permission,
      joinUrl: `${this.appCfg.frontendUrl}/invite-links/${link.token}`,
      createdAt: link.createdAt,
    };
  }
}
