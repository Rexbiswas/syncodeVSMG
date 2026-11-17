import { z } from 'zod';

export const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export const environments = ['development', 'production', 'test'] as const;

/**
 * Backend API Environment Schema
 */
export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(environments).default('development'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .min(1, 'DATABASE_URL is required'),
  REDIS_URL: z
    .string({ required_error: 'REDIS_URL is required' })
    .min(1, 'REDIS_URL is required'),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.coerce.number().optional().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Phase 2: JWT & Authentication Secrets
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
    .default('syncode_super_secret_jwt_access_key_change_in_production_min32chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  AUTH_COOKIE_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .default(false),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Phase 2: Google OAuth (Optional - only enabled when configured)
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z
    .string()
    .optional()
    .default('http://localhost:4000/api/v1/auth/google/callback'),

  // Phase 2: SMTP / Email Delivery (Optional)
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('no-reply@syncode.dev'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

/**
 * Frontend Web App Environment Schema
 */
export const webEnvSchema = z.object({
  NODE_ENV: z.enum(environments).default('development'),
  PORT: z.coerce.number().int().positive().optional().default(3000),
  WEB_URL: z.string().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().min(1).default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_APP_NAME: z.string().default('SYNCODE'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('0.1.0'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

/**
 * Collaboration Service Environment Schema
 */
export const collaborationEnvSchema = z.object({
  NODE_ENV: z.enum(environments).default('development'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  COLLABORATION_PORT: z.coerce.number().int().positive().default(4001),
  COLLABORATION_HOST: z.string().min(1).default('0.0.0.0'),
});

export type CollaborationEnv = z.infer<typeof collaborationEnvSchema>;

export function validateApiEnv(env: Record<string, unknown>): ApiEnv {
  return apiEnvSchema.parse(env);
}

export function validateWebEnv(env: Record<string, unknown>): WebEnv {
  return webEnvSchema.parse(env);
}

export function validateCollaborationEnv(env: Record<string, unknown>): CollaborationEnv {
  return collaborationEnvSchema.parse(env);
}
