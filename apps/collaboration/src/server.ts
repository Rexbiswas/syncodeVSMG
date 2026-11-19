import http from 'http';
import express, { Express, Request, Response } from 'express';
import pino from 'pino';
import { collaborationEnvSchema, validateEnv, CollaborationEnv } from '@syncode/validation';
import { getPrismaClient, checkDatabaseHealth, disconnectDatabase } from '@syncode/database';
import { TokenVerifier } from './auth/token-verifier.js';
import { RoomAuthorizer } from './auth/room-authorizer.js';
import { PostgresPersistence } from './persistence/postgres-persistence.js';
import { RedisCoordination } from './coordination/redis-coordination.js';
import { DocumentManager } from './engine/document-manager.js';
import { CollaborationWebSocketServer } from './transport/websocket-server.js';

export interface CollaborationServerDependencies {
  tokenVerifier?: TokenVerifier;
  roomAuthorizer?: RoomAuthorizer;
  persistence?: PostgresPersistence;
  coordination?: RedisCoordination;
  documentManager?: DocumentManager;
}

export function createCollaborationServer(
  customEnv?: Partial<CollaborationEnv>,
  dependencies?: CollaborationServerDependencies,
) {
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

  // 1. Initialize Prisma Database Connection
  const prisma = getPrismaClient(env.DATABASE_URL);

  // 2. Initialize Redis Coordination
  const coordination = dependencies?.coordination ?? new RedisCoordination(env.REDIS_URL, logger);

  // 3. Initialize Domain Services
  const tokenVerifier = dependencies?.tokenVerifier ?? new TokenVerifier(env.JWT_ACCESS_SECRET);
  const roomAuthorizer = dependencies?.roomAuthorizer ?? new RoomAuthorizer(prisma);
  const persistence = dependencies?.persistence ?? new PostgresPersistence(prisma, logger);
  const documentManager =
    dependencies?.documentManager ??
    new DocumentManager({
      persistence,
      coordination,
      logger,
      idleTimeoutMs: env.COLLABORATION_IDLE_TIMEOUT_MS,
    });

  // 4. Create HTTP Server wrapping Express
  const httpServer = http.createServer(app);

  // 5. Attach WebSocket Server
  const wsServer = new CollaborationWebSocketServer({
    server: httpServer,
    wsPath: env.COLLABORATION_WS_PATH,
    tokenVerifier,
    roomAuthorizer,
    documentManager,
    logger,
    maxPayloadBytes: env.COLLABORATION_MAX_PAYLOAD_BYTES,
  });

  // Health endpoint with deep dependency checks
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealth = await checkDatabaseHealth(prisma);
    const redisStatus = coordination.getStatus();
    const metrics = documentManager.getMetrics();

    const isHealthy = dbHealth.isHealthy;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'collaboration',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      database: {
        isHealthy: dbHealth.isHealthy,
        latencyMs: dbHealth.latencyMs,
      },
      redis: {
        connected: redisStatus.connected,
        instanceId: redisStatus.instanceId,
      },
      metrics: {
        activeRooms: metrics.activeRooms,
        totalConnections: metrics.totalConnections,
      },
    });
  });

  // Active rooms metrics endpoint
  app.get('/metrics', (_req: Request, res: Response) => {
    const metrics = documentManager.getMetrics();
    res.status(200).json({
      uptime: process.uptime(),
      ...metrics,
    });
  });

  /**
   * Gracefully shuts down the collaboration server
   */
  async function shutdown(): Promise<void> {
    logger.info('Shutting down collaboration server...');
    try {
      await wsServer.close();
      await documentManager.flushAllAndClose();
      await coordination.disconnect();
      await disconnectDatabase(prisma);
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      logger.info('Collaboration server shutdown complete.');
    } catch (err: unknown) {
      logger.error({ error: err }, 'Error during collaboration server shutdown');
    }
  }

  return {
    app,
    server: httpServer,
    env,
    logger,
    prisma,
    coordination,
    documentManager,
    wsServer,
    shutdown,
  };
}
