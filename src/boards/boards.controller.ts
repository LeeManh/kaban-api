import { Controller, UseGuards } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { BoardRolesGuard } from 'src/common/guard/board-roles.guard';

@Controller('boards')
@UseGuards(BoardRolesGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}
}
