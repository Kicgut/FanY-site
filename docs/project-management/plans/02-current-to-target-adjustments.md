---
title: "02-current-to-target-adjustments - 当前架构到目标架构的明确调整"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: draft
purpose: "记录目标设计和待完成方案，不代表当前代码已经实现。"
scope: "全项目"
related: []
tags:
  - project-management
---
# 02-current-to-target-adjustments - 当前架构到目标架构的明确调整

## 1. 当前架构基线

当前项目已经具备：

- Nuxt 3 SSR 应用。
- Vue 3 + Element Plus 前后台。
- Nuxt Content 博客。
- Prisma + SQLite。
- JWT 管理员登录。
- 文章 CRUD。
- 照片 CRUD。
- 相册 CRUD。
- 图片上传。
- Docker + Nginx。
- 部署、备份、恢复等脚本。

## 2. 明确保留

以下部分保留并继续扩展：

- Nuxt 3 技术栈。
- Prisma + SQLite，短期继续使用。
- Nuxt Content 博客体系。
- Element Plus 后台 UI。
- Docker 部署模式。
- Nginx 作为 ECS 入口。
- 现有文章、标签、相册基础能力。

## 3. 明确调整

### 3.1 Portfolio 与 Gallery 分离

当前 `/portfolio` 实际偏摄影画廊。目标架构中：

```text
/gallery    照片画廊
/portfolio  作品集，包括代码项目、设计、摄影精选
```

新增独立 `Portfolio` 模型。

### 3.2 Photo 模型升级

从展示型 Photo 升级为资产型 Photo。

新增字段：

```text
originalPath
thumbPath
ecsThumbPath
visibility
visibleTo
reviewStatus
uploadedBy
storageLocation
syncStatus
checksum
archivedAt
allowOriginalDownload
```

### 3.3 权限体系升级

从简单 admin JWT 升级为：

```text
role + groups + aiAccess + aiAccessLevel + accessSource + operationPermission
```

### 3.4 上传流程调整

当前上传后直接成为资源。目标：

```text
上传
→ 本地保存
→ 生成缩略图
→ EXIF 解析
→ pending review
→ owner 审核
→ 决定展示范围
```

### 3.5 存储位置调整

当前图片主要在 ECS 上传目录。目标：

```text
ECS：公开缩略图、作品集图片、博客图片
本地：所有原图、私密内容、Hermes 数据
冷存储：历史归档、长期备份
```

### 3.6 原图访问调整

禁止直接公开原图静态路径。

目标访问链路：

```text
用户
→ Nuxt API 权限校验
→ 本地 photo-server
→ 返回文件流或短期链接
```

### 3.7 Hermes 引入

新增：

- `/ai` 登录用户问答。
- `/admin/hermes` owner 管理。
- content-pipeline 内容流水线。
- skill registry。
- Hermes gateway。

### 3.8 审核机制引入

新增通用审核机制，用于：

- 朋友上传照片。
- Hermes 生成博客。
- Hermes 生成作品集。
- AI 图片分析标签建议。

## 4. 明确禁止

- 不允许朋友上传照片直接公开。
- 不允许 AI 生成博客后直接发布。
- 不允许公网暴露 Hermes 主 WebUI。
- 不允许远程 owner 永久删除照片。
- 不允许 private/friends 文件裸路径被浏览器直接访问。

## 5. 迁移顺序

1. 数据库字段扩展。
2. 权限服务抽象。
3. 照片 reviewStatus/visibility 查询调整。
4. 后台照片审核页。
5. 本地 photo-server 和 frp。
6. Hermes gateway。
7. content-pipeline。
8. skill registry。
9. 存储归档和告警。
