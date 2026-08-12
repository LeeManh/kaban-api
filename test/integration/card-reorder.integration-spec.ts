import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { CardsService } from '../../src/cards/cards.service';
import { StorageService } from '../../src/storage/storage.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  TestDatabase,
} from './setup-test-db';

describe('Card reorder (integration)', () => {
  let db: TestDatabase;
  let cardsService: CardsService;
  let boardId: string;
  let listId: string;

  beforeAll(async () => {
    db = await setupTestDatabase();

    const queue = {
      add: jest.fn(),
      getJob: jest.fn().mockResolvedValue(undefined),
    };
    cardsService = new CardsService(
      db.prisma,
      {} as unknown as StorageService,
      queue as unknown as Queue,
      queue as unknown as Queue,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );

    const user = await db.prisma.user.create({
      data: { email: 'owner@test.com', password: 'x', name: 'Owner' },
    });
    const board = await db.prisma.board.create({
      data: { name: 'Board', background: '#fff', ownerId: user.id },
    });
    boardId = board.id;
    const list = await db.prisma.list.create({
      data: { title: 'Todo', order: 1000, boardId },
    });
    listId = list.id;
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  const orderedTitles = async () => {
    const cards = await db.prisma.card.findMany({
      where: { listId },
      orderBy: { order: 'asc' },
      select: { title: true },
    });
    return cards.map((c) => c.title);
  };

  it('appends new cards to the bottom of the list in creation order', async () => {
    await cardsService.create(boardId, listId, { title: 'Card A' }, 'user-1');
    await cardsService.create(boardId, listId, { title: 'Card B' }, 'user-1');
    await cardsService.create(boardId, listId, { title: 'Card C' }, 'user-1');

    expect(await orderedTitles()).toEqual(['Card A', 'Card B', 'Card C']);
  });

  it('moves a card to the front of the list and persists the new order', async () => {
    const cardC = await db.prisma.card.findFirstOrThrow({
      where: { listId, title: 'Card C' },
    });
    const cardA = await db.prisma.card.findFirstOrThrow({
      where: { listId, title: 'Card A' },
    });

    await cardsService.move(boardId, cardC.id, { afterId: cardA.id }, 'user-1');

    expect(await orderedTitles()).toEqual(['Card C', 'Card A', 'Card B']);
  });

  it('moves a card between two neighbors and persists the new order', async () => {
    const cardB = await db.prisma.card.findFirstOrThrow({
      where: { listId, title: 'Card B' },
    });
    const cardC = await db.prisma.card.findFirstOrThrow({
      where: { listId, title: 'Card C' },
    });
    const cardA = await db.prisma.card.findFirstOrThrow({
      where: { listId, title: 'Card A' },
    });

    await cardsService.move(
      boardId,
      cardB.id,
      { beforeId: cardC.id, afterId: cardA.id },
      'user-1',
    );

    expect(await orderedTitles()).toEqual(['Card C', 'Card B', 'Card A']);
  });
});
