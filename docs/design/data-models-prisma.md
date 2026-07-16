---
title: "Prisma 数据模型设计"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\design
---
# Prisma 数据模型设计

## 1. 新增/调整模型清单

- User
- Article
- Tag
- Portfolio
- Photo
- PhotoTag
- Album
- AlbumPhoto
- ReviewLog
- AccessLog
- AuditLog
- Job
- HermesConversation
- HermesSkill
- ContentCandidate

## 2. User

```prisma
model User {
  id             Int      @id @default(autoincrement())
  username       String   @unique
  password       String
  name           String
  role           String   @default("friend")
  groups         String?
  status         String   @default("active")
  aiAccess       Boolean  @default(false)
  aiAccessLevel  String   @default("none")
  uploadQuotaMb  Int      @default(500)
  usedQuotaMb    Int      @default(0)
  lastLoginAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

## 3. Photo

```prisma
model Photo {
  id                    Int      @id @default(autoincrement())
  filename              String   @unique
  originalPath          String?
  thumbPath             String?
  ecsThumbPath          String?
  title                 String?
  description           String?
  takenAt               DateTime?
  location              String?
  width                 Int?
  height                Int?
  fileSize              Int?
  mimeType              String?
  checksum              String?

  visibility            String   @default("private")
  visibleTo             String?
  status                String   @default("hidden")
  reviewStatus          String   @default("pending")
  uploadedBy            Int?
  reviewedBy            Int?
  reviewedAt            DateTime?
  reviewNote            String?

  allowOriginalDownload Boolean  @default(false)
  storageLocation       String   @default("local")
  syncStatus            String   @default("pending")
  archivedAt            DateTime?

  suggestedTags         String?
  suggestedLocation     String?
  suggestedDescription  String?
  analysisStatus        String   @default("none")

  albums                AlbumPhoto[]
  tags                  PhotoTag[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## 4. Portfolio

```prisma
model Portfolio {
  id          Int      @id @default(autoincrement())
  title       String
  slug        String   @unique
  description String?
  content     String?
  coverImage  String?
  images      String?
  link        String?
  tags        String?
  category    String?
  featured    Boolean  @default(false)
  order       Int      @default(0)
  status      String   @default("draft")
  reviewStatus String  @default("approved")
  createdBy   String   @default("owner")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 5. AuditLog

```prisma
model AuditLog {
  id           Int      @id @default(autoincrement())
  userId       Int?
  action       String
  resourceType String
  resourceId   String?
  beforeJson   String?
  afterJson    String?
  accessSource String?
  ip           String?
  userAgent    String?
  createdAt    DateTime @default(now())
}
```

## 6. HermesSkill

```prisma
model HermesSkill {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  category    String?
  path        String
  status      String   @default("new")
  riskLevel   String   @default("low")
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 7. Job

```prisma
model Job {
  id        Int      @id @default(autoincrement())
  type      String
  status    String   @default("pending")
  payload   String?
  result    String?
  createdBy Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
