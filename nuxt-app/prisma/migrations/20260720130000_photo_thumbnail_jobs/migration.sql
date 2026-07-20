-- Add explicit state for independent thumbnail processing and retries.
ALTER TABLE "Photo" ADD COLUMN "thumbnailStatus" TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE "Photo" ADD COLUMN "thumbnailError" TEXT;
ALTER TABLE "Photo" ADD COLUMN "thumbnailAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Photo" ADD COLUMN "thumbnailProcessedAt" DATETIME;

CREATE INDEX "Photo_thumbnailStatus_createdAt_idx" ON "Photo"("thumbnailStatus", "createdAt");
