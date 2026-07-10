import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { USER_AVATAR_KEY_PREFIX, withResolvedAvatar } from './user.selects';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PresignAvatarDto } from './dto/presign-avatar.dto';

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findProfileById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return withResolvedAvatar(user, this.storage);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: PROFILE_SELECT,
    });

    return withResolvedAvatar(user, this.storage);
  }

  async presignAvatar(userId: string, dto: PresignAvatarDto) {
    const safeName = dto.filename.replace(/[^\w.-]+/g, '_');
    const key = `${USER_AVATAR_KEY_PREFIX}${userId}/${randomUUID()}-${safeName}`;
    const uploadUrl = await this.storage.getUploadUrl(key, dto.contentType);

    return { key, uploadUrl };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }
}
