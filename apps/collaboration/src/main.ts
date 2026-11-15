import dotenv from 'dotenv';
dotenv.config();

import { createCollaborationServer } from './server.js';

const { app, env, logger } = createCollaborationServer();

const port = Number(env.COLLABORATION_PORT) || 4001;
const host = env.COLLABORATION_HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  logger.info(
    `SYNCODE Collaboration Foundation Service running on http://${host}:${port}`,
  );
});

function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down collaboration server gracefully...`);
  server.close(() => {
    logger.info('Collaboration server closed cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully terminating collaboration server after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

