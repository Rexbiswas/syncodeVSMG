import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient, checkDatabaseHealth, DatabaseHealthResult, getPrismaClient } from '@syncode/database';
import { ConfigService } from '../config/config.service.js';
import { LoggerService } from '../logger/logger.service.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly client: PrismaClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.client = getPrismaClient(this.config.databaseUrl);
  }

  async onModuleInit() {
    this.logger.log('Initializing PostgreSQL database connection...', 'DatabaseService');
    try {
      await this.client.$connect();
      this.logger.log('PostgreSQL database connected successfully.', 'DatabaseService');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PostgreSQL initial connection pending or unreachable: ${msg}`, 'DatabaseService');
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Closing PostgreSQL connection on ${signal || 'shutdown'}...`, 'DatabaseService');
    await this.client.$disconnect();
    this.logger.log('PostgreSQL connection closed.', 'DatabaseService');
  }

  getPrisma(): PrismaClient {
    return this.client;
  }

  async checkHealth(): Promise<DatabaseHealthResult> {
    return checkDatabaseHealth(this.client);
  }
}

