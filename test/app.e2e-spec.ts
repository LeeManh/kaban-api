import request from 'supertest';
import { E2eContext, setupE2eApp, teardownE2eApp } from './e2e-setup';

describe('App bootstrap (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await setupE2eApp();
  });

  afterAll(async () => {
    await teardownE2eApp(ctx);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(ctx.app.getHttpServer()).get('/api/boards').expect(401);
  });

  it('returns 404 for an unknown route', async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/this-route-does-not-exist')
      .expect(404);
  });
});
