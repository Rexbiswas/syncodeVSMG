import { HealthResponse } from '@syncode/validation';
import { getWebEnv } from './env';

export interface ApiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config?: ApiClientConfig) {
    const webEnv = getWebEnv();
    this.baseUrl = config?.baseUrl || webEnv.NEXT_PUBLIC_API_URL;
    this.timeoutMs = config?.timeoutMs || 5000;
  }

  /**
   * Fetches health status from NestJS backend (/api/v1/health)
   */
  async getHealth(): Promise<{ data?: HealthResponse; error?: string; status: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}/health`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => null);

      if (!json) {
        return {
          error: `Non-JSON response from API (${res.status} ${res.statusText})`,
          status: res.status,
        };
      }

      return {
        data: json as HealthResponse,
        status: res.status,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        error: isAbort ? 'Request timed out connecting to API' : 'Failed to reach API service (offline or unreachable)',
        status: 0,
        data: {
          status: 'down',
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '0.1.0',
          services: {
            api: { status: 'down', message: 'API service is not running or unreachable' },
            database: { status: 'down', message: 'Unknown (API unreachable)' },
            redis: { status: 'down', message: 'Unknown (API unreachable)' },
          },
        },
      };
    }
  }
}

export const apiClient = new ApiClient();

