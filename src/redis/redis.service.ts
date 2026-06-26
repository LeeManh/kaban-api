import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from './redis.constants';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private key(jti: string) {
    return `bl:access:${jti}`;
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
}
