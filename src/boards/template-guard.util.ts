import { BadRequestException } from '@nestjs/common';
import { TemplateVisibility } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

export async function ensureTemplateContentEditable(
  prisma: PrismaService,
  boardId: string,
): Promise<void> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { isTemplate: true, templateVisibility: true },
  });
  if (
    board?.isTemplate &&
    board.templateVisibility === TemplateVisibility.PUBLIC
  ) {
    throw new BadRequestException(
      'Chuyển template sang chế độ riêng tư trước khi chỉnh sửa nội dung',
    );
  }
}
