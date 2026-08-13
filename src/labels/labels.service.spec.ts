import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LabelsService } from './labels.service';

describe('LabelsService', () => {
  let service: LabelsService;
  let prisma: {
    label: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
    };
    board: { findUnique: jest.Mock };
  };
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const boardId = 'board-1';
  const labelId = 'label-1';
  const actorId = 'user-1';

  beforeEach(() => {
    prisma = {
      label: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      board: { findUnique: jest.fn() },
    };
    prisma.board.findUnique.mockResolvedValue(null);
    prisma.label.findUnique.mockResolvedValue({ boardId });
    eventEmitter = { emit: jest.fn() };

    service = new LabelsService(
      prisma as unknown as PrismaService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('create', () => {
    it('throws when the board is a PUBLIC template', async () => {
      prisma.board.findUnique.mockResolvedValue({
        isTemplate: true,
        templateVisibility: 'PUBLIC',
      });

      await expect(
        service.create(boardId, { name: 'Bug', color: '#f00' }, actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.label.create).not.toHaveBeenCalled();
    });

    it('creates the label when the board is editable', async () => {
      prisma.label.create.mockResolvedValue({ id: labelId });

      await service.create(boardId, { name: 'Bug', color: '#f00' }, actorId);

      expect(prisma.label.create).toHaveBeenCalledWith({
        data: { name: 'Bug', color: '#f00', boardId },
      });
    });
  });

  describe('remove', () => {
    it('throws when the label does not belong to the board', async () => {
      prisma.label.findUnique.mockResolvedValue({ boardId: 'other-board' });

      await expect(
        service.remove(boardId, labelId, actorId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.label.delete).not.toHaveBeenCalled();
    });

    it('throws when the board is a PUBLIC template', async () => {
      prisma.board.findUnique.mockResolvedValue({
        isTemplate: true,
        templateVisibility: 'PUBLIC',
      });

      await expect(
        service.remove(boardId, labelId, actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.label.delete).not.toHaveBeenCalled();
    });

    it('deletes the label when the board is editable', async () => {
      await service.remove(boardId, labelId, actorId);

      expect(prisma.label.delete).toHaveBeenCalledWith({
        where: { id: labelId },
      });
    });
  });
});
