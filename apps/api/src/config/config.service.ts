import { Injectable } from '@nestjs/common';
import { validateApiEnv, ApiEnv } from '@syncode/validation';

@Injectable()
export class ConfigService {
  private readonly env: ApiEnv;

  constructor() {
    this.env = validateApiEnv(process.env);
  }

  get nodeEnv(): string {
    return this.env.NODE_ENV;
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get logLevel(): string {
    return this.env.LOG_LEVEL;
  }

  get port(): number {
    return this.env.API_PORT;
  }

  get host(): string {
    return this.env.API_HOST;
  }

  get corsOrigin(): string {
    return this.env.CORS_ORIGIN;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get redisHost(): string {
    return this.env.REDIS_HOST;
  }

  get redisPort(): number {
    return this.env.REDIS_PORT;
  }

  get redisPassword(): string | undefined {
    return this.env.REDIS_PASSWORD || undefined;
  }
}

