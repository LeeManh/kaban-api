import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BoardRolesGuard } from '../common/guard/board-roles.guard';
import { InvitesService } from './invites.service';
import { CreateBoardInviteDto } from './dto/create-board-invite.dto';

@Controller('boards/:boardId/invites')
@UseGuards(BoardRolesGuard)
export class BoardInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('Đã gửi lời mời')
  create(
    @Param('boardId') boardId: string,
    @GetUser('sub') inviterId: string,
    @Body() dto: CreateBoardInviteDto,
  ) {
    return this.invitesService.create(boardId, inviterId, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('Lấy danh sách lời mời đang chờ thành công')
  findAllPending(@Param('boardId') boardId: string) {
    return this.invitesService.findAllPending(boardId);
  }

  @Delete(':inviteId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Thu hồi lời mời thành công')
  revoke(
    @Param('boardId') boardId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invitesService.revoke(boardId, inviteId);
  }
}
