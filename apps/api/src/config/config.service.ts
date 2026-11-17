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

  // ---------------------------------------------------------------------------
  // Phase 2: Authentication & Token Configuration
  // ---------------------------------------------------------------------------

  get jwtAccessSecret(): string {
    return this.env.JWT_ACCESS_SECRET;
  }

  get jwtAccessExpiresIn(): string {
    return this.env.JWT_ACCESS_EXPIRES_IN;
  }

  get refreshTokenExpiresIn(): string {
    return this.env.REFRESH_TOKEN_EXPIRES_IN;
  }

  get authCookieSecure(): boolean {
    return this.env.AUTH_COOKIE_SECURE;
  }

  get authCookieSameSite(): 'lax' | 'strict' | 'none' {
    return this.env.AUTH_COOKIE_SAME_SITE;
  }

  get googleClientId(): string {
    return this.env.GOOGLE_CLIENT_ID;
  }

  get googleClientSecret(): string {
    return this.env.GOOGLE_CLIENT_SECRET;
  }

  get googleCallbackUrl(): string {
    return this.env.GOOGLE_CALLBACK_URL;
  }

  get isGoogleAuthEnabled(): boolean {
    return Boolean(this.env.GOOGLE_CLIENT_ID && this.env.GOOGLE_CLIENT_SECRET);
  }

  get smtpHost(): string {
    return this.env.SMTP_HOST;
  }

  get smtpPort(): number {
    return this.env.SMTP_PORT;
  }

  get smtpUser(): string {
    return this.env.SMTP_USER;
  }

  get smtpPassword(): string {
    return this.env.SMTP_PASSWORD;
  }

  get emailFrom(): string {
    return this.env.EMAIL_FROM;
  }

  get isEmailDeliveryEnabled(): boolean {
    return Boolean(this.env.SMTP_HOST && this.env.SMTP_USER);
  }
}
