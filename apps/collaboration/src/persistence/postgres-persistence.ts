import * as Y from 'yjs';
import { PrismaClient } from '@syncode/database';
import pino from 'pino';

export interface LoadedDocumentState {
  documentId: string;
  doc: Y.Doc;
  version: number;
  updateCount: number;
}

export class PostgresPersistence {
  private readonly prisma: PrismaClient;
  private readonly logger: pino.Logger;

  constructor(prismaOrDb: PrismaClient | { getPrisma: () => PrismaClient }, logger: pino.Logger) {
    this.prisma = 'getPrisma' in prismaOrDb ? prismaOrDb.getPrisma() : prismaOrDb;
    this.logger = logger.child({ component: 'PostgresPersistence' });
  }

  /**
   * Loads an existing collaboration document or creates a new one in PostgreSQL.
   * Restores Y.Doc state by applying snapshotData followed by uncompacted updates in order.
   */
  public async getOrCreateDocument(roomId: string, documentKey: string = 'default'): Promise<LoadedDocumentState> {
    const doc = new Y.Doc();

    // 1. Find or create CollaborationDocument
    let docRecord = await this.prisma.collaborationDocument.findUnique({
      where: {
        roomId_documentKey: {
          roomId,
          documentKey,
        },
      },
    });

    if (!docRecord) {
      docRecord = await this.prisma.collaborationDocument.create({
        data: {
          roomId,
          documentKey,
          version: 1,
        },
      });
      this.logger.info({ roomId, documentKey, documentId: docRecord.id }, 'Initialized new collaboration document record');
      return {
        documentId: docRecord.id,
        doc,
        version: docRecord.version,
        updateCount: 0,
      };
    }

    // 2. Apply snapshot if present
    if (docRecord.snapshotData && docRecord.snapshotData.length > 0) {
      Y.applyUpdate(doc, new Uint8Array(docRecord.snapshotData));
    }

    // 3. Apply subsequent incremental updates in sequence
    const updates = await this.prisma.documentUpdate.findMany({
      where: {
        documentId: docRecord.id,
      },
      orderBy: {
        sequenceNumber: 'asc',
      },
    });

    for (const update of updates) {
      if (update.updateData && update.updateData.length > 0) {
        Y.applyUpdate(doc, new Uint8Array(update.updateData));
      }
    }

    this.logger.info(
      {
        roomId,
        documentKey,
        documentId: docRecord.id,
        hasSnapshot: !!docRecord.snapshotData,
        updatesLoaded: updates.length,
      },
      'Successfully loaded and reconstructed document from PostgreSQL',
    );

    return {
      documentId: docRecord.id,
      doc,
      version: docRecord.version,
      updateCount: updates.length,
    };
  }

  /**
   * Persists an incremental Yjs binary update in PostgreSQL.
   */
  public async persistUpdate(documentId: string, userId: string | null, update: Uint8Array): Promise<number> {
    const updateBuffer = Buffer.from(update);

    // Monotonically increment sequence number and record update in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Find current max sequence number
      const latestUpdate = await tx.documentUpdate.findFirst({
        where: { documentId },
        orderBy: { sequenceNumber: 'desc' },
        select: { sequenceNumber: true },
      });

      const nextSequence = (latestUpdate?.sequenceNumber ?? 0) + 1;

      await tx.documentUpdate.create({
        data: {
          documentId,
          userId,
          updateData: updateBuffer,
          sequenceNumber: nextSequence,
        },
      });

      await tx.collaborationDocument.update({
        where: { id: documentId },
        data: {
          snapshotClock: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return nextSequence;
    });

    return result;
  }

  /**
   * Compiles and persists a compacted snapshot of the Y.Doc state in PostgreSQL,
   * pruning older incremental updates to maintain low database footprint.
   */
  public async flushSnapshot(documentId: string, doc: Y.Doc): Promise<void> {
    try {
      const snapshot = Y.encodeStateAsUpdate(doc);
      const snapshotBuffer = Buffer.from(snapshot);

      await this.prisma.$transaction(async (tx) => {
        const currentDoc = await tx.collaborationDocument.findUnique({
          where: { id: documentId },
          select: { version: true },
        });

        const nextVersion = (currentDoc?.version ?? 1) + 1;

        // 1. Update document snapshot
        await tx.collaborationDocument.update({
          where: { id: documentId },
          data: {
            snapshotData: snapshotBuffer,
            snapshotClock: 0,
            version: nextVersion,
            updatedAt: new Date(),
          },
        });

        // 2. Record historical snapshot entry
        await tx.documentSnapshot.create({
          data: {
            documentId,
            snapshotData: snapshotBuffer,
            version: nextVersion,
          },
        });

        // 3. Prune compacted updates
        await tx.documentUpdate.deleteMany({
          where: { documentId },
        });
      });

      this.logger.info({ documentId, snapshotBytes: snapshotBuffer.length }, 'Compacted and saved document snapshot');
    } catch (err: unknown) {
      this.logger.error({ documentId, error: err }, 'Failed to flush document snapshot');
    }
  }
}
