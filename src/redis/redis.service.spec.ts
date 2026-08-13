import { RedisService } from './redis.service';

describe('RedisService', () => {
  describe('delByPattern', () => {
    it('deletes all keys matched across a single SCAN page', async () => {
      const redis = {
        scan: jest.fn().mockResolvedValue(['0', ['tpl:browse:3']]),
        del: jest.fn(),
      };
      const service = new RedisService(redis as never);

      await service.delByPattern('tpl:browse:*');

      expect(redis.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'tpl:browse:*',
        'COUNT',
        100,
      );
      expect(redis.del).toHaveBeenCalledWith('tpl:browse:3');
    });

    it('follows the cursor across multiple SCAN pages until it returns to 0', async () => {
      const redis = {
        scan: jest
          .fn()
          .mockResolvedValueOnce(['17', ['tpl:filtered:a']])
          .mockResolvedValueOnce(['0', ['tpl:filtered:b']]),
        del: jest.fn(),
      };
      const service = new RedisService(redis as never);

      await service.delByPattern('tpl:filtered:*');

      expect(redis.scan).toHaveBeenCalledTimes(2);
      expect(redis.del).toHaveBeenCalledWith('tpl:filtered:a');
      expect(redis.del).toHaveBeenCalledWith('tpl:filtered:b');
    });

    it('does not call del when no keys match', async () => {
      const redis = {
        scan: jest.fn().mockResolvedValue(['0', []]),
        del: jest.fn(),
      };
      const service = new RedisService(redis as never);

      await service.delByPattern('tpl:browse:*');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
