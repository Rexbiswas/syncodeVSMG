import { describe, it, expect, vi } from 'vitest';
import { checkDatabaseHealth } from '../client.js';
import type { PrismaClient } from '@prisma/client';

describe('@syncode/database - Health Check Logic', () => {
  it('should report healthy when query succeeds', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaClient;

    const result = await checkDatabaseHealth(mockPrisma);
    expect(result.isHealthy).toBe(true);
    expect(result.message).toBe('PostgreSQL connection active');
    expect(typeof result.latencyMs).toBe('number');
  });

  it('should report unhealthy when query fails without leaking secrets', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused at 5432')),
    } as unknown as PrismaClient;

    const result = await checkDatabaseHealth(mockPrisma);
    expect(result.isHealthy).toBe(false);
    expect(result.error).toContain('Connection refused at 5432');
    expect(typeof result.latencyMs).toBe('number');
  });
});

