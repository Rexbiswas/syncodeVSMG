/**
 * Standard API envelope format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Service health status indicators
 */
export type ServiceHealthStatus = 'up' | 'down';
export type OverallHealthState = 'ok' | 'degraded' | 'down';

export interface ServiceHealthCheckResult {
  status: ServiceHealthStatus;
  latencyMs?: number;
  message?: string;
  error?: string;
}

export interface SystemHealthResult {
  status: OverallHealthState;
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    api: ServiceHealthCheckResult;
    database: ServiceHealthCheckResult;
    redis: ServiceHealthCheckResult;
  };
}

