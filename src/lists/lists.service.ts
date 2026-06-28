import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { MoveListDto } from './dto/move-list.dto';

const ORDER_STEP = 1000;

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateListDto) {
    const last = await this.prisma.list.findFirst({
      where: { boardId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? 0) + ORDER_STEP;

    return this.prisma.list.create({
      data: { title: dto.title, order, boardId },
    });
  }

  findAll(boardId: string) {
    return this.prisma.list.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
    });
  }

  async update(boardId: string, listId: string, dto: UpdateListDto) {
    await this.ensureListInBoard(boardId, listId);
    return this.prisma.list.update({
      where: { id: listId },
      data: dto,
    });
  }

  async move(boardId: string, listId: string, dto: MoveListDto) {
    await this.ensureListInBoard(boardId, listId);

    const { beforeId, afterId } = dto;
    if (!beforeId && !afterId)
      throw new BadRequestException('Cần cung cấp beforeId hoặc afterId');

    const before = beforeId
      ? await this.getNeighborOrder(boardId, beforeId, listId)
      : null;
    const after = afterId
      ? await this.getNeighborOrder(boardId, afterId, listId)
      : null;

    let order: number;
    if (before !== null && after !== null) {
      if (before >= after)
        throw new BadRequestException(
          'Vị trí beforeId/afterId không hợp lệ (before phải nhỏ hơn after)',
        );
      order = (before + after) / 2; // chèn vào giữa → trung bình cộng
    } else if (after !== null) {
      order = after - ORDER_STEP; // chèn lên đầu
    } else {
      order = (before as number) + ORDER_STEP; // chèn xuống cuối
    }

    return this.prisma.list.update({
      where: { id: listId },
      data: { order },
    });
  }

  async remove(boardId: string, listId: string) {
    await this.ensureListInBoard(boardId, listId);
    await this.prisma.list.delete({ where: { id: listId } });
    return { id: listId };
  }

  private async getNeighborOrder(
    boardId: string,
    neighborId: string,
    movingId: string,
  ): Promise<number> {
    if (neighborId === movingId)
      throw new BadRequestException(
        'beforeId/afterId không được trùng list đang di chuyển',
      );
    const neighbor = await this.prisma.list.findUnique({
      where: { id: neighborId },
      select: { boardId: true, order: true },
    });
    if (!neighbor || neighbor.boardId !== boardId)
      throw new NotFoundException(
        'Không tìm thấy list lân cận trong board này',
      );
    return neighbor.order;
  }

  private async ensureListInBoard(boardId: string, listId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true },
    });
    if (!list || list.boardId !== boardId)
      throw new NotFoundException('Không tìm thấy list trong board này');
  }
}
