-- Content pipeline persistence and job execution metadata.
ALTER TABLE "Job" ADD COLUMN "error" TEXT;
ALTER TABLE "Job" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "finishedAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "availableAt" DATETIME;

-- Align the current Photo model with the ECS sync service.
ALTER TABLE "Photo" ADD COLUMN "ecsSyncPolicy" TEXT NOT NULL DEFAULT 'local_only';
ALTER TABLE "Photo" ADD COLUMN "syncedAt" DATETIME;
ALTER TABLE "Photo" ADD COLUMN "syncError" TEXT;

CREATE TABLE "ContentCandidate" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "slug" TEXT,
  "content" TEXT NOT NULL,
  "description" TEXT,
  "contentType" TEXT NOT NULL DEFAULT 'blog',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "tagsJson" TEXT,
  "sourceRef" TEXT,
  "suggestedVisibility" TEXT NOT NULL DEFAULT 'private',
  "riskLevel" TEXT NOT NULL DEFAULT 'low',
  "createdBy" INTEGER,
  "reviewedBy" INTEGER,
  "reviewNote" TEXT,
  "publishedType" TEXT,
  "publishedId" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ContentRevision" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "candidateId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT,
  "content" TEXT NOT NULL,
  "description" TEXT,
  "tagsJson" TEXT,
  "metadataJson" TEXT,
  "createdBy" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentRevision_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ContentCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ContentRevision_candidateId_version_key" ON "ContentRevision" ("candidateId", "version");

CREATE TABLE "ContentPublication" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "candidateId" INTEGER NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "publishedBy" INTEGER,
  "publishedAt" DATETIME,
  "unpublishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContentPublication_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ContentCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ContentPublication_candidateId_targetType_key" ON "ContentPublication" ("candidateId", "targetType");
