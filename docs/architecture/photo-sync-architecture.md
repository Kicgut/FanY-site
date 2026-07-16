---
title: "照片同步架构与操作指南"
created: 2026-07-07 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 📅 创建日期：2026-07-07"
scope: "全阶段"
related: []
tags:
  - architecture
  - photo-system
---

# 照片同步架构与操作指南

> 📅 创建日期：2026-07-07
> 🎯 用途：记录照片在 ECS 和本地服务器之间的同步方案

---

## 一、核心概念

### 三个独立控制维度

```
┌─────────────────────────────────────────────────────────────────┐
│                     照片控制维度                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 可见性 (visibility) — 谁能看？                              │
│     ├─ public    : 所有人可见                                   │
│     ├─ friends   : 朋友可见（可细分）                           │
│     └─ private   : 仅自己可见                                   │
│                                                                 │
│  2. 展示状态 (status) — 是否对外展示？                          │
│     ├─ published : 展示中                                       │
│     ├─ hidden    : 已下架（不展示，但可重新上架）               │
│     └─ archived  : 已归档（冷存储）                             │
│                                                                 │
│  3. ECS 同步策略 (ecsSyncPolicy) — 是否同步缩略图到 ECS？       │
│     ├─ synced    : ECS 有缩略图（用于快速展示）                 │
│     ├─ local_only: 只在本地（不展示或下架）                     │
│     ├─ pending   : 待同步                                       │
│     ├─ syncing   : 正在同步                                     │
│     └─ failed    : 同步失败                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 控制矩阵

```
┌─────────────┬─────────────┬─────────────────┬─────────────────────────┐
│ visibility  │ status      │ ecsSyncPolicy   │ 说明                    │
├─────────────┼─────────────┼─────────────────┼─────────────────────────┤
│ public      │ published   │ synced          │ 公开展示，ECS 有缩略图  │
│ public      │ hidden      │ local_only      │ 下架，删除 ECS 缩略图   │
│ public      │ published   │ pending         │ 待同步（刚上架）        │
│ friends     │ published   │ synced          │ 朋友可见，ECS 有缩略图  │
│ friends     │ hidden      │ local_only      │ 下架                    │
│ private     │ any         │ local_only      │ 私有永远不同步          │
└─────────────┴─────────────┴─────────────────┴─────────────────────────┘
```

---

## 二、存储架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           照片存储架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ECS 宿主机 (/opt/personal-website/)                                        │
│  ├── data/                                                                  │
│  │   ├── prod.db                    ← 数据库                                │
│  │   └── blog-md/                   ← 博客 MD 备份                          │
│  │                                                                         │
│  ├── uploads/                                                               │
│  │   └── photos/                   ← 照片外挂目录                           │
│  │       ├── ecs-originals/        ← ECS 临时原图（待回流）                 │
│  │       │   └── 2026-07/                                                  │
│  │       │       ├── uuid1_original.jpg                                    │
│  │       │       └── uuid2_original.jpg                                    │
│  │       │                                                                 │
│  │       └── thumbnails/           ← 缩略图（ECS 永久保留）                │
│  │           └── 2026-07/                                                  │
│  │               ├── uuid1_thumb.jpg                                       │
│  │               ├── uuid1_medium.jpg                                      │
│  │               ├── uuid2_thumb.jpg                                       │
│  │               └── uuid2_medium.jpg                                      │
│  │                                                                         │
│  └── backups/                                                               │
│                                                                             │
│  容器内映射：                                                                │
│  /app/data/          → ECS ./data/                                          │
│  /app/public/uploads → ECS ./uploads/                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  本地服务器 (/mnt/data/personal-website/)                                   │
│  ├── photos/                       ← 所有原图（永久存储）                   │
│  │   ├── public/                   ← 公开照片原图                           │
│  │   │   └── 2026-07/                                                     │
│  │   │       ├── uuid1_original.jpg                                        │
│  │   │       └── uuid2_original.jpg                                        │
│  │   ├── friends/                  ← 朋友可见原图                           │
│  │   │   └── 2026-07/                                                     │
│  │   └── private/                  ← 私人原图                               │
│  │       └── 2026-07/                                                     │
│  │                                                                         │
│  └── thumbnails/                   ← 缩略图（本地副本）                     │
│      ├── public/                                                          │
│      │   └── 2026-07/                                                     │
│      ├── friends/                                                         │
│      │   └── 2026-07/                                                     │
│      └── private/                                                         │
│          └── 2026-07/                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、两种上传模式

### 模式 A：远程上传（手机/电脑浏览器）

```
用户浏览器 → ECS API → ECS 临时存储 → 同步脚本 → 本地永久存储
                ↓
          缩略图留在 ECS
