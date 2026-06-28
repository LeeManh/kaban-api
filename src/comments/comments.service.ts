import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const AUTHOR_SELECT = { select: { id: true, name: true, email: true } };

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    boardId: string,
    cardId: string,
    authorId: string,
    dto: CreateCommentDto,
  ) {
    await this.ensureCardInBoard(boardId, cardId);
    return this.prisma.comment.create({
      data: { content: dto.content, cardId, authorId },
    });
  }

  async findAll(boardId: string, cardId: string) {
    await this.ensureCardInBoard(boardId, cardId);
    return this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
      include: { author: AUTHOR_SELECT },
    });
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

    return this.prisma.comment.update({
      where: { id: commentId },
      data: dto,
      include: { author: AUTHOR_SELECT },
    });
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
