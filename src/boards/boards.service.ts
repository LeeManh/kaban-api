import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBoardDto) {
    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: { name: dto.name, ownerId: userId },
      });

      await tx.boardMember.create({
        data: { boardId: board.id, userId, role: Role.OWNER },
      });

      return board;
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.board.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          select: {
            role: true,
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!board) throw new NotFoundException('Không tìm thấy board');

    await this.prisma.boardView.upsert({
      where: { userId_boardId: { userId, boardId } },
      update: { viewedAt: new Date() },
      create: { userId, boardId },
    });

    return board;
  }

  findRecentlyViewed(userId: string, limit = 10) {
    return this.prisma.boardView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      select: {
        viewedAt: true,
        board: { select: { id: true, name: true, createdAt: true } },
      },
    });
  }

  async findMembers(boardId: string) {
    await this.ensureExists(boardId);
    return this.prisma.boardMember.findMany({
      where: { boardId },
      select: {
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { role: 'asc' },
    });
  }

  async addMember(boardId: string, dto: AddMemberDto) {
    await this.ensureExists(boardId);

    const role = dto.role ?? Role.MEMBER;
    if (role === Role.OWNER)
      throw new BadRequestException(
        'Không thể gán quyền OWNER khi thêm thành viên',
      );

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true },
    });
    if (!user)
      throw new NotFoundException('Không tìm thấy người dùng với email này');

    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
      select: { userId: true },
    });
    if (member)
      throw new ConflictException('Người dùng đã là thành viên của board');

    return this.prisma.boardMember.create({
      data: { boardId, userId: user.id, role },
      select: {
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async updateMemberRole(
    boardId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    callerId: string,
  ) {
    await this.ensureExists(boardId);

    if (dto.role === Role.OWNER)
      throw new BadRequestException(
        'Không thể gán quyền OWNER. Hãy dùng chức năng chuyển quyền sở hữu.',
      );

    const target = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      select: { role: true },
    });
    if (!target)
      throw new NotFoundException('Người dùng không phải thành viên của board');
    if (target.role === Role.OWNER)
      throw new BadRequestException('Không thể đổi quyền của OWNER');

    const caller = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: callerId } },
      select: { role: true },
    });
    const callerIsOwner = caller?.role === Role.OWNER;
    if (
      !callerIsOwner &&
      (target.role === Role.ADMIN || dto.role === Role.ADMIN)
    )
      throw new ForbiddenException(
        'Chỉ OWNER mới được thay đổi quyền liên quan đến ADMIN',
      );

    return this.prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      data: { role: dto.role },
      select: {
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async removeMember(boardId: string, targetUserId: string, callerId: string) {
    await this.ensureExists(boardId);

    const target = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      select: { role: true },
    });
    if (!target)
      throw new NotFoundException('Người dùng không phải thành viên của board');

    // Không xóa được OWNER — phải chuyển quyền sở hữu hoặc xóa cả board.
    if (target.role === Role.OWNER)
      throw new BadRequestException('Không thể xóa OWNER khỏi board');

    // Chống leo thang quyền: chỉ OWNER mới được xóa ADMIN.
    const caller = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: callerId } },
      select: { role: true },
    });
    if (caller?.role !== Role.OWNER && target.role === Role.ADMIN)
      throw new ForbiddenException('Chỉ OWNER mới được xóa ADMIN');

    await this.prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId: targetUserId } },
    });
    return { boardId, userId: targetUserId };
  }

  async leaveBoard(boardId: string, userId: string) {
    const membership = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { role: true },
    });
    if (!membership)
      throw new NotFoundException('Bạn không phải thành viên của board này');

    // OWNER không thể rời board — phải chuyển quyền sở hữu hoặc xóa board.
    if (membership.role === Role.OWNER)
      throw new ForbiddenException(
        'OWNER không thể rời board. Hãy chuyển quyền sở hữu hoặc xóa board.',
      );

    await this.prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId } },
    });
    return { boardId, userId };
  }

  // Người gọi đã được guard đảm bảo là OWNER của board.
  async transferOwnership(
    boardId: string,
    dto: TransferOwnershipDto,
    callerId: string,
  ) {
    if (dto.newOwnerId === callerId)
      throw new BadRequestException('Bạn đã là OWNER của board này');

    const newOwner = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: dto.newOwnerId } },
      select: { userId: true },
    });
    if (!newOwner)
      throw new NotFoundException(
        'Người nhận quyền không phải thành viên của board',
      );

    // Đổi 2 role + cập nhật Board.ownerId trong cùng transaction
    // để board luôn có đúng 1 OWNER, không rơi vào trạng thái nửa chừng.
    return this.prisma.$transaction(async (tx) => {
      await tx.boardMember.update({
        where: { boardId_userId: { boardId, userId: callerId } },
        data: { role: Role.ADMIN },
      });
      await tx.boardMember.update({
        where: { boardId_userId: { boardId, userId: dto.newOwnerId } },
        data: { role: Role.OWNER },
      });
      await tx.board.update({
        where: { id: boardId },
        data: { ownerId: dto.newOwnerId },
      });
      return { boardId, ownerId: dto.newOwnerId };
    });
  }

  async update(boardId: string, dto: UpdateBoardDto) {
    await this.ensureExists(boardId);
    return this.prisma.board.update({
      where: { id: boardId },
      data: dto,
    });
  }

  async remove(boardId: string) {
    await this.ensureExists(boardId);
    await this.prisma.board.delete({ where: { id: boardId } });
    return { id: boardId };
  }

  private async ensureExists(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });
    if (!board) throw new NotFoundException('Không tìm thấy board');
  }
}
