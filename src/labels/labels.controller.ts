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
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Controller('boards/:boardId/labels')
@UseGuards(BoardRolesGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @Roles(Role.MEMBER)
  @ResponseMessage('Tạo label thành công')
  create(@Param('boardId') boardId: string, @Body() dto: CreateLabelDto) {
    return this.labelsService.create(boardId, dto);
  }

  @Get()
  @Roles(Role.VIEWER)
  @ResponseMessage('Lấy danh sách label thành công')
  findAll(@Param('boardId') boardId: string) {
    return this.labelsService.findAll(boardId);
  }

  @Patch(':labelId')
  @Roles(Role.MEMBER)
  @ResponseMessage('Cập nhật label thành công')
  update(
    @Param('boardId') boardId: string,
    @Param('labelId') labelId: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.update(boardId, labelId, dto);
  }

  @Delete(':labelId')
  @Roles(Role.ADMIN)
  @ResponseMessage('Xóa label thành công')
  remove(@Param('boardId') boardId: string, @Param('labelId') labelId: string) {
    return this.labelsService.remove(boardId, labelId);
  }
}
