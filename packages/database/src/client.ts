import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

let globalPrisma: PrismaClient | undefined;

export interface DatabaseHealthResult {
  isHealthy: boolean;
  latencyMs: number;
  message?: string;
  error?: string;
}

/**
 * Creates or retrieves the singleton Prisma Client instance
 */
export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });
  }
  return globalPrisma;
}

/**
 * Verifies database connectivity by executing a lightweight query
 */
export async function checkDatabaseHealth(
  client: PrismaClient,
): Promise<DatabaseHealthResult> {
  const start = performance.now();
  try {
    // Standard fast ping query in PostgreSQL
    await client.$queryRaw`SELECT 1`;
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      isHealthy: true,
      latencyMs,
      message: 'PostgreSQL connection active',
    };
  } catch (err) {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    const errorMsg = err instanceof Error ? err.message : 'Unknown database error';
    return {
      isHealthy: false,
      latencyMs,
      error: errorMsg,
    };
  }
}

/**
 * Disconnects the database client gracefully
 */
export async function disconnectDatabase(client?: PrismaClient): Promise<void> {
  const target = client ?? globalPrisma;
  if (target) {
    await target.$disconnect();
  }
}

