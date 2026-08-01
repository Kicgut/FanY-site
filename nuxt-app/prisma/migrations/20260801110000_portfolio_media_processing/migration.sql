ALTER TABLE "PortfolioMedia" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "PortfolioMedia" ADD COLUMN "sizeBytes" INTEGER;
ALTER TABLE "PortfolioMedia" ADD COLUMN "derivativeStatus" TEXT DEFAULT 'pending';

UPDATE "PortfolioMedia"
SET "derivativeStatus" = CASE WHEN "status" = 'ready' THEN 'ready' ELSE 'pending' END
WHERE "derivativeStatus" IS NULL;
