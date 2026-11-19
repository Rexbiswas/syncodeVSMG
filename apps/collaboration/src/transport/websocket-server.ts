import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import pino from 'pino';
import { joinCollaborationSchema } from '@syncode/validation';
import { TokenVerifier, AuthenticationError } from '../auth/token-verifier.js';
import { RoomAuthorizer, AuthorizationError } from '../auth/room-authorizer.js';
import { DocumentManager } from '../engine/document-manager.js';
import { ClientConnection, ManagedRoom } from '../engine/managed-room.js';

export interface CollaborationWebSocketServerOptions {
  server: HttpServer;
  wsPath: string;
  tokenVerifier: TokenVerifier;
  roomAuthorizer: RoomAuthorizer;
  documentManager: DocumentManager;
  logger: pino.Logger;
  maxPayloadBytes: number;
}

export class CollaborationWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly tokenVerifier: TokenVerifier;
  private readonly roomAuthorizer: RoomAuthorizer;
  private readonly documentManager: DocumentManager;
  private readonly logger: pino.Logger;
  private readonly maxPayloadBytes: number;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(options: CollaborationWebSocketServerOptions) {
    this.tokenVerifier = options.tokenVerifier;
    this.roomAuthorizer = options.roomAuthorizer;
    this.documentManager = options.documentManager;
    this.logger = options.logger.child({ component: 'CollaborationWebSocketServer' });
    this.maxPayloadBytes = options.maxPayloadBytes;

    this.wss = new WebSocketServer({
      server: options.server,
      path: options.wsPath,
      maxPayload: options.maxPayloadBytes,
    });

    this.setupConnectionHandling();
    this.setupHeartbeat();
  }

  private setupConnectionHandling(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      let clientConnection: ClientConnection | null = null;
      let room: ManagedRoom | null = null;

      try {
        // 1. Parse URL and Query parameters
        const fullUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const rawParams = {
          token: fullUrl.searchParams.get('token') || '',
          roomId: fullUrl.searchParams.get('roomId') || '',
          documentKey: fullUrl.searchParams.get('documentKey') || 'default',
        };

        const parsedQuery = joinCollaborationSchema.safeParse(rawParams);
        if (!parsedQuery.success) {
          const reason = parsedQuery.error.errors[0]?.message || 'Invalid connection parameters';
          this.logger.warn({ params: rawParams, reason }, 'Rejected connection due to query validation failure');
          ws.close(4000, reason);
          return;
        }

        const { token, roomId, documentKey } = parsedQuery.data;

        // 2. Authenticate user from JWT token
        let authenticatedUser;
        try {
          authenticatedUser = this.tokenVerifier.verify(token);
        } catch (err: unknown) {
          const reason = err instanceof AuthenticationError ? err.message : 'Authentication failed';
          this.logger.warn({ roomId, reason }, 'Rejected unauthenticated WebSocket connection');
          ws.close(4001, reason);
          return;
        }

        // 3. Authorize room & workspace membership
        let authResult;
        try {
          authResult = await this.roomAuthorizer.authorize(authenticatedUser.id, roomId);
        } catch (err: unknown) {
          const reason = err instanceof AuthorizationError ? err.message : 'Room authorization denied';
          const closeCode = (err instanceof AuthorizationError && err.code === 'ROOM_NOT_FOUND') ? 4004 : 4003;
          this.logger.warn({ userId: authenticatedUser.id, roomId, reason, closeCode }, 'Rejected unauthorized room access');
          ws.close(closeCode, reason);
          return;
        }

        // 4. Retrieve or initialize managed collaborative room
        room = await this.documentManager.getOrCreateRoom(roomId, documentKey);

        // 5. Register client in room
        clientConnection = room.addClient(ws, authResult);

        // 6. Handle incoming binary CRDT and awareness messages
        ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
          if (!clientConnection || !room) return;

          // Enforce binary frames for Yjs protocol
          if (!isBinary) {
            this.logger.warn({ userId: clientConnection.auth.user.id }, 'Non-binary WebSocket frame ignored');
            return;
          }

          const buffer = Buffer.isBuffer(data)
            ? data
            : Array.isArray(data)
              ? Buffer.concat(data)
              : Buffer.from(data);

          // Enforce message size bounds
          if (buffer.length > this.maxPayloadBytes) {
            this.logger.warn(
              { userId: clientConnection.auth.user.id, byteLength: buffer.length, max: this.maxPayloadBytes },
              'Payload exceeded maximum allowed byte limit',
            );
            ws.close(1009, 'Message payload too large');
            return;
          }

          clientConnection.lastPing = Date.now();
          clientConnection.isAlive = true;

          const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          await room.handleMessage(clientConnection, uint8Array);
        });

        // 7. Handle Pong responses for heartbeat
        ws.on('pong', () => {
          if (clientConnection) {
            clientConnection.isAlive = true;
            clientConnection.lastPing = Date.now();
          }
        });

        // 8. Handle Connection Disconnect
        ws.on('close', (code: number, reason: Buffer) => {
          this.logger.debug(
            { userId: clientConnection?.auth.user.id, roomId, code, reason: reason.toString() },
            'Client WebSocket closed',
          );
          if (clientConnection && room) {
            room.removeClient(clientConnection);
          }
        });

        ws.on('error', (err: Error) => {
          this.logger.warn({ userId: clientConnection?.auth.user.id, error: err.message }, 'Client WebSocket error');
          if (clientConnection && room) {
            room.removeClient(clientConnection);
          }
        });
      } catch (err: unknown) {
        this.logger.error({ error: err }, 'Unexpected error in WebSocket connection handshake');
        ws.close(1011, 'Internal collaboration server error');
      }
    });
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        // If client failed to respond to previous ping, terminate connection
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000);
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    return new Promise((resolve) => {
      this.wss.close(() => {
        this.logger.info('Collaboration WebSocket Server closed.');
        resolve();
      });
    });
  }
}
