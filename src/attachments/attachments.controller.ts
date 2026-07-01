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
import { AttachmentsService } from './attachments.service';
import { PresignAttachmentDto } from './dto/presign-attachment.dto';

@Controller('boards/:boardId')
@UseGuards(BoardRolesGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('cards/:cardId/attachments/presign')
  @Roles(Role.MEMBER)
  @ResponseMessage('Tạo URL upload thành công')
  presign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @GetUser('sub') userId: string,
    @Body() dto: PresignAttachmentDto,
  ) {
    return this.attachmentsService.presign(boardId, cardId, userId, dto);
  }

  @Get('cards/:cardId/attachments')
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách file thành công')
  findAll(@Param('boardId') boardId: string, @Param('cardId') cardId: string) {
    return this.attachmentsService.findAll(boardId, cardId);
  }

  @Delete('attachments/:attachmentId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Xóa file thành công')
  remove(
    @Param('boardId') boardId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attachmentsService.remove(boardId, attachmentId);
  }
}
