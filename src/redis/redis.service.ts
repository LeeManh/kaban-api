import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS } from './redis.constants';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async blacklist(jti: string, expUnix: number): Promise<void> {
    const ttl = expUnix - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(this.key(jti), '1', 'EX', ttl);
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(jti))) === 1;
  }

  async getTokenVersion(userId: string): Promise<number | null> {
    const raw = await this.redis.get(this.tokenVersionKey(userId));
    return raw !== null ? Number(raw) : null;
  }

  async setTokenVersion(
    userId: string,
    version: number,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      this.tokenVersionKey(userId),
      String(version),
      'EX',
      ttlSeconds,
    );
  }

  async invalidateTokenVersion(userId: string): Promise<void> {
    await this.redis.del(this.tokenVersionKey(userId));
  }

  async storeResetToken(
    tokenHash: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(this.resetKey(tokenHash), userId, 'EX', ttlSeconds);
  }

  async consumeResetToken(tokenHash: string): Promise<string | null> {
    return this.redis.getdel(this.resetKey(tokenHash));
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  private key(jti: string) {
    return `bl:access:${jti}`;
  }

  private resetKey(tokenHash: string) {
    return `pwreset:${tokenHash}`;
  }

  private tokenVersionKey(userId: string) {
    return `user:token-version:${userId}`;
  }
}
