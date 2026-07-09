import { Controller, Get, Param, Post } from '@nestjs/common';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Public()
  @Get(':token')
  @ResponseMessage('Lấy thông tin lời mời thành công')
  preview(@Param('token') token: string) {
    return this.invitesService.preview(token);
  }

  @Post(':token/accept')
  @ResponseMessage('Tham gia board thành công')
  accept(
    @Param('token') token: string,
    @GetUser('sub') userId: string,
    @GetUser('email') userEmail: string,
  ) {
    return this.invitesService.accept(token, userId, userEmail);
  }
}
