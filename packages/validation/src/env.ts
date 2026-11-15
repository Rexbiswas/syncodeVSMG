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

