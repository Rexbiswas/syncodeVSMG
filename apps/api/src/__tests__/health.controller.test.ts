import { describe, it, expect, vi } from 'vitest';
import { HealthController } from '../health/health.controller.js';
import type { HealthService } from '../health/health.service.js';
import type { Response } from 'express';

describe('HealthController', () => {
  it('should return 200 when system health is ok', async () => {
    const mockHealthService = {
      checkHealth: vi.fn().mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 10,
        version: '0.1.0',
        services: {
          api: { status: 'up', latencyMs: 0.1 },
          database: { status: 'up', latencyMs: 1.0, message: 'Connected' },
          redis: { status: 'up', latencyMs: 0.5, message: 'Connected' },
        },
      }),
    } as unknown as HealthService;

    const controller = new HealthController(mockHealthService);

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;

    await controller.getHealth(res);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
      }),
    );
  });

  it('should return 503 when system health is degraded or down', async () => {
    const mockHealthService = {
      checkHealth: vi.fn().mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 10,
        version: '0.1.0',
        services: {
          api: { status: 'up', latencyMs: 0.1 },
          database: { status: 'down', latencyMs: 5.0, message: 'Connection refused' },
          redis: { status: 'up', latencyMs: 0.5, message: 'Connected' },
        },
      }),
    } as unknown as HealthService;

    const controller = new HealthController(mockHealthService);

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;

    await controller.getHealth(res);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
      }),
    );
  });
});

