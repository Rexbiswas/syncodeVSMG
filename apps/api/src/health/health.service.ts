import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { APP_CONSTANTS } from '@syncode/config';
import { HealthResponse } from '@syncode/validation';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  async checkHealth(): Promise<HealthResponse> {
    const apiStart = performance.now();
    const [dbResult, redisResult] = await Promise.all([
      this.databaseService.checkHealth(),
      this.redisService.checkHealth(),
    ]);
    const apiLatency = Math.round((performance.now() - apiStart) * 100) / 100;

    const isDbUp = dbResult.isHealthy;
    const isRedisUp = redisResult.isHealthy;

    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
    if (!isDbUp && !isRedisUp) {
      overallStatus = 'down';
    } else if (!isDbUp || !isRedisUp) {
      overallStatus = 'degraded';
    }

    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      version: APP_CONSTANTS.VERSION,
      services: {
        api: {
          status: 'up',
          latencyMs: apiLatency,
        },
        database: {
          status: isDbUp ? 'up' : 'down',
          latencyMs: dbResult.latencyMs,
          message: isDbUp ? dbResult.message : (dbResult.error ?? 'Database unavailable'),
        },
        redis: {
          status: isRedisUp ? 'up' : 'down',
          latencyMs: redisResult.latencyMs,
          message: isRedisUp ? redisResult.message : (redisResult.error ?? 'Redis unavailable'),
        },
      },
    };
  }
}

