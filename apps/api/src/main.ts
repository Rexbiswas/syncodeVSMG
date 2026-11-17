import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';
import { LoggerService } from './logger/logger.service.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);

  // Attach structured Pino logger to NestJS
  app.useLogger(loggerService);

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  // Security middlewares
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    cors({
      origin: configService.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    }),
  );

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // Global Exception Filter & Interceptor
  app.useGlobalFilters(new GlobalExceptionFilter(loggerService));
  app.useGlobalInterceptors(new LoggingInterceptor(loggerService));

  const port = configService.port;
  const host = configService.host;

  await app.listen(port, host);
  loggerService.log(
    `🚀 SYNCODE API Service listening at http://${host}:${port}/api/v1`,
    'Bootstrap',
  );
  loggerService.log(
    `💓 Health check endpoint available at http://${host}:${port}/api/v1/health`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Fatal error during application startup:', err);
  process.exit(1);
});
