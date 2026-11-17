import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';
import { LoggerService } from '../../logger/logger.service.js';

export interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class AuthRateLimiterService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Checks and increments the rate limit counter for a given key.
   * If Redis is unreachable, it logs a warning and fails open to avoid locking users out.
   */
  async checkRateLimit(
    key: string,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const prefixedKey = `ratelimit:${key}`;
    try {
      const client = this.redisService.getClient();
      if (client.status !== 'ready' && client.status !== 'connect') {
        return { isLimited: false, remaining: maxAttempts, retryAfterSeconds: 0 };
      }

      const results = await client
        .multi()
        .incr(prefixedKey)
        .ttl(prefixedKey)
        .exec();

      if (!results || results.length < 2) {
        return { isLimited: false, remaining: maxAttempts, retryAfterSeconds: 0 };
      }

      const [incrErr, countVal] = results[0] as [Error | null, number];
      const [, ttlVal] = results[1] as [Error | null, number];

      if (incrErr) {
        this.logger.warn(`Redis rate limit incr error: ${incrErr.message}`, 'AuthRateLimiterService');
        return { isLimited: false, remaining: maxAttempts, retryAfterSeconds: 0 };
      }

      const count = Number(countVal);
      let ttl = Number(ttlVal);

      // If key had no expiration, set it now
      if (ttl === -1) {
        await client.expire(prefixedKey, windowSeconds);
        ttl = windowSeconds;
      }

      if (count > maxAttempts) {
        return {
          isLimited: true,
          remaining: 0,
          retryAfterSeconds: Math.max(ttl, 1),
        };
      }

      return {
        isLimited: false,
        remaining: Math.max(maxAttempts - count, 0),
        retryAfterSeconds: 0,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rate limiter Redis error: ${msg}. Failing open.`, 'AuthRateLimiterService');
      return { isLimited: false, remaining: maxAttempts, retryAfterSeconds: 0 };
    }
  }

  /**
   * Resets the rate limit counter (e.g. after successful login)
   */
  async reset(key: string): Promise<void> {
    const prefixedKey = `ratelimit:${key}`;
    try {
      const client = this.redisService.getClient();
      if (client.status === 'ready' || client.status === 'connect') {
        await client.del(prefixedKey);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to reset rate limiter key ${key}: ${msg}`, 'AuthRateLimiterService');
    }
  }
}
