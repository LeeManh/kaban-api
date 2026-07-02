import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PresignAttachmentDto } from './dto/presign-attachment.dto';
import { ATTACHMENT_JOB, ATTACHMENTS_QUEUE } from './attachment.constants';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(ATTACHMENTS_QUEUE) private readonly attachmentsQueue: Queue,
  ) {}

  async presign(
    boardId: string,
    cardId: string,
    userId: string,
    dto: PresignAttachmentDto,
  ) {
    await this.ensureCardInBoard(boardId, cardId);

    const safeName = dto.filename.replace(/[^\w.-]+/g, '_');
    const key = `cards/${cardId}/${randomUUID()}-${safeName}`;

    const attachment = await this.prisma.attachment.create({
      data: {
        filename: dto.filename,
        key,
        mimeType: dto.contentType,
        size: dto.size,
        cardId,
        uploadedById: userId,
      },
    });

    const uploadUrl = await this.storage.getUploadUrl(key, dto.contentType);
    return { attachment, uploadUrl };
  }

  async findAll(boardId: string, cardId: string) {
    await this.ensureCardInBoard(boardId, cardId);

    const attachments = await this.prisma.attachment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      attachments.map(async (att) => ({
        ...att,
        downloadUrl: await this.storage.getDownloadUrl(att.key),
      })),
    );
  }

  async remove(boardId: string, attachmentId: string) {
    const att = await this.getAttachmentInBoard(boardId, attachmentId);

    await this.prisma.attachment.delete({ where: { id: att.id } });

    await this.attachmentsQueue.add(
      ATTACHMENT_JOB.DELETE_OBJECT,
      { key: att.key },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );
    return { id: att.id };
  }

  private async ensureCardInBoard(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');
  }

  private async getAttachmentInBoard(boardId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, card: { list: { boardId } } },
    });
    if (!att)
      throw new NotFoundException('Không tìm thấy attachment trong board này');
    return att;
  }
}
