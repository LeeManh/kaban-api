import { EventEmitter2 } from '@nestjs/event-emitter';
import { BoardsService } from '../../src/boards/boards.service';
import { CardsService } from '../../src/cards/cards.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  TestDatabase,
} from './setup-test-db';

describe('Board cascade delete (integration)', () => {
  let db: TestDatabase;
  let boardsService: BoardsService;

  beforeAll(async () => {
    db = await setupTestDatabase();

    boardsService = new BoardsService(
      db.prisma,
      {} as unknown as StorageService,
      {
        getJson: jest.fn().mockResolvedValue(null),
        setJson: jest.fn(),
        del: jest.fn(),
      } as unknown as RedisService,
      { emit: jest.fn() } as unknown as EventEmitter2,
      {} as unknown as CardsService,
    );
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  it('removes lists, cards and memberships when the board is deleted', async () => {
    const owner = await db.prisma.user.create({
      data: { email: 'owner2@test.com', password: 'x', name: 'Owner' },
    });
    const member = await db.prisma.user.create({
      data: { email: 'member@test.com', password: 'x', name: 'Member' },
    });
    const board = await db.prisma.board.create({
      data: { name: 'Board', background: '#fff', ownerId: owner.id },
    });
    await db.prisma.boardMember.createMany({
      data: [
        { boardId: board.id, userId: owner.id, role: 'OWNER' },
        { boardId: board.id, userId: member.id, role: 'MEMBER' },
      ],
    });
    const list = await db.prisma.list.create({
      data: { title: 'Todo', order: 1000, boardId: board.id },
    });
    const card = await db.prisma.card.create({
      data: { title: 'Task', order: 1000, listId: list.id },
    });
    await db.prisma.checklist.create({
      data: { title: 'Checklist', order: 1000, cardId: card.id },
    });
    await db.prisma.label.create({
      data: { name: 'Bug', color: '#f00', boardId: board.id },
    });

    await boardsService.remove(board.id);

    const [
      boardRow,
      listRow,
      cardRow,
      checklistRow,
      memberRows,
      labelRow,
      userRows,
    ] = await Promise.all([
      db.prisma.board.findUnique({ where: { id: board.id } }),
      db.prisma.list.findUnique({ where: { id: list.id } }),
      db.prisma.card.findUnique({ where: { id: card.id } }),
      db.prisma.checklist.findFirst({ where: { cardId: card.id } }),
      db.prisma.boardMember.findMany({ where: { boardId: board.id } }),
      db.prisma.label.findFirst({ where: { boardId: board.id } }),
      db.prisma.user.findMany({
        where: { id: { in: [owner.id, member.id] } },
      }),
    ]);

    expect(boardRow).toBeNull();
    expect(listRow).toBeNull();
    expect(cardRow).toBeNull();
    expect(checklistRow).toBeNull();
    expect(memberRows).toHaveLength(0);
    expect(labelRow).toBeNull();
    expect(userRows).toHaveLength(2);
  });
});
