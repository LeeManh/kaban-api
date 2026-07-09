import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type ConfigType } from '@nestjs/config';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';
import { NotificationType, Role } from 'generated/prisma/enums';
import { appConfig } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MAIL_JOB, MAIL_QUEUE } from '../mail/mail.constants';
import type { BoardInvitationData } from '../mail/mail.types';
import { CreateBoardInviteDto } from './dto/create-board-invite.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async create(boardId: string, inviterId: string, dto: CreateBoardInviteDto) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, name: true },
    });
    if (!board) throw new NotFoundException('Không tìm thấy board');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      const member = await this.prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId: existingUser.id } },
        select: { userId: true },
      });
      if (member)
        throw new ConflictException('Người dùng đã là thành viên của board');
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true, email: true },
    });

    await this.prisma.boardInvite.deleteMany({
      where: { boardId, email: dto.email, acceptedAt: null },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const invite = await this.prisma.boardInvite.create({
      data: {
        boardId,
        email: dto.email,
        role: dto.role ?? Role.MEMBER,
        tokenHash,
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    const acceptUrl = `${this.appCfg.frontendUrl}/invites/accept?token=${rawToken}`;
    await this.mailQueue.add(MAIL_JOB.BOARD_INVITATION, {
      to: dto.email,
      boardName: board.name,
      invitedByName: inviter?.name ?? inviter?.email ?? 'Ai đó',
      acceptUrl,
    } satisfies BoardInvitationData);

    if (existingUser) {
      await this.notifications.create({
        userId: existingUser.id,
        type: NotificationType.BOARD_INVITATION,
        message: `${inviter?.name ?? inviter?.email ?? 'Ai đó'} đã mời bạn vào board "${board.name}"`,
        link: `/invites/accept?token=${rawToken}`,
      });
    }

    return { id: invite.id, email: invite.email, role: invite.role };
  }

  async findAllPending(boardId: string) {
    return this.prisma.boardInvite.findMany({
      where: { boardId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revoke(boardId: string, inviteId: string) {
    const invite = await this.prisma.boardInvite.findFirst({
      where: { id: inviteId, boardId },
      select: { id: true },
    });
    if (!invite) throw new NotFoundException('Không tìm thấy lời mời');

    await this.prisma.boardInvite.delete({ where: { id: invite.id } });
    return { id: inviteId };
  }

  async preview(token: string) {
    const invite = await this.getValidInvite(token);
    const board = await this.prisma.board.findUnique({
      where: { id: invite.boardId },
      select: { name: true },
    });
    const inviter = await this.prisma.user.findUnique({
      where: { id: invite.invitedById },
      select: { name: true, email: true },
    });

    return {
      boardName: board?.name ?? '',
      invitedByName: inviter?.name ?? inviter?.email ?? 'Ai đó',
      email: invite.email,
    };
  }

  async accept(token: string, userId: string, userEmail: string) {
    const invite = await this.getValidInvite(token);

    if (invite.email.toLowerCase() !== userEmail.toLowerCase())
      throw new ForbiddenException(
        'Tài khoản đang đăng nhập không khớp với email được mời',
      );

    const existingMember = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: invite.boardId, userId } },
      select: { userId: true },
    });

    if (!existingMember) {
      await this.prisma.boardMember.create({
        data: { boardId: invite.boardId, userId, role: invite.role },
      });
    }

    await this.prisma.boardInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return { boardId: invite.boardId };
  }

  private async getValidInvite(token: string) {
    const tokenHash = this.hashToken(token);
    const invite = await this.prisma.boardInvite.findUnique({
      where: { tokenHash },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date())
      throw new NotFoundException(
        'Lời mời không hợp lệ, đã hết hạn hoặc đã được sử dụng',
      );
    return invite;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