```

**详细流程**：

```
1. 用户上传照片
   POST /api/photos/upload
   └─→ 文件保存到 ECS: /app/public/uploads/photos/ecs-originals/2026-07/uuid_original.jpg

2. ECS 生成缩略图
   └─→ 保存到 ECS: /app/public/uploads/photos/thumbnails/2026-07/uuid_thumb.jpg
   └─→ 保存到 ECS: /app/public/uploads/photos/thumbnails/2026-07/uuid_medium.jpg

3. 数据库记录
   ├─ visibility = 'private'（默认私有，待审核）
   ├─ status = 'hidden'（待审核）
   ├─ ecsSyncPolicy = 'local_only'（私有不同步）
   ├─ originalPath = ECS 原图路径
   ├─ thumbPath = ECS 缩略图路径
   └─ ecsThumbPath = ECS 缩略图路径

4. 审核通过后上架
   ├─ visibility = 'public'（改为公开）
   ├─ status = 'published'
   └─ ecsSyncPolicy = 'pending'（待同步）

5. 同步脚本执行
   ./scripts/photo-sync.sh --mode upload
   ├─→ 从本地复制缩略图到 ECS（如果本地有）
   └─→ 或者直接使用 ECS 已有的缩略图

6. 原图回流（可选）
   ./scripts/photo-sync.sh --mode backflow
   ├─→ 从 ECS 复制原图到本地
   └─→ ECS 原图可选择删除
```

### 模式 B：本地上传（直接在服务器上）

```
本地脚本 → 本地存储 → 同步脚本 → ECS 缩略图 → 数据库更新
```

**详细流程**：

```
1. 本地上传照片
   └─→ 保存到本地: /mnt/data/personal-website/photos/public/2026-07/uuid_original.jpg

2. 本地生成缩略图
   └─→ 保存到本地: /mnt/data/personal-website/thumbnails/public/2026-07/uuid_thumb.jpg
   └─→ 保存到本地: /mnt/data/personal-website/thumbnails/public/2026-07/uuid_medium.jpg

3. 同步缩略图到 ECS
   rsync -avz thumbnails/ root@ecs:/opt/personal-website/uploads/photos/thumbnails/
   └─→ ECS 有缩略图，没有原图

4. 数据库记录
   ├─ visibility = 'public'（用户选择）
   ├─ status = 'hidden'（待审核）
   ├─ ecsSyncPolicy = 'pending'
   ├─ originalPath = 本地原图路径
   ├─ thumbPath = 本地缩略图路径
   └─ ecsThumbPath = ECS 缩略图路径

5. 审核通过后上架
   └─ ecsSyncPolicy = 'synced'
```

---

## 四、操作流程

### 4.1 上架公开照片

```
1. 选择照片：visibility='public', status='hidden'
2. 点击"上架"
3. 系统执行：
   ├─ status = 'published'
   ├─ ecsSyncPolicy = 'pending'
   └─ 触发同步任务
4. 同步任务：
   ├─ 生成缩略图（如果本地没有）
   ├─ rsync 到 ECS
   └─ ecsSyncPolicy = 'synced'
