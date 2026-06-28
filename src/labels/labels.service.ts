import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  create(boardId: string, dto: CreateLabelDto) {
    return this.prisma.label.create({
      data: { name: dto.name, color: dto.color, boardId },
    });
  }

  findAll(boardId: string) {
    return this.prisma.label.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
    });
  }

  async update(boardId: string, labelId: string, dto: UpdateLabelDto) {
    await this.ensureLabelInBoard(boardId, labelId);
    return this.prisma.label.update({
      where: { id: labelId },
      data: dto,
    });
  }

  async remove(boardId: string, labelId: string) {
    await this.ensureLabelInBoard(boardId, labelId);
    await this.prisma.label.delete({ where: { id: labelId } });
    return { id: labelId };
  }

  async assignToCard(boardId: string, cardId: string, labelId: string) {
    await this.ensureCardInBoard(boardId, cardId);
    await this.ensureLabelInBoard(boardId, labelId);

    await this.prisma.card.update({
      where: { id: cardId },
      data: { labels: { connect: { id: labelId } } },
    });
    return { cardId, labelId };
  }

  async removeFromCard(boardId: string, cardId: string, labelId: string) {
    await this.ensureCardInBoard(boardId, cardId);
    await this.ensureLabelInBoard(boardId, labelId);

    await this.prisma.card.update({
      where: { id: cardId },
      data: { labels: { disconnect: { id: labelId } } },
    });
    return { cardId, labelId };
  }

  private async ensureLabelInBoard(boardId: string, labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      select: { boardId: true },
    });
    if (!label || label.boardId !== boardId)
      throw new NotFoundException('Không tìm thấy label trong board này');
  }

  private async ensureCardInBoard(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');
  }
}
