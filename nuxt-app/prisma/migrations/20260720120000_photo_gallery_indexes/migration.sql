CREATE INDEX IF NOT EXISTS "Photo_visibility_status_reviewStatus_createdAt_idx"
ON "Photo"("visibility", "status", "reviewStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "Photo_takenAt_idx"
ON "Photo"("takenAt");

CREATE INDEX IF NOT EXISTS "Photo_uploadedBy_visibility_idx"
ON "Photo"("uploadedBy", "visibility");

CREATE INDEX IF NOT EXISTS "Album_visibility_createdAt_idx"
ON "Album"("visibility", "createdAt");

CREATE INDEX IF NOT EXISTS "AlbumPhoto_albumId_order_idx"
ON "AlbumPhoto"("albumId", "order");

CREATE INDEX IF NOT EXISTS "PhotoTag_name_idx"
ON "PhotoTag"("name");
