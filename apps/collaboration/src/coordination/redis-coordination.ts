import { Redis } from 'ioredis';
import pino from 'pino';

export type RedisUpdateHandler = (roomId: string, documentKey: string, update: Uint8Array, originInstanceId: string) => void;

export class RedisCoordination {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;
  private readonly instanceId: string;
  private readonly logger: pino.Logger;
  private readonly updateHandlers: Set<RedisUpdateHandler> = new Set();

  constructor(redisUrl: string, logger: pino.Logger) {
    this.logger = logger.child({ component: 'RedisCoordination' });
    this.instanceId = `instance_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: true,
      });

      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: true,
      });

      this.publisher.on('error', (err) => this.logger.warn({ error: err.message }, 'Redis publisher error'));
      this.subscriber.on('error', (err) => this.logger.warn({ error: err.message }, 'Redis subscriber error'));
    } catch (err: unknown) {
      this.logger.warn({ error: err }, 'Failed to initialize Redis clients - operating in standalone in-memory mode');
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.publisher || !this.subscriber) return false;

    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      this.isConnected = true;
      this.logger.info({ instanceId: this.instanceId }, 'Redis coordination connected');

      // Subscribe to cluster collaboration channel pattern
      await this.subscriber.psubscribe('collaboration:room:*');

      this.subscriber.on('pmessage', (_pattern, channel, message) => {
        try {
          // Channel format: collaboration:room:<roomId>:<documentKey>
          const parts = channel.split(':');
          if (parts.length < 4) return;
          const roomId = parts[2] || '';
          const documentKey = parts.slice(3).join(':');

          const payload = JSON.parse(message) as {
            origin: string;
            updateBase64: string;
          };

          // Ignore updates originating from this local instance
          if (payload.origin === this.instanceId) return;

          const update = new Uint8Array(Buffer.from(payload.updateBase64, 'base64'));
          for (const handler of this.updateHandlers) {
            handler(roomId, documentKey, update, payload.origin);
          }
        } catch (err: unknown) {
          this.logger.error({ error: err }, 'Error processing Redis pmessage');
        }
      });

      return true;
    } catch (err: unknown) {
      this.isConnected = false;
      this.logger.warn({ error: err }, 'Redis connection failed - continuing in standalone mode');
      return false;
    }
  }

  public onRemoteUpdate(handler: RedisUpdateHandler): () => void {
    this.updateHandlers.add(handler);
    return () => this.updateHandlers.delete(handler);
  }

  /**
   * Publishes an incremental Yjs binary update to other server instances.
   */
  public async publishUpdate(roomId: string, documentKey: string, update: Uint8Array): Promise<void> {
    if (!this.isConnected || !this.publisher) return;

    try {
      const channel = `collaboration:room:${roomId}:${documentKey}`;
      const message = JSON.stringify({
        origin: this.instanceId,
        updateBase64: Buffer.from(update).toString('base64'),
      });

      await this.publisher.publish(channel, message);
    } catch (err: unknown) {
      this.logger.warn({ error: err, roomId }, 'Failed to publish update to Redis');
    }
  }

  /**
   * Registers a user presence heartbeat in Redis with a 60-second TTL.
   */
  public async recordPresence(roomId: string, userId: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.isConnected || !this.publisher) return;

    try {
      const key = `collaboration:presence:${roomId}`;
      await this.publisher.hset(key, userId, JSON.stringify({ ...metadata, lastSeen: Date.now() }));
      await this.publisher.expire(key, 60);
    } catch (err: unknown) {
      this.logger.warn({ error: err, roomId, userId }, 'Failed to record presence in Redis');
    }
  }

  /**
   * Removes a user presence entry when disconnecting.
   */
  public async removePresence(roomId: string, userId: string): Promise<void> {
    if (!this.isConnected || !this.publisher) return;

    try {
      const key = `collaboration:presence:${roomId}`;
      await this.publisher.hdel(key, userId);
    } catch (err: unknown) {
      this.logger.warn({ error: err, roomId, userId }, 'Failed to remove presence from Redis');
    }
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    try {
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
    } catch {
      // Ignore cleanup error
    }
  }

  public getStatus(): { connected: boolean; instanceId: string } {
    return {
      connected: this.isConnected,
      instanceId: this.instanceId,
    };
  }
}
