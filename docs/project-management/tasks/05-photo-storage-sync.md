---
title: "Phase 5：照片存储、缩略图、同步与归档预留"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Phase 5：照片存储、缩略图、同步与归档预留

## 1. 任务目标

建立照片文件的本地优先存储结构，并实现公开缩略图同步到 ECS 的基础流程。第一版先完成 local original + thumbnail + syncStatus，不强制完成冷存储全流程。

## 2. 前置条件

- Phase 4 已完成。
- 已确认本地服务器照片根目录。
- 已阅读 `docs/architecture/ecs-local-frp-storage.md` 和 `docs/operations/storage-sync-archive.md`。

## 3. 改动范围

### 允许改动

- 本地目录规范。
- 上传文件保存路径。
- 缩略图生成脚本。
- ECS 同步脚本。
- `Photo.originalPath`、`thumbPath`、`ecsThumbPath`、`syncStatus` 更新逻辑。

### 禁止改动

- 不删除任何原图。
- 不把 friends/private 原图同步到 ECS。
- 不公开本地文件系统路径给前端。

## 4. 目录规范

```text
/mnt/data/personal-website/photos/
├── incoming/
├── public/YYYY-MM/
├── friends/YYYY-MM/
└── private/YYYY-MM/

/mnt/data/personal-website/thumbnails/YYYY-MM/
```

ECS：

```text
/opt/personal-website/public/uploads/photos/YYYY-MM/
```

## 5. 文件命名规则

使用不可预测文件名：

```text
{uuid}_{variant}.jpg
{uuid}_thumb.jpg
{uuid}_medium.jpg
```

不要使用原始文件名作为公开路径。

## 6. 核心函数

```ts
resolvePhotoStoragePath(photo, variant): SafePath
moveUploadToManagedStorage(file, visibility, takenAt): Promise<PathResult>
generatePhotoThumbnails(originalPath): Promise<ThumbnailSet>
markPhotoSyncPending(photoId): Promise<void>
markPhotoSynced(photoId, ecsThumbPath): Promise<void>
markPhotoSyncFailed(photoId, error): Promise<void>
```

## 7. 同步规则

只同步：

```text
visibility = public
status = active
reviewStatus = approved
thumbPath exists
storageLocation = local 或 ecs
```

禁止同步：

```text
visibility = friends
visibility = private
reviewStatus != approved
status = hidden
status = archived
```

## 8. 脚本要求

`sync-thumbnails.sh` 必须支持：

```bash
--dry-run
--limit N
--month YYYY-MM
--verbose
```

并且：

- 输出同步成功/失败数量。
- 同步失败不能中断整个批次。
- 同步前检查 ECS 空间。
- ECS 超过严重阈值时停止同步。

## 9. 验收标准

- public approved active 照片有 ECS 缩略图。
- friends/private 照片没有 ECS 公开文件。
- 前端只使用 ecsThumbPath 或受控 API，不暴露 originalPath。
- syncStatus 能区分 pending/synced/failed/skipped。
- dry-run 不修改任何文件和数据库。

## 10. 回滚方案

- 停止同步脚本。
- 删除本次同步的 ECS 缩略图，需基于日志。
- DB syncStatus 可回退为 pending。

## 11. Agent 注意事项

- 任何 rm/mv 批量操作必须先 dry-run。
- 不允许从用户输入直接拼接文件路径。
