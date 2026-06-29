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
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BoardRolesGuard } from '../common/guard/board-roles.guard';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Controller('boards/:boardId')
@UseGuards(BoardRolesGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post('cards/:cardId/checklists')
  @Roles(Role.MEMBER)
  @ResponseMessage('Tạo checklist thành công')
  create(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistsService.create(boardId, cardId, dto);
  }

  @Get('cards/:cardId/checklists')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách checklist thành công')
  findAll(@Param('boardId') boardId: string, @Param('cardId') cardId: string) {
    return this.checklistsService.findAll(boardId, cardId);
  }

  @Patch('checklists/:checklistId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Cập nhật checklist thành công')
  update(
    @Param('boardId') boardId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklistsService.update(boardId, checklistId, dto);
  }

  @Delete('checklists/:checklistId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Xóa checklist thành công')
  remove(
    @Param('boardId') boardId: string,
    @Param('checklistId') checklistId: string,
  ) {
    return this.checklistsService.remove(boardId, checklistId);
  }

  @Post('checklists/:checklistId/items')
  @Roles(Role.MEMBER)
  @ResponseMessage('Thêm item thành công')
  addItem(
    @Param('boardId') boardId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.checklistsService.addItem(boardId, checklistId, dto);
  }

  @Patch('checklist-items/:itemId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Cập nhật item thành công')
  updateItem(
    @Param('boardId') boardId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateItem(boardId, itemId, dto);
  }

  @Patch('checklist-items/:itemId/toggle')
  @Roles(Role.MEMBER)
  @ResponseMessage('Cập nhật trạng thái item thành công')
  toggleItem(
    @Param('boardId') boardId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.checklistsService.toggleItem(boardId, itemId);
  }

  @Delete('checklist-items/:itemId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Xóa item thành công')
  removeItem(
    @Param('boardId') boardId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.checklistsService.removeItem(boardId, itemId);
  }
}
