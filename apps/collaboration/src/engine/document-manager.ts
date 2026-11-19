import pino from 'pino';
import { PostgresPersistence } from '../persistence/postgres-persistence.js';
import { RedisCoordination } from '../coordination/redis-coordination.js';
import { ManagedRoom } from './managed-room.js';

export class DocumentManager {
  private readonly rooms: Map<string, ManagedRoom> = new Map();
  private readonly persistence: PostgresPersistence;
  private readonly coordination: RedisCoordination;
  private readonly logger: pino.Logger;
  private readonly idleTimeoutMs: number;

  constructor(options: {
    persistence: PostgresPersistence;
    coordination: RedisCoordination;
    logger: pino.Logger;
    idleTimeoutMs: number;
  }) {
    this.persistence = options.persistence;
    this.coordination = options.coordination;
    this.logger = options.logger.child({ component: 'DocumentManager' });
    this.idleTimeoutMs = options.idleTimeoutMs;

    // Listen to updates published from other nodes in the cluster
    this.coordination.onRemoteUpdate((roomId, documentKey, update) => {
      const roomKey = this.getRoomKey(roomId, documentKey);
      const room = this.rooms.get(roomKey);
      if (room) {
        room.applyRemoteClusterUpdate(update);
      }
    });
  }

  private getRoomKey(roomId: string, documentKey: string): string {
    return `${roomId}:${documentKey}`;
  }

  /**
   * Retrieves an in-memory active room or restores it from PostgreSQL.
   */
  public async getOrCreateRoom(roomId: string, documentKey: string = 'default'): Promise<ManagedRoom> {
    const roomKey = this.getRoomKey(roomId, documentKey);
    let room = this.rooms.get(roomKey);

    if (room) {
      return room;
    }

    // Load existing document state from PostgreSQL (or create document record)
    const { doc, documentId } = await this.persistence.getOrCreateDocument(roomId, documentKey);

    room = new ManagedRoom({
      roomId,
      documentKey,
      documentId,
      doc,
      persistence: this.persistence,
      coordination: this.coordination,
      logger: this.logger,
      idleTimeoutMs: this.idleTimeoutMs,
      onIdleEvict: () => {
        this.rooms.delete(roomKey);
        this.logger.info({ roomKey }, 'Evicted idle room from memory');
      },
    });

    this.rooms.set(roomKey, room);
    this.logger.info({ roomKey, totalActiveRooms: this.rooms.size }, 'Initialized active managed room');

    return room;
  }

  public getRoom(roomId: string, documentKey: string = 'default'): ManagedRoom | undefined {
    return this.rooms.get(this.getRoomKey(roomId, documentKey));
  }

  public getMetrics(): { activeRooms: number; totalConnections: number } {
    let totalConnections = 0;
    for (const room of this.rooms.values()) {
      totalConnections += room.getClientCount();
    }
    return {
      activeRooms: this.rooms.size,
      totalConnections,
    };
  }

  public async flushAllAndClose(): Promise<void> {
    this.logger.info({ activeRooms: this.rooms.size }, 'Flushing and closing all active collaboration rooms...');
    const closePromises = Array.from(this.rooms.values()).map((room) => room.flushAndClose());
    await Promise.allSettled(closePromises);
    this.rooms.clear();
  }
}
