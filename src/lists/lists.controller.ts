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
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { MoveListDto } from './dto/move-list.dto';
import { CopyListDto } from './dto/copy-list.dto';

@Controller('boards/:boardId/lists')
@UseGuards(BoardRolesGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @Roles(Role.MEMBER)
  @ResponseMessage('Tạo list thành công')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateListDto,
    @GetUser('sub') actorId: string,
  ) {
    return this.listsService.create(boardId, dto, actorId);
  }

  @Get()
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách list thành công')
  findAll(@Param('boardId') boardId: string) {
    return this.listsService.findAll(boardId);
  }

  @Patch(':listId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Cập nhật list thành công')
  update(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Body() dto: UpdateListDto,
    @GetUser('sub') actorId: string,
  ) {
    return this.listsService.update(boardId, listId, dto, actorId);
  }

  @Patch(':listId/move')
  @Roles(Role.MEMBER)
  @ResponseMessage('Di chuyển list thành công')
  move(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Body() dto: MoveListDto,
    @GetUser('sub') actorId: string,
  ) {
    return this.listsService.move(boardId, listId, dto, actorId);
  }

  @Post(':listId/copy')
  @Roles(Role.MEMBER)
  @ResponseMessage('Sao chép list thành công')
  copyList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Body() dto: CopyListDto,
    @GetUser('sub') actorId: string,
  ) {
    return this.listsService.copyList(boardId, listId, dto, actorId);
  }

  @Delete(':listId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Xóa list thành công')
  remove(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @GetUser('sub') actorId: string,
  ) {
    return this.listsService.remove(boardId, listId, actorId);
  }
}
