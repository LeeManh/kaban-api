import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  @Patch('me/password')
  @ResponseMessage('Đổi mật khẩu thành công')
  changePassword(
    @GetUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }
}
