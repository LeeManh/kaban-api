import request from 'supertest';
import { E2eContext, setupE2eApp, teardownE2eApp } from './e2e-setup';

describe('Cards flow (e2e)', () => {
  let ctx: E2eContext;
  let token: string;
  let boardId: string;

  beforeAll(async () => {
    ctx = await setupE2eApp();

    const registerRes = await request(ctx.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'cards-e2e@example.com',
        password: 'password123',
        name: 'Cards E2E',
      })
      .expect(200);
    token = registerRes.body.data.accessToken;

    const boardRes = await request(ctx.app.getHttpServer())
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cards Board', background: '#fff' })
      .expect(201);
    boardId = boardRes.body.data.id;
  });

  afterAll(async () => {
    await teardownE2eApp(ctx);
  });

  it('creates a list', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Todo' })
      .expect(201);

    expect(res.body.data.title).toBe('Todo');
    expect(res.body.data.order).toBe(1000);
  });

  it('creates two cards in the list, appended in order', async () => {
    const listRes = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'In Progress' })
      .expect(201);
    const listId: string = listRes.body.data.id;

    const cardA = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists/${listId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card A' })
      .expect(201);
    const cardB = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists/${listId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card B' })
      .expect(201);

    expect(cardA.body.data.order).toBe(1000);
    expect(cardB.body.data.order).toBe(2000);

    const listCards = await request(ctx.app.getHttpServer())
      .get(`/api/boards/${boardId}/lists/${listId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listCards.body.data.map((c: { title: string }) => c.title)).toEqual([
      'Card A',
      'Card B',
    ]);
  });

  it('moves a card to the front of the list', async () => {
    const listRes = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Done' })
      .expect(201);
    const listId: string = listRes.body.data.id;

    const cardA = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists/${listId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card A' })
      .expect(201);
    const cardB = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists/${listId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card B' })
      .expect(201);
    const cardIdA: string = cardA.body.data.id;
    const cardIdB: string = cardB.body.data.id;

    await request(ctx.app.getHttpServer())
      .patch(`/api/boards/${boardId}/cards/${cardIdB}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ afterId: cardIdA })
      .expect(200);

    const listCards = await request(ctx.app.getHttpServer())
      .get(`/api/boards/${boardId}/lists/${listId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listCards.body.data.map((c: { title: string }) => c.title)).toEqual([
      'Card B',
      'Card A',
    ]);
  });

  it('moves a card to a different list', async () => {
    const listRes1 = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Source' })
      .expect(201);
    const listRes2 = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Target' })
      .expect(201);
    const sourceListId: string = listRes1.body.data.id;
    const targetListId: string = listRes2.body.data.id;

    const card = await request(ctx.app.getHttpServer())
      .post(`/api/boards/${boardId}/lists/${sourceListId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Movable card' })
      .expect(201);
    const cardId: string = card.body.data.id;

    const moveRes = await request(ctx.app.getHttpServer())
      .patch(`/api/boards/${boardId}/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ listId: targetListId })
      .expect(200);

    expect(moveRes.body.data.listId).toBe(targetListId);

    const targetCards = await request(ctx.app.getHttpServer())
      .get(`/api/boards/${boardId}/lists/${targetListId}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(targetCards.body.data).toHaveLength(1);
    expect(targetCards.body.data[0].id).toBe(cardId);
  });
});
