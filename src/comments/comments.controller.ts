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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('boards/:boardId')
@UseGuards(BoardRolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('cards/:cardId/comments')
  @Roles(Role.MEMBER)
  @ResponseMessage('Tạo comment thành công')
  create(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @GetUser('sub') authorId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(boardId, cardId, authorId, dto);
  }

  @Get('cards/:cardId/comments')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách comment thành công')
  findAll(@Param('boardId') boardId: string, @Param('cardId') cardId: string) {
    return this.commentsService.findAll(boardId, cardId);
  }

  @Patch('comments/:commentId')
  @Roles(Role.VIEWER)
  @ResponseMessage('Cập nhật comment thành công')
  update(
    @Param('boardId') boardId: string,
    @Param('commentId') commentId: string,
    @GetUser('sub') callerId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(boardId, commentId, callerId, dto);
  }

  @Delete('comments/:commentId')
  @Roles(Role.VIEWER)
  @ResponseMessage('Xóa comment thành công')
  remove(
    @Param('boardId') boardId: string,
    @Param('commentId') commentId: string,
    @GetUser('sub') callerId: string,
  ) {
    return this.commentsService.remove(boardId, commentId, callerId);
  }
}
