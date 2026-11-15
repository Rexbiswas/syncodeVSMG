import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../health/health.service.js';
import type { DatabaseService } from '../database/database.service.js';
import type { RedisService } from '../redis/redis.service.js';

describe('HealthService', () => {
  let healthService: HealthService;
  let mockDbService: DatabaseService;
  let mockRedisService: RedisService;

  beforeEach(() => {
    mockDbService = {
      checkHealth: vi.fn(),
    } as unknown as DatabaseService;

    mockRedisService = {
      checkHealth: vi.fn(),
    } as unknown as RedisService;

    healthService = new HealthService(mockDbService, mockRedisService);
  });

  it('should return ok when both database and redis are healthy', async () => {
    vi.spyOn(mockDbService, 'checkHealth').mockResolvedValue({
      isHealthy: true,
      latencyMs: 1.2,
      message: 'PostgreSQL connection active',
    });

    vi.spyOn(mockRedisService, 'checkHealth').mockResolvedValue({
      isHealthy: true,
      latencyMs: 0.8,
      message: 'Redis server responsive',
    });

    const result = await healthService.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.services.api.status).toBe('up');
    expect(result.services.database.status).toBe('up');
    expect(result.services.database.message).toBe('PostgreSQL connection active');
    expect(result.services.redis.status).toBe('up');
    expect(result.services.redis.message).toBe('Redis server responsive');
    expect(result.services.database.latencyMs).toBe(1.2);
    expect(result.services.redis.latencyMs).toBe(0.8);
  });

  it('should return degraded when database is down but redis is healthy', async () => {
    vi.spyOn(mockDbService, 'checkHealth').mockResolvedValue({
      isHealthy: false,
      latencyMs: 5.0,
      error: 'Connection refused',
    });

    vi.spyOn(mockRedisService, 'checkHealth').mockResolvedValue({
      isHealthy: true,
      latencyMs: 0.5,
      message: 'Redis server responsive',
    });

    const result = await healthService.checkHealth();

    expect(result.status).toBe('degraded');
    expect(result.services.api.status).toBe('up');
    expect(result.services.database.status).toBe('down');
    expect(result.services.database.message).toBe('Connection refused');
    expect(result.services.redis.status).toBe('up');
  });

  it('should return down when both database and redis are unhealthy', async () => {
    vi.spyOn(mockDbService, 'checkHealth').mockResolvedValue({
      isHealthy: false,
      latencyMs: 10.0,
      error: 'Database timeout',
    });

    vi.spyOn(mockRedisService, 'checkHealth').mockResolvedValue({
      isHealthy: false,
      latencyMs: 10.0,
      error: 'Redis offline',
    });

    const result = await healthService.checkHealth();

    expect(result.status).toBe('down');
    expect(result.services.api.status).toBe('up');
    expect(result.services.database.status).toBe('down');
    expect(result.services.redis.status).toBe('down');
  });
});

