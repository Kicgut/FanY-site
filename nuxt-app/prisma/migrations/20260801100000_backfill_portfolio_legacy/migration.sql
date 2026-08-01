-- Preserve legacy Portfolio content in the normalized read model before the new UI is enabled.
INSERT INTO "PortfolioMedia" ("portfolioId", "kind", "publicUrl", "alt", "sortOrder", "status", "createdAt", "updatedAt")
SELECT p."id", 'cover', p."coverImage", p."title", 0,
       CASE WHEN p."status" = 'published' AND p."reviewStatus" = 'approved' THEN 'ready' ELSE 'draft' END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Portfolio" p
WHERE p."coverImage" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PortfolioMedia" m WHERE m."portfolioId" = p."id" AND m."kind" = 'cover');

INSERT INTO "PortfolioResource" ("portfolioId", "kind", "label", "url", "external", "sortOrder", "isPrimary", "createdAt", "updatedAt")
SELECT p."id", 'primary', 'Open project', p."link", 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Portfolio" p
WHERE p."link" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PortfolioResource" r WHERE r."portfolioId" = p."id" AND r."isPrimary" = 1);

INSERT INTO "PortfolioBlock" ("portfolioId", "kind", "title", "payloadJson", "sortOrder", "visibility", "createdAt", "updatedAt")
SELECT p."id", 'richText', 'Narrative', json_object('markdown', p."content"), 0,
       CASE WHEN p."status" = 'published' AND p."reviewStatus" = 'approved' THEN 'published' ELSE 'draft' END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Portfolio" p
WHERE p."content" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PortfolioBlock" b WHERE b."portfolioId" = p."id" AND b."kind" = 'richText');
