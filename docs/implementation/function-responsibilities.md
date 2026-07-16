---
title: "函数与服务职责设计"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\implementation
---
# 函数与服务职责设计

## 1. auth.service.ts

职责：

- 登录。
- token 校验。
- 当前用户。
- 二次认证。
- accessSource 判断。

函数：

```ts
login(username, password)
getCurrentUser(event)
requireUser(event)
requireAdmin(event)
requireOwner(event)
requireSecondFactor(user)
getAccessSource(event)
```

## 2. permission.service.ts

职责：统一权限判断。

```ts
canViewPhoto(user, photo, context)
canDownloadOriginal(user, photo, context)
canUploadPhoto(user, context)
canReviewPhoto(user, photo, context)
canChangeVisibility(user, photo, context)
canDeletePhoto(user, photo, context)
canAccessAI(user, context)
canManageSkill(user, skill, context)
requireLocalTrusted(context)
```

## 3. photo.service.ts

职责：照片业务。

```ts
listVisiblePhotos(user, filters, context)
getPhotoDetail(user, id, context)
createUploadRecord(user, fileMeta, context)
extractExif(filePath)
generateThumbnail(filePath)
reviewPhoto(admin, photoId, decision, context)
updatePhotoMetadata(user, photoId, patch, context)
getOriginalStream(user, photoId, context)
```

## 4. review.service.ts

职责：通用审核。

```ts
createReviewItem(type, resourceId)
approveReviewItem(user, id, decision)
rejectReviewItem(user, id, reason)
requestEdit(user, id, note)
```

## 5. hermes.service.ts

职责：Hermes gateway。

```ts
chat(user, message, context)
selectProfile(user, context)
createCurationJob(user, payload)
listConversations(user)
```

## 6. content-pipeline.service.ts

职责：内容流水线。

```ts
saveConversation(conversation)
importMarkdown(file)
runDailyCuration(date)
listCandidates()
reviewCandidate(id, decision)
publishCandidate(id)
```

## 7. skill-registry.service.ts

职责：Skill 索引。

```ts
scanSkills()
listSkills(filters)
getSkill(id)
markSkill(id, status, note)
updateUsageStats()
requestStabilizeSkill(id)
```

## 8. audit-log.ts

所有敏感操作调用：

```ts
writeAuditLog({ userId, action, resourceType, resourceId, before, after, context })
```
