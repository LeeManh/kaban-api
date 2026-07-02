import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { APP_EVENT } from '../events/events.constants';
import type {
  LabelCreatedEvent,
  LabelDeletedEvent,
  LabelUpdatedEvent,
} from '../events/events.types';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(boardId: string, dto: CreateLabelDto, actorId: string) {
    const label = await this.prisma.label.create({
      data: { name: dto.name, color: dto.color, boardId },
    });

    this.eventEmitter.emit(APP_EVENT.LABEL_CREATED, {
      boardId,
      label,
      actorId,
    } satisfies LabelCreatedEvent);

    return label;
  }

  findAll(boardId: string) {
    return this.prisma.label.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    boardId: string,
    labelId: string,
    dto: UpdateLabelDto,
    actorId: string,
  ) {
    await this.ensureLabelInBoard(boardId, labelId);
    const label = await this.prisma.label.update({
      where: { id: labelId },
      data: dto,
    });

    this.eventEmitter.emit(APP_EVENT.LABEL_UPDATED, {
      boardId,
      label,
      actorId,
    } satisfies LabelUpdatedEvent);

    return label;
  }

  async remove(boardId: string, labelId: string, actorId: string) {
    await this.ensureLabelInBoard(boardId, labelId);
    await this.prisma.label.delete({ where: { id: labelId } });

    this.eventEmitter.emit(APP_EVENT.LABEL_DELETED, {
      boardId,
      labelId,
      actorId,
    } satisfies LabelDeletedEvent);

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
