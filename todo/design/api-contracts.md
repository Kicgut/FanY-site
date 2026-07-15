# API 合同设计

## 1. 统一响应

成功：

```json
{ "success": true, "data": {} }
```

失败：

```json
{ "success": false, "code": "FORBIDDEN", "message": "..." }
```

## 2. Auth

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/verify-2fa
```

## 3. AI

```text
POST /api/ai/chat
GET  /api/ai/sessions
GET  /api/ai/sessions/:id
```

权限：登录 + aiAccess。

## 4. Photos public/user

```text
GET  /api/photos
GET  /api/photos/:id
GET  /api/photos/:id/original
POST /api/photos/upload
GET  /api/my/uploads
```

## 5. Photos admin

```text
GET  /api/admin/photos
GET  /api/admin/photos/review
POST /api/admin/photos/:id/review
PUT  /api/admin/photos/:id
POST /api/admin/photos/batch/visibility
POST /api/admin/photos/batch/status
POST /api/admin/photos/batch/album
POST /api/admin/photos/batch/sync
POST /api/admin/photos/batch/archive
```

## 6. Review action body

```json
{
  "action": "approve",
  "visibility": "friends",
  "visibleTo": ["group:family"],
  "status": "active",
  "albumIds": [1, 2],
  "allowOriginalDownload": true,
  "reviewNote": "ok"
}
```

## 7. Users admin

```text
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
POST   /api/admin/users/:id/disable
POST   /api/admin/users/:id/reset-password
POST   /api/admin/users/:id/ai-access
```

## 8. Content pipeline

```text
GET  /api/admin/content/inbox
GET  /api/admin/content/candidates
GET  /api/admin/content/review
POST /api/admin/content/:id/review
POST /api/admin/content/:id/publish
```

## 9. Hermes skills

```text
GET  /api/admin/hermes/skills
GET  /api/admin/hermes/skills/:id
POST /api/admin/hermes/skills/:id/mark
GET  /api/admin/hermes/skill-usage
```

远程禁止编辑 stable skill 原文。

## 10. Jobs and storage

```text
GET  /api/admin/jobs
POST /api/admin/jobs/:id/retry
GET  /api/admin/storage/status
GET  /api/admin/audit-log
```
