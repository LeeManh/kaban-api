import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PresignAvatarDto } from './dto/presign-avatar.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('Lấy profile thành công')
  me(@GetUser('sub') userId: string) {
    return this.usersService.findProfileById(userId);
  }

  @Patch('me')
  @ResponseMessage('Cập nhật thông tin thành công')
  updateMe(@GetUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/avatar/presign')
  @ResponseMessage('Tạo URL upload ảnh đại diện thành công')
  presignAvatar(@GetUser('sub') userId: string, @Body() dto: PresignAvatarDto) {
    return this.usersService.presignAvatar(userId, dto);
  }

  @Patch('me/password')
  @ResponseMessage('Đổi mật khẩu thành công')
  changePassword(
    @GetUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }
}
