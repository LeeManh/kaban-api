import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BoardRolesGuard } from '../common/guard/board-roles.guard';
import { LabelsService } from './labels.service';

@Controller('boards/:boardId/cards/:cardId/labels')
@UseGuards(BoardRolesGuard)
export class CardLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post(':labelId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Gán label vào card thành công')
  assign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.labelsService.assignToCard(boardId, cardId, labelId);
  }

  @Delete(':labelId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Gỡ label khỏi card thành công')
  remove(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.labelsService.removeFromCard(boardId, cardId, labelId);
  }
}
