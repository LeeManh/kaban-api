import { BadRequestException } from '@nestjs/common';
import { TemplateVisibility } from 'generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ensureTemplateContentEditable } from './template-guard.util';

describe('ensureTemplateContentEditable', () => {
  let prisma: { board: { findUnique: jest.Mock } };
  const boardId = 'board-1';

  beforeEach(() => {
    prisma = { board: { findUnique: jest.fn() } };
  });

  it('throws when the board is a PUBLIC template', async () => {
    prisma.board.findUnique.mockResolvedValue({
      isTemplate: true,
      templateVisibility: TemplateVisibility.PUBLIC,
    });

    await expect(
      ensureTemplateContentEditable(
        prisma as unknown as PrismaService,
        boardId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows edits when the board is a PRIVATE template', async () => {
    prisma.board.findUnique.mockResolvedValue({
      isTemplate: true,
      templateVisibility: TemplateVisibility.PRIVATE,
    });

    await expect(
      ensureTemplateContentEditable(
        prisma as unknown as PrismaService,
        boardId,
      ),
    ).resolves.toBeUndefined();
  });

  it('allows edits when the board is not a template', async () => {
    prisma.board.findUnique.mockResolvedValue({
      isTemplate: false,
      templateVisibility: TemplateVisibility.PUBLIC,
    });

    await expect(
      ensureTemplateContentEditable(
        prisma as unknown as PrismaService,
        boardId,
      ),
    ).resolves.toBeUndefined();
  });

  it('allows edits when the board does not exist', async () => {
    prisma.board.findUnique.mockResolvedValue(null);

    await expect(
      ensureTemplateContentEditable(
        prisma as unknown as PrismaService,
        boardId,
      ),
    ).resolves.toBeUndefined();
  });
});
