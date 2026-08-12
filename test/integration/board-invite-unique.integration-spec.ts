import { Prisma } from 'generated/prisma/client';
import {
  setupTestDatabase,
  teardownTestDatabase,
  TestDatabase,
} from './setup-test-db';

describe('Board invite unique constraint (integration)', () => {
  let db: TestDatabase;
  let boardId: string;
  let inviterId: string;

  beforeAll(async () => {
    db = await setupTestDatabase();

    const inviter = await db.prisma.user.create({
      data: { email: 'inviter@test.com', password: 'x', name: 'Inviter' },
    });
    inviterId = inviter.id;
    const board = await db.prisma.board.create({
      data: { name: 'Board', background: '#fff', ownerId: inviter.id },
    });
    boardId = board.id;
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  it('allows two invites with different token hashes', async () => {
    await db.prisma.boardInvite.create({
      data: {
        boardId,
        email: 'a@test.com',
        tokenHash: 'hash-a',
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    await db.prisma.boardInvite.create({
      data: {
        boardId,
        email: 'b@test.com',
        tokenHash: 'hash-b',
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    const count = await db.prisma.boardInvite.count({ where: { boardId } });
    expect(count).toBe(2);
  });

  it('rejects a second invite reusing the same token hash', async () => {
    await db.prisma.boardInvite.create({
      data: {
        boardId,
        email: 'c@test.com',
        tokenHash: 'duplicate-hash',
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    expect.assertions(2);
    try {
      await db.prisma.boardInvite.create({
        data: {
          boardId,
          email: 'd@test.com',
          tokenHash: 'duplicate-hash',
          invitedById: inviterId,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    }
  });
});
