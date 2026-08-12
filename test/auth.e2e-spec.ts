import request from 'supertest';
import { E2eContext, setupE2eApp, teardownE2eApp } from './e2e-setup';

describe('Auth flow (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await setupE2eApp();
  });

  afterAll(async () => {
    await teardownE2eApp(ctx);
  });

  const email = 'e2e-auth@example.com';
  const password = 'password123';

  it('registers a new user and returns a token pair', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name: 'E2E User' })
      .expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejects registering the same email twice', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name: 'E2E User' })
      .expect(409);
  });

  it('rejects login with the wrong password', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in with the correct credentials and returns a token pair', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('refreshes the token pair with a valid refresh token', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const res = await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.data.refreshToken })
      .expect(201);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).not.toBe(login.body.data.refreshToken);
  });

  it('rejects reusing a refresh token that was already rotated', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const oldRefreshToken: string = login.body.data.refreshToken;

    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('logs out and revokes the refresh token', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const { accessToken, refreshToken } = login.body.data;

    await request(ctx.app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(204);

    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('rejects logout without an access token', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: 'not-a-real-token.but-jwt.shaped-x' })
      .expect(401);
  });
});
