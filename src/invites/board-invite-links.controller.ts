import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BoardRolesGuard } from '../common/guard/board-roles.guard';
import { InviteLinksService } from './invite-links.service';
import { CreateInviteLinkDto } from './dto/create-invite-link.dto';
import { UpdateInviteLinkDto } from './dto/update-invite-link.dto';
import { DecideJoinRequestDto } from './dto/decide-join-request.dto';

@Controller('boards/:boardId')
@UseGuards(BoardRolesGuard)
export class BoardInviteLinksController {
  constructor(private readonly inviteLinksService: InviteLinksService) {}

  @Post('invite-link')
  @Roles(Role.ADMIN)
  @ResponseMessage('Tạo invite link thành công')
  create(
    @Param('boardId') boardId: string,
    @GetUser('sub') creatorId: string,
    @Body() dto: CreateInviteLinkDto,
  ) {
    return this.inviteLinksService.create(boardId, creatorId, dto);
  }

  @Get('invite-link')
  @Roles(Role.ADMIN)
  @ResponseMessage('Lấy thông tin invite link thành công')
  get(@Param('boardId') boardId: string) {
    return this.inviteLinksService.get(boardId);
  }

  @Patch('invite-link')
  @Roles(Role.ADMIN)
  @ResponseMessage('Cập nhật invite link thành công')
  update(@Param('boardId') boardId: string, @Body() dto: UpdateInviteLinkDto) {
    return this.inviteLinksService.update(boardId, dto);
  }

  @Delete('invite-link')
  @Roles(Role.ADMIN)
  @ResponseMessage('Thu hồi invite link thành công')
  revoke(@Param('boardId') boardId: string) {
    return this.inviteLinksService.revoke(boardId);
  }

  @Get('join-requests')
  @Roles(Role.ADMIN)
  @ResponseMessage('Lấy danh sách yêu cầu tham gia thành công')
  findJoinRequests(@Param('boardId') boardId: string) {
    return this.inviteLinksService.findJoinRequests(boardId);
  }

  @Patch('join-requests/:requestId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Xử lý yêu cầu tham gia thành công')
  decideJoinRequest(
    @Param('boardId') boardId: string,
    @Param('requestId') requestId: string,
    @Body() dto: DecideJoinRequestDto,
  ) {
    return this.inviteLinksService.decideJoinRequest(boardId, requestId, dto);
  }
}
