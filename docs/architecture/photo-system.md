---
title: 照片系统当前架构
version: 3.0.0
status: current
updated: 2026-07-24
---

# 照片系统当前架构

## 生命周期

```text
上传 / 导入 → Prisma Photo 记录 → 原图受控读取 → 缩略图生成与同步 → 审核 / 可见性控制 → 前台展示
```

照片元数据在 SQLite 中维护；ECS 持久化卷保存站点侧上传、缩略图和备份。Ubuntu 保存本地照片资源，并通过 FRP 后的 Photo Original API 提供受控原图读取。前台展示按所有者、审核状态和可见范围过滤。

## 同步与修复

- Ubuntu Worker 处理回流和缩略图同步。
- 管理端可扫描缺失原图、缺失缩略图和孤儿文件。
- 缩略图重建作为 Job 执行，具有任务状态、取消、结果和审计记录。
- 文件系统操作必须使用受限路径，不能由客户端传入任意本地路径。

## 运行手册

- [缩略图同步](../operations/photo-thumbnail-sync.md)
- [存储、同步与归档](../operations/storage-sync-archive.md)
- [FRP 隧道](../operations/frp-tunnel-guide.md)

## 版本记录

当前随总体架构 `v3.0.0` 维护；照片模型、访问边界或跨主机数据流变化时，必须更新本文件和 `current-architecture.md`。
