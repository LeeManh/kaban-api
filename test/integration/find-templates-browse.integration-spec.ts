import { EventEmitter2 } from '@nestjs/event-emitter';
import { TemplateCategory, TemplateVisibility } from 'generated/prisma/enums';
import { BoardsService } from '../../src/boards/boards.service';
import { CardsService } from '../../src/cards/cards.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  TestDatabase,
} from './setup-test-db';

describe('BoardsService.findTemplates browse mode (integration)', () => {
  let db: TestDatabase;
  let boardsService: BoardsService;
  let ownerId: string;

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

    const owner = await db.prisma.user.create({
      data: { email: 'template-owner@test.com', password: 'x', name: 'Owner' },
    });
    ownerId = owner.id;

    const createTemplate = (
      name: string,
      category: TemplateCategory,
      createdAt: Date,
    ) =>
      db.prisma.board.create({
        data: {
          name,
          background: '#fff',
          ownerId,
          isTemplate: true,
          templateVisibility: TemplateVisibility.PUBLIC,
          templateCategory: category,
          createdAt,
        },
      });

    const baseTime = new Date('2026-01-01T00:00:00.000Z');
    const daysAgo = (days: number) =>
      new Date(baseTime.getTime() - days * 86_400_000);

    await Promise.all([
      createTemplate(
        'Business 1 (oldest)',
        TemplateCategory.BUSINESS,
        daysAgo(5),
      ),
      createTemplate('Business 2', TemplateCategory.BUSINESS, daysAgo(4)),
      createTemplate('Business 3', TemplateCategory.BUSINESS, daysAgo(3)),
      createTemplate(
        'Business 4 (newest)',
        TemplateCategory.BUSINESS,
        daysAgo(1),
      ),
      createTemplate('Design 1', TemplateCategory.DESIGN, daysAgo(2)),
      createTemplate('Private Business', TemplateCategory.BUSINESS, daysAgo(1)),
    ]);

    await db.prisma.board.updateMany({
      where: { name: 'Private Business' },
      data: { templateVisibility: TemplateVisibility.PRIVATE },
    });
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  it('returns at most `pageSize` templates per category, newest first', async () => {
    const result = await boardsService.findTemplates({ pageSize: 3 });

    const businessItems = result.items.filter(
      (item) => item.templateCategory === TemplateCategory.BUSINESS,
    );

    expect(businessItems).toHaveLength(3);
    expect(businessItems.map((i) => i.name)).toEqual([
      'Business 4 (newest)',
      'Business 3',
      'Business 2',
    ]);
  });

  it('excludes private templates from both the rows and the total count', async () => {
    const result = await boardsService.findTemplates({ pageSize: 3 });

    const names = result.items.map((i) => i.name);
    expect(names).not.toContain('Private Business');
    expect(result.total).toBe(5);
  });

  it('populates the owner relation correctly via the JOIN', async () => {
    const result = await boardsService.findTemplates({ pageSize: 3 });

    for (const item of result.items) {
      expect(item.owner.id).toBe(ownerId);
      expect(item.owner.email).toBe('template-owner@test.com');
    }
  });

  it('includes categories with fewer templates than pageSize', async () => {
    const result = await boardsService.findTemplates({ pageSize: 3 });

    const designItems = result.items.filter(
      (item) => item.templateCategory === TemplateCategory.DESIGN,
    );
    expect(designItems).toHaveLength(1);
    expect(designItems[0]).toMatchObject({ name: 'Design 1' });
  });
});
