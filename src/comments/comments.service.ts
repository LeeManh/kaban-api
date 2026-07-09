import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { Role } from 'generated/prisma/enums';
import { CARD_STORAGE_KEY_PREFIX } from '../cards/card.selects';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { resolveMarkdownImages } from '../storage/markdown-images.util';
import { APP_EVENT } from '../events/events.constants';
import type { CommentAddedEvent } from '../events/events.types';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PresignCommentImageDto } from './dto/presign-comment-image.dto';

const AUTHOR_SELECT = { select: { id: true, name: true, email: true } };

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async presignImage(
    boardId: string,
    cardId: string,
    dto: PresignCommentImageDto,
  ) {
    await this.ensureCardInBoard(boardId, cardId);

    const safeName = dto.filename.replace(/[^\w.-]+/g, '_');
    const key = `${CARD_STORAGE_KEY_PREFIX}${cardId}/comments/${randomUUID()}-${safeName}`;
    const uploadUrl = await this.storage.getUploadUrl(key, dto.contentType);
    const viewUrl = await this.storage.getDownloadUrl(key, 7 * 24 * 3600);

    return { key, uploadUrl, viewUrl };
  }

  async create(
    boardId: string,
    cardId: string,
    authorId: string,
    dto: CreateCommentDto,
  ) {
    await this.ensureCardInBoard(boardId, cardId);
    const comment = await this.prisma.comment.create({
      data: { content: dto.content, cardId, authorId },
      include: { author: AUTHOR_SELECT },
    });

    this.eventEmitter.emit(APP_EVENT.COMMENT_ADDED, {
      boardId,
      comment,
      actorId: authorId,
    } satisfies CommentAddedEvent);

    return {
      ...comment,
      content: await this.resolveContentImages(comment.content),
    };
  }

  async findAll(boardId: string, cardId: string) {
    await this.ensureCardInBoard(boardId, cardId);
    const comments = await this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
      include: { author: AUTHOR_SELECT },
    });

    return Promise.all(
      comments.map(async (comment) => ({
        ...comment,
        content: await this.resolveContentImages(comment.content),
      })),
    );
  }

  async update(
    boardId: string,
    commentId: string,
    callerId: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.getCommentInBoard(boardId, commentId);
    if (comment.authorId !== callerId)
      throw new ForbiddenException('Chỉ tác giả mới được sửa comment');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: dto,
      include: { author: AUTHOR_SELECT },
    });

    return {
      ...updated,
      content: await this.resolveContentImages(updated.content),
    };
  }

  private resolveContentImages(content: string) {
    return resolveMarkdownImages(
      content,
      this.storage,
      CARD_STORAGE_KEY_PREFIX,
    );
  }

  async remove(boardId: string, commentId: string, callerId: string) {
    const comment = await this.getCommentInBoard(boardId, commentId);

    if (comment.authorId !== callerId) {
      const member = await this.prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId: callerId } },
        select: { role: true },
      });
      const isModerator =
        member?.role === Role.ADMIN || member?.role === Role.OWNER;
      if (!isModerator)
        throw new ForbiddenException(
          'Chỉ tác giả hoặc quản trị viên mới được xóa comment',
        );
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { id: commentId };
  }

  private async ensureCardInBoard(boardId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });
    if (!card)
      throw new NotFoundException('Không tìm thấy card trong board này');
  }

  private async getCommentInBoard(boardId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, card: { list: { boardId } } },
      select: { id: true, authorId: true },
    });
    if (!comment)
      throw new NotFoundException('Không tìm thấy comment trong board này');
    return comment;
  }
}
