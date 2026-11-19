import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createCollaborationServer } from '../server.js';

describe('Collaboration Service Foundation - Health & Metrics Endpoints', () => {
  const instance = createCollaborationServer({
    COLLABORATION_PORT: 0,
    COLLABORATION_HOST: '127.0.0.1',
    LOG_LEVEL: 'silent',
  });

  const { app, shutdown } = instance;

  afterAll(async () => {
    if (typeof shutdown === 'function') {
      await shutdown();
    }
  });

  it('GET /health should return valid service health contract', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(res.body.service).toBe('collaboration');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBe('0.1.0');
  });

  it('GET /metrics should return 200 with room metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(typeof res.body.activeRooms).toBe('number');
    expect(typeof res.body.totalConnections).toBe('number');
    expect(typeof res.body.uptime).toBe('number');
  });
});

