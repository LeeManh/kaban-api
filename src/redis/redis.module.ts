import { ConfigType } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { redisConfig } from 'src/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [redisConfig.KEY],
      useFactory(cfg: ConfigType<typeof redisConfig>) {
        return new Redis(cfg.url);
      },
    },
    RedisService,
  ],
  exports: [REDIS, RedisService],
})
export class RedisModule {}
