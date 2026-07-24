ALTER TABLE "AiConversation" ADD COLUMN "archivedAt" DATETIME;

CREATE INDEX "AiConversation_userId_archivedAt_updatedAt_idx" ON "AiConversation"("userId", "archivedAt", "updatedAt");
