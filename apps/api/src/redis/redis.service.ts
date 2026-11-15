import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service.js';
import { LoggerService } from '../logger/logger.service.js';

export interface RedisHealthResult {
  isHealthy: boolean;
  latencyMs: number;
  message?: string;
  error?: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private client!: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.initClient();
  }

  private initClient(): void {
    const redisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts during initialization
        }
        return Math.min(times * 500, 2000);
      },
    };

    if (this.config.redisUrl) {
      this.client = new Redis(this.config.redisUrl, redisOptions);
    } else {
      this.client = new Redis({
        host: this.config.redisHost,
        port: this.config.redisPort,
        password: this.config.redisPassword,
        ...redisOptions,
      });
    }

    this.client.on('connect', () => {
      this.logger.log('Redis client connected to server.', 'RedisService');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client is ready for operations.', 'RedisService');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, undefined, 'RedisService');
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed.', 'RedisService');
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to Redis server...', 'RedisService');
    try {
      await this.client.connect();
      this.logger.log('Redis connection established successfully.', 'RedisService');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis initial connection pending or unreachable: ${msg}`, 'RedisService');
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Closing Redis connection on ${signal || 'shutdown'}...`, 'RedisService');
    try {
      if (this.client.status !== 'end') {
        await this.client.quit();
      }
      this.logger.log('Redis connection closed gracefully.', 'RedisService');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error disconnecting Redis: ${msg}`, undefined, 'RedisService');
      this.client.disconnect();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async checkHealth(): Promise<RedisHealthResult> {
    const start = performance.now();
    try {
      if (this.client.status !== 'ready' && this.client.status !== 'connect') {
        // Attempt quick connect if not yet connected
        try {
          await this.client.connect();
        } catch {
          // Fall through to ping check
        }
      }

      const response = await this.client.ping();
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;

      if (response === 'PONG') {
        return {
          isHealthy: true,
          latencyMs,
          message: 'Redis server responsive',
        };
      }

      return {
        isHealthy: false,
        latencyMs,
        error: `Unexpected Redis ping response: ${response}`,
      };
    } catch (err) {
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      const errorMsg = err instanceof Error ? err.message : 'Redis unreachable';
      return {
        isHealthy: false,
        latencyMs,
        error: errorMsg,
      };
    }
  }
}

