import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import WebSocket from 'ws';
import pino from 'pino';
import {
  YJS_MSG_SYNC,
  YJS_MSG_AWARENESS,
  YJS_MSG_ROOM_INFO,
  YJS_MSG_ERROR,
  CollaborationErrorCode,
  getUserColor,
  type RoomPresenceState,
} from '@syncode/protocol';
import { PostgresPersistence } from '../persistence/postgres-persistence.js';
import { RedisCoordination } from '../coordination/redis-coordination.js';
import { RoomAuthorizationResult } from '../auth/room-authorizer.js';

export interface ClientConnection {
  ws: WebSocket;
  auth: RoomAuthorizationResult;
  clientID: number;
  isAlive: boolean;
  lastPing: number;
}

export class ManagedRoom {
  public readonly roomId: string;
  public readonly documentKey: string;
  public readonly documentId: string;
  public readonly doc: Y.Doc;
  public readonly awareness: awarenessProtocol.Awareness;

  private readonly connections: Set<ClientConnection> = new Set();
  private readonly persistence: PostgresPersistence;
  private readonly coordination: RedisCoordination;
  private readonly logger: pino.Logger;
  private readonly idleTimeoutMs: number;
  private readonly onIdleEvict: () => void;

  private idleTimer: NodeJS.Timeout | null = null;
  private isDisposed: boolean = false;
  private unpersistedUpdateCount: number = 0;

  constructor(options: {
    roomId: string;
    documentKey: string;
    documentId: string;
    doc: Y.Doc;
    persistence: PostgresPersistence;
    coordination: RedisCoordination;
    logger: pino.Logger;
    idleTimeoutMs: number;
    onIdleEvict: () => void;
  }) {
    this.roomId = options.roomId;
    this.documentKey = options.documentKey;
    this.documentId = options.documentId;
    this.doc = options.doc;
    this.persistence = options.persistence;
    this.coordination = options.coordination;
    this.logger = options.logger.child({ roomId: this.roomId, documentKey: this.documentKey });
    this.idleTimeoutMs = options.idleTimeoutMs;
    this.onIdleEvict = options.onIdleEvict;

    // Initialize Yjs Awareness attached to the document
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // 1. Central Document Update Listener
    // Whenever an update is applied to this.doc (whether from a client or sync), broadcast and persist
    this.doc.on('update', async (update: Uint8Array, origin: unknown) => {
      // Broadcast to other local clients
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, YJS_MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      const excludeWs =
        origin && typeof origin === 'object' && 'ws' in origin
          ? (origin as ClientConnection).ws
          : origin instanceof WebSocket
            ? origin
            : null;

      this.broadcast(message, excludeWs);

      // Persist update in PostgreSQL
      const userId =
        origin && typeof origin === 'object' && 'auth' in origin
          ? (origin as ClientConnection).auth.user.id
          : null;

      try {
        await this.persistence.persistUpdate(this.documentId, userId, update);
        this.unpersistedUpdateCount++;

        // Periodic snapshot compaction: flush every 50 updates
        if (this.unpersistedUpdateCount >= 50) {
          await this.persistence.flushSnapshot(this.documentId, this.doc);
          this.unpersistedUpdateCount = 0;
        }
      } catch (err: unknown) {
        this.logger.error({ error: err }, 'Failed to persist document update to database');
      }

      // Publish to Redis for cluster replication (unless it came from Redis)
      if (origin !== 'redis') {
        await this.coordination.publishUpdate(this.roomId, this.documentKey, update);
      }
    });

    // 2. Broadcast local awareness updates to all connected room clients
    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, YJS_MSG_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
        );
        const message = encoding.toUint8Array(encoder);

