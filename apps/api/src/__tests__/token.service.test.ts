process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_min16chars_long';

import { describe, it, expect } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../auth/token.service.js';
import { ConfigService } from '../config/config.service.js';

describe('TokenService', () => {
  const jwtService = new JwtService();
  const config = new ConfigService();
  const service = new TokenService(jwtService, config);

  it('should generate a signed JWT access token and verify its payload', () => {
    const payload = {
      sub: 'user-uuid-123',
      email: 'user@example.com',
      username: 'testuser',
      sessionId: 'session-uuid-456',
    };

    const { token, expiresInSeconds } = service.generateAccessToken(payload);
    expect(token).toBeDefined();
    expect(expiresInSeconds).toBeGreaterThan(0);

    const verified = service.verifyAccessToken(token);
    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(verified.username).toBe(payload.username);
    expect(verified.sessionId).toBe(payload.sessionId);
  });

  it('should generate distinct cryptographically random refresh tokens', () => {
    const token1 = service.generateRefreshToken();
    const token2 = service.generateRefreshToken();

    expect(token1).toHaveLength(80); // 40 bytes hex
    expect(token2).toHaveLength(80);
    expect(token1).not.toBe(token2);
  });

  it('should hash tokens with SHA-256 consistently', () => {
    const raw = 'random-token-secret-string';
    const hash1 = service.hashToken(raw);
    const hash2 = service.hashToken(raw);

    expect(hash1).toHaveLength(64); // SHA-256 hex
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(raw);
  });

  it('should calculate future expiration date for refresh tokens', () => {
    const now = Date.now();
    const expiresAt = service.getRefreshTokenExpiresAt();

    expect(expiresAt.getTime()).toBeGreaterThan(now + 6 * 24 * 60 * 60 * 1000); // at least ~6 days ahead
  });
});
