---
title: "存储、同步与归档"
created: 2026-07-15 23:29
updated: 2026-08-01
status: current
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\operations
---
# 存储、同步与归档

## 1. 缩略图同步

只同步：

```text
ecsSyncPolicy=pending
visibility in (public, friends)
status=published
```

同步到：

```text
ECS /opt/personal-website/uploads/photos/thumbnails/
```

## 2. 原图不同步到 ECS

默认不把永久原图同步到 ECS；ECS 的 `uploads/photos/ecs-originals/` 仅用于上传后、回流前的临时原图。

例外必须人工确认，并记录 audit log。

## 3. 归档

归档动作：

1. 移动原图到 cold-storage。
2. 更新 manifest。
3. 更新 DB：`storageLocation=cold`。
4. 更新 DB：`status=archived`。
5. 记录 audit log。

## 4. 恢复

恢复动作：

1. 从 cold-storage 复制回 local photos。
2. 校验 checksum。
3. 生成缩略图。
4. 必要时同步 ECS。
5. 更新 DB。

## 5. 一致性检查

定期检查：

- DB 有记录但文件不存在。
- 文件存在但 DB 无记录。
- `public`/`friends` 且 `published` 的缩略图未同步。
- `private` 缩略图、任何永久原图，或无对应可见性与状态记录的文件意外出现在 ECS。
