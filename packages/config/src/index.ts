/**
 * Shared configuration constants for SYNCODE
 */
export const APP_CONSTANTS = {
  NAME: 'SYNCODE',
  VERSION: '0.1.0',
  DESCRIPTION: 'Universal Real-Time Code Collaboration Platform',
  DEFAULT_PORTS: {
    WEB: 3000,
    API: 4000,
    COLLABORATION: 4001,
    POSTGRES: 5432,
    REDIS: 6379,
  },
  API_PREFIX: '/api/v1',
  HEALTH_ROUTE: '/health',
} as const;

export type AppEnvironment = 'development' | 'production' | 'test';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