        const excludeWs = origin instanceof WebSocket ? origin : null;
        this.broadcast(message, excludeWs);
      },
    );
  }

  /**
   * Adds an authenticated client to the room and performs initial synchronization.
   */
  public addClient(ws: WebSocket, auth: RoomAuthorizationResult): ClientConnection {
    // Cancel any pending room eviction timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Allocate an integer clientID for this connection
    const clientID = this.doc.clientID;
    const client: ClientConnection = {
      ws,
      auth,
      clientID,
      isAlive: true,
      lastPing: Date.now(),
    };

    this.connections.add(client);
    this.logger.info({ userId: auth.user.id, role: auth.role, totalClients: this.connections.size }, 'Participant joined room');

    // 1. Send Room Info & User Authorization Status
    this.sendRoomInfo(client);

    // 2. Yjs Sync Protocol Step 1: Send server's state vector to client
    const encoder1 = encoding.createEncoder();
    encoding.writeVarUint(encoder1, YJS_MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder1, this.doc);
    this.sendBinary(client, encoding.toUint8Array(encoder1));

    // 3. Immediately send Sync Step 2 with full document state so client content is updated instantly
    const encoder2 = encoding.createEncoder();
    encoding.writeVarUint(encoder2, YJS_MSG_SYNC);
    syncProtocol.writeSyncStep2(encoder2, this.doc);
    this.sendBinary(client, encoding.toUint8Array(encoder2));

    // 4. Send existing room awareness states to the new client
    const awarenessStates = this.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, YJS_MSG_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(awarenessStates.keys())),
      );
      this.sendBinary(client, encoding.toUint8Array(awarenessEncoder));
    }

    // 5. Initialize server-verified awareness identity for this client
    const userColor = getUserColor(auth.user.id);
    this.awareness.setLocalStateField('user', {
      id: auth.user.id,
      username: auth.user.username,
      displayName: auth.user.displayName || auth.user.username,
      avatarUrl: auth.user.avatarUrl,
      role: auth.role,
      color: userColor,
    });

    // 6. Record Redis Presence
    this.coordination.recordPresence(this.roomId, auth.user.id, {
      username: auth.user.username,
      role: auth.role,
      color: userColor,
    });

    return client;
  }

  /**
   * Removes a client on disconnect and broadcasts awareness removal.
   */
  public removeClient(client: ClientConnection): void {
    if (!this.connections.has(client)) return;

    this.connections.delete(client);
    this.logger.info({ userId: client.auth.user.id, remainingClients: this.connections.size }, 'Participant disconnected');

    // Remove client from Yjs awareness
    awarenessProtocol.removeAwarenessStates(this.awareness, [client.clientID], null);

    // Remove presence from Redis if no other tabs from this user are in room
    const hasOtherConnection = Array.from(this.connections).some((c) => c.auth.user.id === client.auth.user.id);
    if (!hasOtherConnection) {
      this.coordination.removePresence(this.roomId, client.auth.user.id);
    }

    // If room is now empty, schedule idle document eviction after timeout
    if (this.connections.size === 0) {
      this.scheduleIdleEviction();
    }
  }

  /**
   * Processes incoming binary message from a client.
   */
  public async handleMessage(client: ClientConnection, data: Uint8Array): Promise<void> {
    if (this.isDisposed) return;

    try {
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case YJS_MSG_SYNC: {
          this.handleSyncMessage(client, decoder);
          break;
        }

        case YJS_MSG_AWARENESS: {
          this.handleAwarenessMessage(client, decoder);
          break;
        }

        default: {
          this.logger.warn({ messageType }, 'Unknown collaboration message type received');
        }
      }
    } catch (err: unknown) {
      this.logger.error({ error: err, userId: client.auth.user.id }, 'Error processing binary message');
      this.sendError(client, CollaborationErrorCode.INVALID_PAYLOAD, 'Failed to process collaboration payload', false);
    }
  }

  /**
   * Handles Yjs Sync Protocol messages.
   */
  private handleSyncMessage(client: ClientConnection, decoder: decoding.Decoder): void {
    const syncMessageType = decoding.readVarUint(decoder);
    this.logger.info({ userId: client.auth.user.id, syncMessageType }, 'handleSyncMessage invoked');

    if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
      // Client sent its state vector; reply with Step 2 (missing updates from this.doc)
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, YJS_MSG_SYNC);
      syncProtocol.writeSyncStep2(encoder, this.doc, decoding.readVarUint8Array(decoder));
      this.sendBinary(client, encoding.toUint8Array(encoder));
      return;
    }

    if (syncMessageType === syncProtocol.messageYjsSyncStep2 || syncMessageType === syncProtocol.messageYjsUpdate) {
      const updateData = decoding.readVarUint8Array(decoder);
      this.logger.info({ userId: client.auth.user.id, syncMessageType, updateLen: updateData.length, isReadOnly: client.auth.isReadOnly }, 'Applying update');

      // SECURITY: Check write permission for Viewer
      if (client.auth.isReadOnly) {
        this.logger.warn({ userId: client.auth.user.id, role: client.auth.role }, 'Viewer attempted write operation');
        this.sendError(
          client,
          CollaborationErrorCode.READ_ONLY_VIOLATION,
          'You have Viewer permissions and cannot modify this document',
          false,
        );
        // Force resync client to authoritative server state
        const resyncEncoder = encoding.createEncoder();
        encoding.writeVarUint(resyncEncoder, YJS_MSG_SYNC);
        syncProtocol.writeSyncStep1(resyncEncoder, this.doc);
        this.sendBinary(client, encoding.toUint8Array(resyncEncoder));
        return;
      }

      // Apply update to this.doc with origin=client (triggers doc.on('update') which broadcasts and persists)
      Y.applyUpdate(this.doc, updateData, client);
      return;
    }
  }

  /**
   * Handles incoming Yjs Awareness message.
   */
  private handleAwarenessMessage(client: ClientConnection, decoder: decoding.Decoder): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, client.ws);
  }

  /**
   * Applies an update received from Redis pub/sub (originating on another server instance).
   */
  public applyRemoteClusterUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, 'redis');
  }

  private broadcast(message: Uint8Array, excludeWs: WebSocket | null): void {
    for (const client of this.connections) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (err: unknown) {
          this.logger.warn({ error: err, userId: client.auth.user.id }, 'Failed to send message to client');
        }
      }
    }
  }

  private sendBinary(client: ClientConnection, message: Uint8Array): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (err: unknown) {
        this.logger.warn({ error: err, userId: client.auth.user.id }, 'Failed to send binary message to client');
      }
    }
  }

  private sendRoomInfo(client: ClientConnection): void {
    const payload = JSON.stringify({
      roomId: this.roomId,
      documentKey: this.documentKey,
      role: client.auth.role,
      isReadOnly: client.auth.isReadOnly,
      userColor: getUserColor(client.auth.user.id),
      participantCount: this.connections.size,
    });

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, YJS_MSG_ROOM_INFO);
    encoding.writeVarString(encoder, payload);
    this.sendBinary(client, encoding.toUint8Array(encoder));
  }

  public sendError(client: ClientConnection, code: CollaborationErrorCode, message: string, fatal: boolean): void {
    const payload = JSON.stringify({ code, message, fatal });
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, YJS_MSG_ERROR);
    encoding.writeVarString(encoder, payload);
    this.sendBinary(client, encoding.toUint8Array(encoder));

    if (fatal) {
      client.ws.close(4000, message);
    }
  }

  public getActiveParticipants(): RoomPresenceState[] {
    const participants: RoomPresenceState[] = [];
    const seenUserIds = new Set<string>();

    for (const client of this.connections) {
      if (!seenUserIds.has(client.auth.user.id)) {
        seenUserIds.add(client.auth.user.id);
        participants.push({
          userId: client.auth.user.id,
          username: client.auth.user.username,
          displayName: client.auth.user.displayName || client.auth.user.username,
          avatarUrl: client.auth.user.avatarUrl,
          role: client.auth.role,
          color: getUserColor(client.auth.user.id),
          online: true,
          lastActive: client.lastPing,
        });
      }
    }

    return participants;
  }

  public getClientCount(): number {
    return this.connections.size;
  }

  private scheduleIdleEviction(): void {
    this.idleTimer = setTimeout(async () => {
      if (this.connections.size === 0) {
        this.logger.info('Room has been idle with no active connections. Flushing snapshot and evicting from memory.');
        await this.persistence.flushSnapshot(this.documentId, this.doc);
        this.dispose();
        this.onIdleEvict();
      }
    }, this.idleTimeoutMs);
  }

  public async flushAndClose(): Promise<void> {
    await this.persistence.flushSnapshot(this.documentId, this.doc);
    for (const client of this.connections) {
      client.ws.close(1001, 'Collaboration server shutting down');
    }
    this.dispose();
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.awareness.destroy();
    this.doc.destroy();
    this.connections.clear();
  }
}
