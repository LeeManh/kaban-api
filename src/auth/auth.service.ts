import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { appConfig, jwtConfig } from 'src/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { Prisma } from 'generated/prisma/client';
import { RedisService } from 'src/redis/redis.service';
import { MAIL_JOB, MAIL_QUEUE } from 'src/mail/mail.constants';
import type { PasswordResetData } from 'src/mail/mail.types';
import { InvitesService } from '../invites/invites.service';
import { InviteLinksService } from '../invites/invite-links.service';

const RESET_TOKEN_TTL_SECONDS = 30 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
    private readonly redis: RedisService,
    private readonly invites: InvitesService,
    private readonly inviteLinks: InviteLinksService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    const { inviteToken, inviteLinkToken, ...rest } = dto;
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email đã được sử dụng');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...rest, password: passwordHash },
    });

    if (inviteToken)
      await this.tryAcceptInvite(inviteToken, user.id, user.email);
    if (inviteLinkToken) await this.tryJoinInviteLink(inviteLinkToken, user.id);

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    if (dto.inviteToken)
      await this.tryAcceptInvite(dto.inviteToken, user.id, user.email);
    if (dto.inviteLinkToken)
      await this.tryJoinInviteLink(dto.inviteLinkToken, user.id);

    return this.issueTokens(user.id, user.email, dto.rememberMe ?? false);
  }

  private async tryAcceptInvite(token: string, userId: string, email: string) {
    try {
      await this.invites.accept(token, userId, email);
    } catch (err) {
      this.logger.warn(
        `Không thể tự động accept invite: ${(err as Error).message}`,
      );
    }
  }

  private async tryJoinInviteLink(token: string, userId: string) {
    try {
      await this.inviteLinks.join(token, userId);
    } catch (err) {
      this.logger.warn(
        `Không thể tự động join qua invite link: ${(err as Error).message}`,
      );
    }
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.jwtCfg.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      return this.issueTokens(
        payload.sub,
        payload.email,
        payload.rememberMe ?? false,
        tx,
      );
    });
  }

  async logout(user: JwtPayload, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (user.jti && user.exp) {
      await this.redis.blacklist(user.jti, user.exp);
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true },
    });

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      await this.redis.storeResetToken(
        tokenHash,
        user.id,
        RESET_TOKEN_TTL_SECONDS,
      );

      const resetUrl = `${this.appCfg.frontendUrl}/reset-password?token=${rawToken}`;
      await this.mailQueue.add(MAIL_JOB.PASSWORD_RESET, {
        to: user.email,
        resetUrl,
      } satisfies PasswordResetData);
    }

    return {
      message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const userId = await this.redis.consumeResetToken(tokenHash);
    if (!userId)
      throw new UnauthorizedException(
        'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    await this.logoutAll(userId);

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  private async issueTokens(
    userId: string,
    email: string,
    rememberMe = false,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const payload: JwtPayload = { sub: userId, email, rememberMe };
    const refreshExpiresIn = rememberMe
      ? this.jwtCfg.refreshRememberExpiresIn
      : this.jwtCfg.refreshExpiresIn;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.jwtCfg.accessSecret,
        expiresIn: this.jwtCfg.accessExpiresIn,
        jwtid: randomUUID(),
      }),
      this.jwt.signAsync(payload, {
        secret: this.jwtCfg.refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    const decoded = this.jwt.decode<{ exp: number }>(refreshToken);
    await tx.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
