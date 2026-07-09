import { Controller, Get, Param, Post } from '@nestjs/common';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { InviteLinksService } from './invite-links.service';

@Controller('invite-links')
export class InviteLinksController {
  constructor(private readonly inviteLinksService: InviteLinksService) {}

  @Public()
  @Get(':token')
  @ResponseMessage('Lấy thông tin invite link thành công')
  preview(@Param('token') token: string) {
    return this.inviteLinksService.preview(token);
  }

  @Post(':token/join')
  @ResponseMessage('Xử lý tham gia board thành công')
  join(@Param('token') token: string, @GetUser('sub') userId: string) {
    return this.inviteLinksService.join(token, userId);
  }
}
