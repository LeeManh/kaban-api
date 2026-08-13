import request from 'supertest';
import {
  API_PREFIX,
  E2eContext,
  setupE2eApp,
  teardownE2eApp,
} from './e2e-setup';

describe('Boards flow (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await setupE2eApp();
  });

  afterAll(async () => {
    await teardownE2eApp(ctx);
  });

  const registerAndLogin = async (email: string) => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/auth/register`)
      .send({ email, password: 'password123', name: email })
      .expect(200);
    return res.body.data.accessToken as string;
  };

  it('creates a board and adds a member with a limited role', async () => {
    const ownerToken = await registerAndLogin('owner@example.com');
    const memberToken = await registerAndLogin('member@example.com');

    const createRes = await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Board A', background: '#fff' })
      .expect(201);
    const boardId: string = createRes.body.data.id;

    await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member@example.com' })
      .expect(201);

    const membersRes = await request(ctx.app.getHttpServer())
      .get(`${API_PREFIX}/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(membersRes.body.data).toHaveLength(2);
  });

  it('blocks a regular member from performing an ADMIN-only action', async () => {
    const ownerToken = await registerAndLogin('owner2@example.com');
    const memberToken = await registerAndLogin('member2@example.com');

    const createRes = await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Board B', background: '#fff' })
      .expect(201);
    const boardId: string = createRes.body.data.id;

    await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member2@example.com' })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'someone-else@example.com' })
      .expect(403);
  });

  it('blocks a user with no membership at all from viewing the board', async () => {
    const ownerToken = await registerAndLogin('owner3@example.com');
    await registerAndLogin('outsider@example.com');
    const outsiderToken = await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: 'outsider@example.com', password: 'password123' })
      .then((res) => res.body.data.accessToken as string);

    const createRes = await request(ctx.app.getHttpServer())
      .post(`${API_PREFIX}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Board C', background: '#fff' })
      .expect(201);
    const boardId: string = createRes.body.data.id;

    await request(ctx.app.getHttpServer())
      .get(`${API_PREFIX}/boards/${boardId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });
});
