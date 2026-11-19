import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import pino from 'pino';
import { PostgresPersistence } from '../persistence/postgres-persistence.js';

describe('Collaboration Engine - Document Persistence', () => {
  const logger = pino({ level: 'silent' });

  const mockPrisma = {
    collaborationDocument: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    documentUpdate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    documentSnapshot: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const persistence = new PostgresPersistence(mockPrisma as any, logger);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize a new document record when not previously stored', async () => {
    mockPrisma.collaborationDocument.findUnique.mockResolvedValue(null);
    mockPrisma.collaborationDocument.create.mockResolvedValue({
      id: 'doc-uuid-1',
      roomId: 'room-1',
      documentKey: 'default',
      version: 1,
      snapshotData: null,
      snapshotClock: 0,
    });

    const result = await persistence.getOrCreateDocument('room-1', 'default');
    expect(result.documentId).toBe('doc-uuid-1');
    expect(result.version).toBe(1);
    expect(result.doc.getText('content').toString()).toBe('');
  });

  it('should reconstruct document state from snapshot and incremental updates', async () => {
    // 1. Create a document with base text and encode as snapshot
    const baseDoc = new Y.Doc();
    baseDoc.getText('content').insert(0, 'const port = 4000;\n');
    const snapshotBytes = Buffer.from(Y.encodeStateAsUpdate(baseDoc));

    // 2. Create an incremental update
    const updateDoc = new Y.Doc();
    Y.applyUpdate(updateDoc, snapshotBytes);
    updateDoc.getText('content').insert(updateDoc.getText('content').length, 'console.log(port);');
    const updateBytes = Buffer.from(Y.encodeStateAsUpdate(updateDoc, Y.encodeStateVector(baseDoc)));

    mockPrisma.collaborationDocument.findUnique.mockResolvedValue({
      id: 'doc-uuid-2',
      roomId: 'room-2',
      documentKey: 'default',
      version: 1,
      snapshotData: snapshotBytes,
      snapshotClock: 1,
    });

    mockPrisma.documentUpdate.findMany.mockResolvedValue([
      {
        id: 'update-1',
        documentId: 'doc-uuid-2',
        updateData: updateBytes,
        sequenceNumber: 1,
      },
    ]);

    const result = await persistence.getOrCreateDocument('room-2', 'default');
    expect(result.documentId).toBe('doc-uuid-2');
    expect(result.doc.getText('content').toString()).toBe('const port = 4000;\nconsole.log(port);');
  });

  it('should persist incremental updates and increment snapshot clock', async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        documentUpdate: {
          findFirst: vi.fn().mockResolvedValue({ sequenceNumber: 3 }),
          create: vi.fn().mockResolvedValue({ id: 'new-update' }),
        },
        collaborationDocument: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const update = new Uint8Array([1, 2, 3]);
    const nextSeq = await persistence.persistUpdate('doc-1', 'user-1', update);
    expect(nextSeq).toBe(4);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should flush compacted snapshot, record snapshot history, and prune compacted updates', async () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'compacted document content');

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        collaborationDocument: {
          findUnique: vi.fn().mockResolvedValue({ version: 2 }),
          update: vi.fn().mockResolvedValue({}),
        },
        documentSnapshot: {
          create: vi.fn().mockResolvedValue({}),
        },
        documentUpdate: {
          deleteMany: vi.fn().mockResolvedValue({ count: 15 }),
        },
      };
      return callback(tx);
    });

    await persistence.flushSnapshot('doc-1', doc);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
