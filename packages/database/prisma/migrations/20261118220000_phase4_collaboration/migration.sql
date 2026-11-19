-- CreateTable
CREATE TABLE "collaboration_documents" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL DEFAULT 'default',
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshotData" BYTEA,
    "snapshotClock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_updates" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "updateData" BYTEA NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_snapshots" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "snapshotData" BYTEA NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collaboration_documents_roomId_idx" ON "collaboration_documents"("roomId");

-- CreateIndex
CREATE INDEX "collaboration_documents_documentKey_idx" ON "collaboration_documents"("documentKey");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_documents_roomId_documentKey_key" ON "collaboration_documents"("roomId", "documentKey");

-- CreateIndex
CREATE INDEX "document_updates_documentId_sequenceNumber_idx" ON "document_updates"("documentId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "document_updates_documentId_createdAt_idx" ON "document_updates"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "document_snapshots_documentId_version_idx" ON "document_snapshots"("documentId", "version");

-- AddForeignKey
ALTER TABLE "collaboration_documents" ADD CONSTRAINT "collaboration_documents_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_updates" ADD CONSTRAINT "document_updates_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "collaboration_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_snapshots" ADD CONSTRAINT "document_snapshots_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "collaboration_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