```

### 4.2 下架公开照片

```
1. 选择照片：visibility='public', status='published', ecsSyncPolicy='synced'
2. 点击"下架"
3. 系统执行：
   ├─ status = 'hidden'
   ├─ ecsSyncPolicy = 'local_only'
   └─ 可选：删除 ECS 缩略图
4. 展示时：
   └─ 前台查询条件：status='published' AND ecsSyncPolicy='synced'
```

### 4.3 私有照片

```
1. 上传时：visibility='private'
2. 系统执行：
   ├─ status = 'hidden'（待审核）或 'published'（自动通过）
   ├─ ecsSyncPolicy = 'local_only'（永远不同步）
   └─ 原图只在本地
3. 展示时：
   └─ 只有登录用户且是 owner 才能看
```

---

## 五、API 接口

### 5.1 获取同步统计

**接口**：`GET /api/photos/sync?action=stats`

**响应**：
```json
{
  "success": true,
  "data": {
    "pending": 10,
    "syncing": 0,
    "synced": 50,
    "failed": 2,
    "localOnly": 100,
    "total": 162
  }
}
```

### 5.2 获取待同步照片列表

**接口**：`GET /api/photos/sync?limit=50`

### 5.3 触发同步操作

**接口**：`POST /api/photos/sync`

**请求体**：
```json
{
  "action": "sync-batch",
  "limit": 10
}
```

### 5.4 标记同步完成

**接口**：`POST /api/photos/sync/complete`

**请求体**：
```json
{
  "photoId": 1,
  "ecsThumbPath": "/opt/personal-website/uploads/photos/thumbnails/2026-07/uuid_thumb.jpg"
}
```

### 5.5 标记同步失败

**接口**：`POST /api/photos/sync/fail`

**请求体**：
```json
{
  "photoId": 1,
  "error": "File copy failed"
}
```

---

## 六、脚本使用指南

### 6.1 照片同步脚本

**路径**：`nuxt-app/scripts/photo-sync.sh`

**用法**：
```bash
cd /mnt/data/personal-website

# 查看统计
./scripts/photo-sync.sh --stats

# 上传本地缩略图到 ECS
./scripts/photo-sync.sh --mode upload --limit 10

# 从 ECS 回流原图到本地
./scripts/photo-sync.sh --mode backflow --limit 10

# 重置失败的照片
./scripts/photo-sync.sh --reset-failed
```

---

## 七、常见操作

### 7.1 查看同步状态

```bash
./scripts/photo-sync.sh --stats
```

### 7.2 执行同步

```bash
# 上传缩略图到 ECS
./scripts/photo-sync.sh --mode upload --limit 10

# 回流原图到本地
./scripts/photo-sync.sh --mode backflow --limit 10
```

### 7.3 重置失败的照片

```bash
./scripts/photo-sync.sh --reset-failed
```

---

## 八、故障排查

### 问题：同步脚本报错 "Connection refused"

**原因**：ECS 服务未启动或网络问题

**解决**：
```bash
# 检查 ECS 服务
ssh root@120.26.231.150 "docker ps | grep personal"

# 检查 API
curl http://120.26.231.150/api/photos/sync?action=stats
```

### 问题：照片状态一直是 "syncing"

**原因**：同步过程中断

**解决**：
```bash
./scripts/photo-sync.sh --reset-failed
```

---

## 九、文件清单

| 文件 | 位置 | 用途 |
|------|------|------|
| `photo-sync.ts` | `server/services/` | 同步服务逻辑 |
| `photo-storage.ts` | `server/services/` | 存储路径管理 |
| `sync.get.ts` | `server/api/photos/` | 获取同步状态 |
| `sync.post.ts` | `server/api/photos/` | 触发同步操作 |
| `sync/complete.post.ts` | `server/api/photos/` | 标记完成 |
| `sync/fail.post.ts` | `server/api/photos/` | 标记失败 |
| `photo-sync.sh` | `scripts/` | 同步脚本 |
| `schema.prisma` | `prisma/` | 数据库模型 |

---

*最后更新：2026-07-07*
