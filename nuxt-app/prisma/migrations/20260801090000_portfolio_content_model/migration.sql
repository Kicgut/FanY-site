ALTER TABLE "Portfolio" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'project';
ALTER TABLE "Portfolio" ADD COLUMN "displayStatus" TEXT NOT NULL DEFAULT 'experiment';
ALTER TABLE "Portfolio" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "Portfolio" ADD COLUMN "year" INTEGER;
ALTER TABLE "Portfolio" ADD COLUMN "rolesJson" TEXT;
ALTER TABLE "Portfolio" ADD COLUMN "techStackJson" TEXT;
ALTER TABLE "Portfolio" ADD COLUMN "mediumJson" TEXT;
ALTER TABLE "Portfolio" ADD COLUMN "location" TEXT;
ALTER TABLE "Portfolio" ADD COLUMN "toolMode" TEXT;
ALTER TABLE "Portfolio" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Portfolio" ADD COLUMN "archivedAt" DATETIME;

CREATE TABLE "PortfolioMedia" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "portfolioId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "storageKey" TEXT,
  "publicUrl" TEXT,
  "posterUrl" TEXT,
  "alt" TEXT,
  "caption" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "duration" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioMedia_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PortfolioMedia_portfolioId_status_sortOrder_idx" ON "PortfolioMedia"("portfolioId", "status", "sortOrder");

CREATE TABLE "PortfolioResource" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "portfolioId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "external" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioResource_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PortfolioResource_portfolioId_sortOrder_idx" ON "PortfolioResource"("portfolioId", "sortOrder");

CREATE TABLE "PortfolioBlock" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "portfolioId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "anchor" TEXT,
  "title" TEXT,
  "payloadJson" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visibility" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioBlock_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PortfolioBlock_portfolioId_visibility_sortOrder_idx" ON "PortfolioBlock"("portfolioId", "visibility", "sortOrder");

CREATE TABLE "PortfolioPromptEntry" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "portfolioId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT,
  "summary" TEXT,
  "body" TEXT NOT NULL,
  "variablesJson" TEXT,
  "examplesJson" TEXT,
  "riskLevel" TEXT NOT NULL DEFAULT 'low',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioPromptEntry_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PortfolioPromptEntry_portfolioId_slug_key" ON "PortfolioPromptEntry"("portfolioId", "slug");
CREATE INDEX "PortfolioPromptEntry_portfolioId_status_category_sortOrder_idx" ON "PortfolioPromptEntry"("portfolioId", "status", "category", "sortOrder");

CREATE TABLE "PortfolioPromptTag" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "promptEntryId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "PortfolioPromptTag_promptEntryId_fkey" FOREIGN KEY ("promptEntryId") REFERENCES "PortfolioPromptEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PortfolioPromptTag_promptEntryId_name_key" ON "PortfolioPromptTag"("promptEntryId", "name");
CREATE INDEX "PortfolioPromptTag_name_idx" ON "PortfolioPromptTag"("name");

CREATE INDEX "Portfolio_type_status_reviewStatus_updatedAt_idx" ON "Portfolio"("type", "status", "reviewStatus", "updatedAt");
CREATE INDEX "Portfolio_year_status_reviewStatus_idx" ON "Portfolio"("year", "status", "reviewStatus");
