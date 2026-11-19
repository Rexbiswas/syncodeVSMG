import dotenv from 'dotenv';
dotenv.config();

import { createCollaborationServer } from './server.js';

async function bootstrap() {
  const { server, env, logger, coordination, shutdown } = createCollaborationServer();

  const port = Number(env.COLLABORATION_PORT) || 4001;
  const host = env.COLLABORATION_HOST || '0.0.0.0';

  // Connect Redis coordination
  await coordination.connect();

  server.listen(port, host, () => {
    logger.info(
      `SYNCODE Real-Time Collaboration Engine running on http://${host}:${port} (WS Path: ${env.COLLABORATION_WS_PATH})`,
    );
  });

  async function handleShutdown(signal: string) {
    logger.info(`Received ${signal}. Shutting down collaboration server gracefully...`);
    await shutdown();
    process.exit(0);
  }

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during collaboration server startup:', err);
  process.exit(1);
});
