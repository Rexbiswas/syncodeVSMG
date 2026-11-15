import { describe, it, expect } from 'vitest';
import { apiEnvSchema, webEnvSchema, collaborationEnvSchema, validateEnv } from '../index.js';

describe('@syncode/validation - Environment Validation', () => {
  it('should validate valid API environment variables', () => {
    const rawEnv = {
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      API_PORT: '4000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/syncode',
      REDIS_URL: 'redis://localhost:6379',
    };

    const validated = validateEnv(apiEnvSchema, rawEnv);
    expect(validated.NODE_ENV).toBe('development');
    expect(validated.API_PORT).toBe(4000);
    expect(validated.DATABASE_URL).toBe(rawEnv.DATABASE_URL);
    expect(validated.REDIS_URL).toBe(rawEnv.REDIS_URL);
  });

  it('should fail API environment validation when required variables are missing', () => {
    const rawEnv = {
      NODE_ENV: 'development',
      // Missing DATABASE_URL and REDIS_URL
    };

    expect(() => validateEnv(apiEnvSchema, rawEnv)).toThrowError(/DATABASE_URL is required/);
  });

  it('should validate valid Web environment variables with defaults', () => {
    const rawEnv = {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
    };

    const validated = validateEnv(webEnvSchema, rawEnv);
    expect(validated.NEXT_PUBLIC_APP_NAME).toBe('SYNCODE');
    expect(validated.NEXT_PUBLIC_APP_VERSION).toBe('0.1.0');
    expect(validated.NEXT_PUBLIC_API_URL).toBe('http://localhost:4000/api/v1');
  });

  it('should validate collaboration service environment variables', () => {
    const rawEnv = {
      COLLABORATION_PORT: '4001',
      COLLABORATION_HOST: '127.0.0.1',
    };

    const validated = validateEnv(collaborationEnvSchema, rawEnv);
    expect(validated.COLLABORATION_PORT).toBe(4001);
    expect(validated.COLLABORATION_HOST).toBe('127.0.0.1');
    expect(validated.LOG_LEVEL).toBe('info');
  });
});

