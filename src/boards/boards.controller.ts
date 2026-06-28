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
import { BoardsService } from './boards.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('boards')
@UseGuards(BoardRolesGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  @ResponseMessage('Tạo board thành công')
  create(@GetUser('sub') userId: string, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(userId, dto);
  }

  @Get()
  @ResponseMessage('Lấy danh sách board thành công')
  findAll(@GetUser('sub') userId: string) {
    return this.boardsService.findAllForUser(userId);
  }

  @Get(':boardId')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy chi tiết board thành công')
  findOne(@Param('boardId') boardId: string) {
    return this.boardsService.findOne(boardId);
  }

  @Get(':boardId/members')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách thành viên thành công')
  findMembers(@Param('boardId') boardId: string) {
    return this.boardsService.findMembers(boardId);
  }

  @Post(':boardId/members')
  @Roles(Role.ADMIN)
  @ResponseMessage('Thêm thành viên thành công')
  addMember(@Param('boardId') boardId: string, @Body() dto: AddMemberDto) {
    return this.boardsService.addMember(boardId, dto);
  }

  @Patch(':boardId/members/:userId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Cập nhật quyền thành viên thành công')
  updateMemberRole(
    @Param('boardId') boardId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @GetUser('sub') callerId: string,
  ) {
    return this.boardsService.updateMemberRole(boardId, userId, dto, callerId);
  }

  @Patch(':boardId/ownership')
  @Roles(Role.OWNER)
  @ResponseMessage('Chuyển quyền sở hữu thành công')
  transferOwnership(
    @Param('boardId') boardId: string,
    @Body() dto: TransferOwnershipDto,
    @GetUser('sub') callerId: string,
  ) {
    return this.boardsService.transferOwnership(boardId, dto, callerId);
  }

  @Patch(':boardId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Cập nhật board thành công')
  update(@Param('boardId') boardId: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.update(boardId, dto);
  }

  @Delete(':boardId/members/me')
  @Roles(Role.VIEWER)
  @ResponseMessage('Rời board thành công')
  leaveBoard(
    @Param('boardId') boardId: string,
    @GetUser('sub') userId: string,
  ) {
    return this.boardsService.leaveBoard(boardId, userId);
  }

  @Delete(':boardId/members/:userId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Xóa thành viên thành công')
  removeMember(
    @Param('boardId') boardId: string,
    @Param('userId') userId: string,
    @GetUser('sub') callerId: string,
  ) {
    return this.boardsService.removeMember(boardId, userId, callerId);
  }

  @Delete(':boardId')
  @Roles(Role.OWNER)
  @ResponseMessage('Xóa board thành công')
  remove(@Param('boardId') boardId: string) {
    return this.boardsService.remove(boardId);
  }
}
