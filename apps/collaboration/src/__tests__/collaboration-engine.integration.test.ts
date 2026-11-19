import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import {
  YJS_MSG_SYNC,
  YJS_MSG_AWARENESS,
  YJS_MSG_ROOM_INFO,
  YJS_MSG_ERROR,
  CollaborationErrorCode,
} from '@syncode/protocol';
import { WorkspaceRole } from '@syncode/database';
import { createCollaborationServer } from '../server.js';

describe('Collaboration Engine - Real-Time Multi-Client Integration Tests', () => {
  const jwtSecret = 'integration_test_secret_key_32chars_min!';
  let server: http.Server;
  let port: number;
  let wsUrl: string;
  let shutdownFn: () => Promise<void>;
  let mockAuthorizerResults: Map<string, any> = new Map();

  // Helper to create test token
  function createTestToken(userId: string, email: string, username: string): string {
    return jwt.sign({ sub: userId, email, username }, jwtSecret, { expiresIn: '1h' });
  }

  beforeAll(async () => {
    const inMemoryDocs = new Map<string, { documentId: string; doc: Y.Doc }>();
    const inMemorySnapshots = new Map<string, Uint8Array>();
    const inMemoryUpdates = new Map<string, Uint8Array[]>();

    const mockPersistence = {
      getOrCreateDocument: async (roomId: string, documentKey: string) => {
        const key = `${roomId}:${documentKey}`;
        let entry = inMemoryDocs.get(key);
        if (!entry) {
          const doc = new Y.Doc();
          const documentId = `doc-${key}`;
          const snapshot = inMemorySnapshots.get(documentId);
          if (snapshot) {
            Y.applyUpdate(doc, snapshot);
          }
          const updates = inMemoryUpdates.get(documentId) || [];
          for (const u of updates) {
            Y.applyUpdate(doc, u);
          }
          entry = { documentId, doc };
          inMemoryDocs.set(key, entry);
        }
        return {
          documentId: entry.documentId,
          doc: entry.doc,
          version: 1,
          updateCount: 0,
        };
      },
      loadLatestSnapshot: async (documentId: string) => {
        const data = inMemorySnapshots.get(documentId);
        return data ? { binaryState: Buffer.from(data), createdAt: new Date() } : null;
      },
      loadUpdatesAfter: async (documentId: string, _after?: Date) => {
        const list = inMemoryUpdates.get(documentId) || [];
        return list.map((u) => ({ updateData: Buffer.from(u), createdAt: new Date() }));
      },
      persistUpdate: async (documentId: string, _userId: string | null, update: Uint8Array) => {
        const list = inMemoryUpdates.get(documentId) || [];
        list.push(new Uint8Array(update));
        inMemoryUpdates.set(documentId, list);
      },
      flushSnapshot: async (documentId: string, doc: Y.Doc) => {
        const state = Y.encodeStateAsUpdate(doc);
        inMemorySnapshots.set(documentId, state);
      },
    };

    const mockAuthorizer = {
      authorize: async (userId: string, roomId: string) => {
        const key = `${userId}:${roomId}`;
        const mockResult = mockAuthorizerResults.get(key);
        if (!mockResult) {
          throw { code: CollaborationErrorCode.ROOM_FORBIDDEN, message: 'Forbidden room access' };
        }
        if (mockResult === 'NOT_FOUND') {
          throw { code: CollaborationErrorCode.ROOM_NOT_FOUND, message: 'Room not found' };
        }
        return mockResult;
      },
    };

    // Spin up collaboration server on ephemeral port (port: 0)
    const instance = createCollaborationServer(
      {
        COLLABORATION_PORT: 0,
        COLLABORATION_HOST: '127.0.0.1',
        JWT_ACCESS_SECRET: jwtSecret,
        LOG_LEVEL: 'silent',
        COLLABORATION_IDLE_TIMEOUT_MS: 60000,
      },
      {
        roomAuthorizer: mockAuthorizer as any,
        persistence: mockPersistence as any,
      },
    );

    server = instance.server;
    shutdownFn = instance.shutdown;

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          port = addr.port;
          wsUrl = `ws://127.0.0.1:${port}/collaboration`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (typeof shutdownFn === 'function') {
      await shutdownFn();
    }
  });

  // Helper client wrapper
  class TestClient {
    public ws: WebSocket;
    public doc: Y.Doc = new Y.Doc();
    public roomInfo: any = null;
    public errors: any[] = [];
    public awarenessUpdates: any[] = [];
    public isOpen: boolean = false;

    constructor(url: string) {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      // Automatically dispatch incremental local updates to the server
      this.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== 'remote' && this.ws.readyState === WebSocket.OPEN) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, YJS_MSG_SYNC);
          syncProtocol.writeUpdate(encoder, update);
          this.ws.send(encoding.toUint8Array(encoder));
        }
      });

      this.ws.on('message', (data: any) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const decoder = decoding.createDecoder(uint8);
        const msgType = decoding.readVarUint(decoder);

        if (msgType === YJS_MSG_ROOM_INFO) {
          const raw = decoding.readVarString(decoder);
          this.roomInfo = JSON.parse(raw);
        } else if (msgType === YJS_MSG_ERROR) {
          const raw = decoding.readVarString(decoder);
          this.errors.push(JSON.parse(raw));
        } else if (msgType === YJS_MSG_SYNC) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, YJS_MSG_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, 'remote');
          if (encoding.length(encoder) > 1) {
            this.ws.send(encoding.toUint8Array(encoder));
          }
        } else if (msgType === YJS_MSG_AWARENESS) {
          this.awarenessUpdates.push(decoding.readVarUint8Array(decoder));
        }
      });
    }

    public async waitForOpen(): Promise<void> {
      if (this.ws.readyState === WebSocket.OPEN) return;
      return new Promise((resolve, reject) => {
        this.ws.on('open', () => {
          this.isOpen = true;
          resolve();
        });
        this.ws.on('error', reject);
        this.ws.on('close', (code, reason) => {
          if (!this.isOpen) {
            reject(new Error(`Closed before open: ${code} - ${reason}`));
          }
        });
      });
    }

    public async waitForClose(): Promise<{ code: number; reason: string }> {
      return new Promise((resolve) => {
        this.ws.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
      });
    }

    public sendUpdate(textToInsert: string): void {
      this.doc.getText('content').insert(this.doc.getText('content').length, textToInsert);
    }

    public close(): void {
      this.ws.close();
      this.doc.destroy();
    }
  }

  it('SECURITY: should reject unauthenticated connection with missing token', async () => {
    const client = new TestClient(`${wsUrl}?roomId=c7b7f16a-9cbe-4b12-b745-5760a3fc7ba1`);
    const { code } = await client.waitForClose();
    expect(code).toBe(4000); // Validation failure: token missing
  });

  it('SECURITY: should reject unauthenticated connection with invalid token', async () => {
    const client = new TestClient(`${wsUrl}?token=invalid.token.here&roomId=c7b7f16a-9cbe-4b12-b745-5760a3fc7ba1`);
    const { code } = await client.waitForClose();
    expect(code).toBe(4001); // Unauthorized
  });

  it('SECURITY: should reject unauthorized user attempting to access private room', async () => {
    const token = createTestToken('user-intruder', 'intruder@syncode.dev', 'intruder');
    const roomId = 'b8b7f16a-9cbe-4b12-b745-5760a3fc7ba2';

    // Mock authorizer returns forbidden (not in mockAuthorizerResults)
    const client = new TestClient(`${wsUrl}?token=${token}&roomId=${roomId}`);
    const { code } = await client.waitForClose();
    expect(code).toBe(4003); // Forbidden
  });

  it('REAL-TIME SYNC: two authenticated users connect to same room and synchronize document edits', async () => {
    const roomId = '11111111-1111-1111-1111-111111111111';
    const userAToken = createTestToken('user-a', 'alice@syncode.dev', 'alice');
    const userBToken = createTestToken('user-b', 'bob@syncode.dev', 'bob');

    // Register authorization
    mockAuthorizerResults.set(`user-a:${roomId}`, {
      roomId,
      roomName: 'Sprint Room',
      role: WorkspaceRole.MEMBER,
      isReadOnly: false,
      user: { id: 'user-a', email: 'alice@syncode.dev', username: 'alice' },
    });
    mockAuthorizerResults.set(`user-b:${roomId}`, {
      roomId,
      roomName: 'Sprint Room',
      role: WorkspaceRole.MEMBER,
      isReadOnly: false,
      user: { id: 'user-b', email: 'bob@syncode.dev', username: 'bob' },
    });

    const clientA = new TestClient(`${wsUrl}?token=${userAToken}&roomId=${roomId}&documentKey=app.ts`);
    const clientB = new TestClient(`${wsUrl}?token=${userBToken}&roomId=${roomId}&documentKey=app.ts`);

    await Promise.all([clientA.waitForOpen(), clientB.waitForOpen()]);

    // Wait 100ms for initial sync step handshake
    await new Promise((r) => setTimeout(r, 100));

    // Client A inserts text
    clientA.sendUpdate('import { NestFactory } from "@nestjs/core";\n');

    // Wait 100ms for propagation
    await new Promise((r) => setTimeout(r, 100));

    expect(clientB.doc.getText('content').toString()).toBe('import { NestFactory } from "@nestjs/core";\n');

    // Client B inserts subsequent text
    clientB.sendUpdate('const app = await NestFactory.create(AppModule);');

    await new Promise((r) => setTimeout(r, 100));

    // Both clients must have identical converged state
    expect(clientA.doc.getText('content').toString()).toBe(clientB.doc.getText('content').toString());
    expect(clientA.doc.getText('content').toString()).toContain('NestFactory.create');

    clientA.close();
    clientB.close();
  });

  it('SECURITY & RBAC: should enforce isReadOnly for VIEWER and reject unpermitted modifications', async () => {
    const roomId = '22222222-2222-2222-2222-222222222222';
    const authorToken = createTestToken('user-editor', 'editor@syncode.dev', 'editor');
    const viewerToken = createTestToken('user-viewer', 'viewer@syncode.dev', 'viewer');

    mockAuthorizerResults.set(`user-editor:${roomId}`, {
      roomId,
      roomName: 'Review Room',
      role: WorkspaceRole.MEMBER,
      isReadOnly: false,
      user: { id: 'user-editor', email: 'editor@syncode.dev', username: 'editor' },
    });
    mockAuthorizerResults.set(`user-viewer:${roomId}`, {
      roomId,
      roomName: 'Review Room',
      role: WorkspaceRole.VIEWER,
      isReadOnly: true, // Read-only!
      user: { id: 'user-viewer', email: 'viewer@syncode.dev', username: 'viewer' },
    });

    const author = new TestClient(`${wsUrl}?token=${authorToken}&roomId=${roomId}&documentKey=main.ts`);
    const viewer = new TestClient(`${wsUrl}?token=${viewerToken}&roomId=${roomId}&documentKey=main.ts`);

    await Promise.all([author.waitForOpen(), viewer.waitForOpen()]);
    await new Promise((r) => setTimeout(r, 100));

    // Author establishes baseline code
    author.sendUpdate('const authorized = true;');
    await new Promise((r) => setTimeout(r, 100));

    expect(viewer.doc.getText('content').toString()).toBe('const authorized = true;');
    expect(viewer.roomInfo?.isReadOnly).toBe(true);

    // Viewer attempts to write
    viewer.sendUpdate('\n// Malicious or unauthorized write by viewer');
    await new Promise((r) => setTimeout(r, 150));

    // Author should NOT receive viewer's unpermitted update
    expect(author.doc.getText('content').toString()).toBe('const authorized = true;');

    // Viewer receives READ_ONLY_VIOLATION error
    const readOnlyError = viewer.errors.find((e) => e.code === CollaborationErrorCode.READ_ONLY_VIOLATION);
    expect(readOnlyError).toBeDefined();

    author.close();
    viewer.close();
  });

  it('LATE-JOINER SYNC: a client connecting later receives the complete existing document state', async () => {
    const roomId = '33333333-3333-3333-3333-333333333333';
    const tokenA = createTestToken('user-first', 'first@syncode.dev', 'first');
    const tokenLate = createTestToken('user-late', 'late@syncode.dev', 'late');

    mockAuthorizerResults.set(`user-first:${roomId}`, {
      roomId,
      roomName: 'Late Join Room',
      role: WorkspaceRole.OWNER,
      isReadOnly: false,
      user: { id: 'user-first', email: 'first@syncode.dev', username: 'first' },
    });
    mockAuthorizerResults.set(`user-late:${roomId}`, {
      roomId,
      roomName: 'Late Join Room',
      role: WorkspaceRole.MEMBER,
      isReadOnly: false,
      user: { id: 'user-late', email: 'late@syncode.dev', username: 'late' },
    });

    const clientA = new TestClient(`${wsUrl}?token=${tokenA}&roomId=${roomId}&documentKey=code.ts`);
    await clientA.waitForOpen();
    await new Promise((r) => setTimeout(r, 100));

    // Client A makes multiple edits
    clientA.sendUpdate('Line 1: init\n');
    await new Promise((r) => setTimeout(r, 50));
    clientA.sendUpdate('Line 2: feature implementation\n');
    await new Promise((r) => setTimeout(r, 50));
    clientA.sendUpdate('Line 3: export default main;\n');
    await new Promise((r) => setTimeout(r, 50));

    // Now late client connects
    const lateClient = new TestClient(`${wsUrl}?token=${tokenLate}&roomId=${roomId}&documentKey=code.ts`);
    await lateClient.waitForOpen();
    await new Promise((r) => setTimeout(r, 150));

    // Late client receives complete document state
    expect(lateClient.doc.getText('content').toString()).toBe(
      'Line 1: init\nLine 2: feature implementation\nLine 3: export default main;\n',
    );

    clientA.close();
    lateClient.close();
  });
});
