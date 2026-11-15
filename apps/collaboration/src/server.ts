import express, { Express, Request, Response } from 'express';
import pino from 'pino';
import { collaborationEnvSchema, validateEnv, CollaborationEnv } from '@syncode/validation';

export function createCollaborationServer(customEnv?: Partial<CollaborationEnv>) {
  const env = validateEnv(collaborationEnvSchema, {
    ...process.env,
    ...customEnv,
  });

  const logger = pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { colorize: true },
          }
        : undefined,
  });

  const app: Express = express();
  app.use(express.json());

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'collaboration',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  return { app, env, logger };
}

