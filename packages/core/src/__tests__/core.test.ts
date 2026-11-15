import { describe, it, expect } from 'vitest';
import {
  DatabaseConnectionError,
  RedisConnectionError,
  measureExecutionTime,
  safeExecute,
} from '../index.js';

describe('@syncode/core - Errors and Utilities', () => {
  it('should create proper error instances with codes and statusCodes', () => {
    const dbErr = new DatabaseConnectionError('Failed to connect to PostgreSQL');
    expect(dbErr.code).toBe('DATABASE_CONNECTION_ERROR');
    expect(dbErr.statusCode).toBe(503);
    expect(dbErr.message).toBe('Failed to connect to PostgreSQL');

    const redisErr = new RedisConnectionError('Redis ping timeout');
    expect(redisErr.code).toBe('REDIS_CONNECTION_ERROR');
    expect(redisErr.statusCode).toBe(503);
  });

  it('should measure execution time accurately', () => {
    return measureExecutionTime(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 'ok';
    }).then(({ result, durationMs }) => {
      expect(result).toBe('ok');
      expect(durationMs).toBeGreaterThanOrEqual(15);
    });
  });

  it('should safely execute throwing functions without unhandled rejections', async () => {
    const outcome = await safeExecute(async () => {
      throw new Error('boom');
    });

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.error.message).toBe('boom');
    }
  });
});

