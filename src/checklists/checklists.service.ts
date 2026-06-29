import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

const ORDER_STEP = 1000;

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, cardId: string, dto: CreateChecklistDto) {
    await this.ensureCardInBoard(boardId, cardId);

    const last = await this.prisma.checklist.findFirst({
      where: { cardId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? 0) + ORDER_STEP;

    return this.prisma.checklist.create({
      data: { title: dto.title, order, cardId },
    });
  }

  async findAll(boardId: string, cardId: string) {
    await this.ensureCardInBoard(boardId, cardId);
    return this.prisma.checklist.findMany({
      where: { cardId },
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async update(boardId: string, checklistId: string, dto: UpdateChecklistDto) {
    await this.getChecklistInBoard(boardId, checklistId);
    return this.prisma.checklist.update({
      where: { id: checklistId },
      data: dto,
    });
  }

  async remove(boardId: string, checklistId: string) {
    await this.getChecklistInBoard(boardId, checklistId);
    await this.prisma.checklist.delete({ where: { id: checklistId } });
    return { id: checklistId };
  }

  async addItem(
    boardId: string,
    checklistId: string,
    dto: CreateChecklistItemDto,
  ) {
    await this.getChecklistInBoard(boardId, checklistId);

    const last = await this.prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? 0) + ORDER_STEP;

    return this.prisma.checklistItem.create({
      data: { content: dto.content, order, checklistId },
    });
  }

  async updateItem(
    boardId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
  ) {
    await this.getItemInBoard(boardId, itemId);
    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  async toggleItem(boardId: string, itemId: string) {
    const item = await this.getItemInBoard(boardId, itemId);
    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: { isDone: !item.isDone },
    });
  }

  async removeItem(boardId: string, itemId: string) {
    await this.getItemInBoard(boardId, itemId);
    await this.prisma.checklistItem.delete({ where: { id: itemId } });
    return { id: itemId };
  }

  private async ensureCardInBoard(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');
  }

  private async getChecklistInBoard(boardId: string, checklistId: string) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id: checklistId, card: { list: { boardId } } },
      select: { id: true },
    });
    if (!checklist)
      throw new NotFoundException('Không tìm thấy checklist trong board này');
    return checklist;
  }

  private async getItemInBoard(boardId: string, itemId: string) {
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, checklist: { card: { list: { boardId } } } },
      select: { id: true, isDone: true },
    });
    if (!item)
      throw new NotFoundException(
        'Không tìm thấy checklist item trong board này',
      );
    return item;
  }
}
