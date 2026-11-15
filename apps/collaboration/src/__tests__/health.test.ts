import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createCollaborationServer } from '../server.js';

describe('Collaboration Service Foundation - Health Endpoint', () => {
  const { app } = createCollaborationServer({
    COLLABORATION_PORT: 4001,
    COLLABORATION_HOST: '127.0.0.1',
    LOG_LEVEL: 'silent',
  });

  it('GET /health should return 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('collaboration');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});

