import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateBoardFromTemplateDto } from './dto/create-board-from-template.dto';
import { CreateTemplateFromBoardDto } from './dto/create-template-from-board.dto';
import { FindTemplatesDto } from './dto/find-templates.dto';
import { PresignBoardBackgroundDto } from './dto/presign-board-background.dto';
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
  findAll(@GetUser('sub') userId: string, @Query('search') search?: string) {
    return this.boardsService.findAllForUser(userId, search);
  }

  @Get('recently-viewed')
  @ResponseMessage('Lấy danh sách board đã xem gần đây thành công')
  findRecentlyViewed(@GetUser('sub') userId: string) {
    return this.boardsService.findRecentlyViewed(userId);
  }

  @Get('templates')
  @ResponseMessage('Lấy danh sách template thành công')
  findTemplates(@Query() dto: FindTemplatesDto) {
    return this.boardsService.findTemplates(dto);
  }

  @Get('templates/:templateId')
  @ResponseMessage('Lấy chi tiết template thành công')
  findTemplateById(@Param('templateId') templateId: string) {
    return this.boardsService.findTemplateById(templateId);
  }

  @Get('templates/:templateId/cards/:cardId')
  @ResponseMessage('Lấy chi tiết card trong template thành công')
  findTemplateCardById(
    @Param('templateId') templateId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.boardsService.findTemplateCardById(templateId, cardId);
  }

  @Post('templates/:templateId/use')
  @ResponseMessage('Tạo board từ template thành công')
  createFromTemplate(
    @Param('templateId') templateId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateBoardFromTemplateDto,
  ) {
    return this.boardsService.createFromTemplate(templateId, userId, dto);
  }

  @Get(':boardId')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy chi tiết board thành công')
  findOne(@Param('boardId') boardId: string, @GetUser('sub') userId: string) {
    return this.boardsService.findOne(boardId, userId);
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

  @Post(':boardId/make-template')
  @Roles(Role.OWNER)
  @ResponseMessage('Tạo template từ board thành công')
  makeTemplate(
    @Param('boardId') boardId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateTemplateFromBoardDto,
  ) {
    return this.boardsService.makeTemplate(boardId, userId, dto);
  }

  @Post(':boardId/background/presign')
  @Roles(Role.ADMIN)
  @ResponseMessage('Tạo URL upload ảnh nền thành công')
  presignBackground(
    @Param('boardId') boardId: string,
    @Body() dto: PresignBoardBackgroundDto,
  ) {
    return this.boardsService.presignBackground(boardId, dto);
  }

  @Post(':boardId/star')
  @Roles(Role.VIEWER)
  @ResponseMessage('Đánh dấu yêu thích board thành công')
  starBoard(@Param('boardId') boardId: string, @GetUser('sub') userId: string) {
    return this.boardsService.starBoard(boardId, userId);
  }

  @Delete(':boardId/star')
  @Roles(Role.VIEWER)
  @ResponseMessage('Bỏ đánh dấu yêu thích board thành công')
  unstarBoard(
    @Param('boardId') boardId: string,
    @GetUser('sub') userId: string,
  ) {
    return this.boardsService.unstarBoard(boardId, userId);
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
