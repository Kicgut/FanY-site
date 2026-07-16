---
title: "13 - 照片状态变更时联动 ECS 同步策略"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# 13 - 照片状态变更时联动 ECS 同步策略

## 状态

`not_started`

## 目标

admin 修改照片的 status 或 visibility 时，自动联动更新 `ecsSyncPolicy`，确保 ECS 缩略图与照片状态一致。

## 背景

`photo-sync.ts` 中已实现三个函数但从未接入：
- `publishPhoto(id)` — 上架：status→published，重算 ecsSyncPolicy
- `unpublishPhoto(id)` — 下架：status→hidden，ecsSyncPolicy→local_only
- `recalculateSyncPolicy(id)` — 通用：根据当前 visibility+status 重算

当前 admin 通过 `PUT /api/photos/:id` 直接改 status/visibility，但没调用这些函数，导致：
- 照片被隐藏后 ECS 缩略图仍然存在
- 照片公开后 ECS 缩略图不会同步

## 改动范围

- `server/api/photos/[id].put.ts` — 在 status/visibility 变更时调用联动函数
- 可能需要在 `server/api/admin/albums/[id]/visibility.patch.ts` 也加入联动

## 执行步骤

1. 读取 `PUT /api/photos/:id` 端点代码
2. 在 status 字段变更时：调用 `publishPhoto()` 或 `unpublishPhoto()`
3. 在 visibility 字段变更时：调用 `recalculateSyncPolicy()`
4. 验证：修改照片状态后检查 ecsSyncPolicy 是否正确更新

## 验收标准

- [ ] admin 将照片从 published 改为 hidden → ecsSyncPolicy 变为 local_only
- [ ] admin 将照片从 hidden 改为 published → ecsSyncPolicy 根据 visibility 重新计算
- [ ] admin 将 visibility 从 public 改为 private → ecsSyncPolicy 变为 local_only
- [ ] 已有 ECS 缩略图的照片下架后，缩略图不再出现在公开页面

## 注意

- 这些函数查询的是 `ecsSyncPolicy` 字段，需要确认 DB schema 中已有此字段（当前 schema 有但 DB 可能是 `syncStatus`，需检查迁移状态）
- 如果 schema/DB 不匹配，需要先解决迁移问题
