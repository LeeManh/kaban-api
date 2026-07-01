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
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Controller('boards/:boardId')
@UseGuards(BoardRolesGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('lists/:listId/cards')
  @Roles(Role.MEMBER)
  @ResponseMessage('Tạo card thành công')
  create(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.cardsService.create(boardId, listId, dto);
  }

  @Get('lists/:listId/cards')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách card thành công')
  findAll(@Param('boardId') boardId: string, @Param('listId') listId: string) {
    return this.cardsService.findAll(boardId, listId);
  }

  @Get('cards/:cardId')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy chi tiết card thành công')
  findOne(@Param('boardId') boardId: string, @Param('cardId') cardId: string) {
    return this.cardsService.findOne(boardId, cardId);
  }

  @Patch('cards/:cardId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Cập nhật card thành công')
  update(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.update(boardId, cardId, dto);
  }

  @Patch('cards/:cardId/move')
  @Roles(Role.MEMBER)
  @ResponseMessage('Di chuyển card thành công')
  move(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
  ) {
    return this.cardsService.move(boardId, cardId, dto);
  }

  @Delete('cards/:cardId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Xóa card thành công')
  remove(@Param('boardId') boardId: string, @Param('cardId') cardId: string) {
    return this.cardsService.remove(boardId, cardId);
  }

  @Post('cards/:cardId/assignees/:userId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Gán thành viên vào card thành công')
  assign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('userId') userId: string,
  ) {
    return this.cardsService.assignMember(boardId, cardId, userId);
  }

  @Delete('cards/:cardId/assignees/:userId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Gỡ thành viên khỏi card thành công')
  unassign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('userId') userId: string,
  ) {
    return this.cardsService.unassignMember(boardId, cardId, userId);
  }
}
