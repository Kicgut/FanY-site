ALTER TABLE "HermesSkill" ADD COLUMN "author" TEXT;
ALTER TABLE "HermesSkill" ADD COLUMN "description" TEXT;
ALTER TABLE "HermesSkill" ADD COLUMN "project" TEXT;

CREATE TABLE "HermesSkillTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "skillName" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "tagType" TEXT NOT NULL DEFAULT 'custom',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HermesSkillTag_skillName_fkey" FOREIGN KEY ("skillName") REFERENCES "HermesSkill" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HermesSkillTag_tag_idx" ON "HermesSkillTag"("tag");
CREATE UNIQUE INDEX "HermesSkillTag_skillName_tag_key" ON "HermesSkillTag"("skillName", "tag");
