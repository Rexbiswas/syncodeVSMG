import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../lib/api-client';

describe('@syncode/web - ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and return health status when API returns 200', async () => {
    const mockHealthResponse = {
      status: 'ok',
      timestamp: '2026-11-15T12:00:00.000Z',
      uptime: 100,
      version: '0.1.0',
      services: {
        api: { status: 'up', latencyMs: 0.1 },
        database: { status: 'up', latencyMs: 1.0, message: 'Connected' },
        redis: { status: 'up', latencyMs: 0.5, message: 'Connected' },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue(mockHealthResponse),
    } as unknown as Response);

    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    const result = await client.getHealth();

    expect(result.status).toBe(200);
    expect(result.data?.status).toBe('ok');
    expect(result.data?.services.database.status).toBe('up');
  });

  it('should handle offline API gracefully without throwing unhandled exceptions', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    const result = await client.getHealth();

    expect(result.status).toBe(0);
    expect(result.data?.status).toBe('down');
    expect(result.data?.services.api.status).toBe('down');
    expect(result.error).toContain('Failed to reach API service');
  });
});

