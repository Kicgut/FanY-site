-- Controlled group catalogue and explicit album owner for management scope.
CREATE TABLE "Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");
ALTER TABLE "Album" ADD COLUMN "createdBy" INTEGER;
CREATE INDEX "Album_createdBy_idx" ON "Album"("createdBy");

-- Preserve every already assigned group as a valid catalogue entry.
-- SQLite JSON support is available in the deployment image.
INSERT OR IGNORE INTO "Group" ("name")
SELECT DISTINCT trim(value)
FROM "User", json_each("User"."groups")
WHERE json_valid("User"."groups") AND trim(value) <> '';
