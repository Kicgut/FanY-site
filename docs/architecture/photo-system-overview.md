---
title: "照片系统全架构：导入、回流、同步与展示"
created: 2026-07-07 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 📅 创建日期：2026-07-07"
scope: "全阶段"
related: []
tags:
  - architecture
---

# 照片系统全架构：导入、回流、同步与展示

> 📅 创建日期：2026-07-07
> 🎯 用途：一站式了解照片从上传到展示的完整生命周期，涵盖 ECS 与本地服务器之间的所有数据流
> 📎 关联文档：`photo-sync-architecture.md`（同步细节）、`photo-backflow-architecture.md`（回流细节）

---

## 一、整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           照片系统整体架构                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                        ┌──────────────┐                                         │
│                        │  用户浏览器   │                                         │
│                        │ (手机/电脑)   │                                         │
│                        └──────┬───────┘                                         │
│                               │                                                 │
│            ┌──────────────────┼──────────────────┐                              │
│            │ 上传              │ 浏览              │                              │
│            ▼                  ▼                   │                              │
│  ┌─────────────────────────────────────────┐     │                              │
│  │  ECS                                     │     │                              │
│  │                                         │     │                              │
│  │  ┌───────────┐    ┌──────────────────┐ │     │                              │
│  │  │ Nginx :80 │───→│ Nuxt App :3000   │ │     │                              │
│  │  └───────────┘    │                  │ │     │                              │
│  │                    │ /api/photos/*    │ │     │                              │
│  │                    │ /photos (gallery)│ │     │                              │
│  │                    └────────┬─────────┘ │     │                              │
│  │                             │           │     │                              │
│  │  ┌──────────────────────────┼────────┐ │     │                              │
│  │  │ Docker Volume Mounts     │        │ │     │                              │
│  │  │                          ▼        │ │     │                              │
│  │  │  data/ ────────→ prod.db (SQLite) │ │     │                              │
│  │  │  uploads/ ────→ photos/           │ │     │                              │
│  │  │    ├── ecs-originals/ (临时原图)  │ │     │                              │
│  │  │    └── thumbnails/ (缩略图永久)   │ │     │                              │
│  │  └───────────────────────────────────┘ │     │                              │
│  └──────────────────┬──────────────────────┘     │                              │
│                     │                             │                              │
│          SSH/SCP (回流原图)                        │                              │
│          SCP (上传缩略图)                          │                              │
│                     │                             │                              │
│  ┌──────────────────▼──────────────────────┐     │                              │
│  │  本地服务器 (ASUS FX504GE, Ubuntu 24.04) │     │                              │
│  │                                         │     │                              │
│  │  /mnt/data/personal-website/             │     │                              │
│  │  ├── photos/          ← 原图永久存储     │     │                              │
│  │  │   ├── public/       (按visibility分) │     │                              │
│  │  │   ├── friends/                      │     │                              │
│  │  │   └── private/                      │     │                              │
│  │  │                                     │     │                              │
│  │  ├── thumbnails/      ← 缩略图本地副本  │     │                              │
│  │  │   ├── public/                       │     │                              │
│  │  │   ├── friends/                      │     │                              │
│  │  │   └── private/                      │     │                              │
│  │  │                                     │     │                              │
│  │  └── nuxt-app/        ← 源代码         │     │                              │
│  │      ├── server/services/               │     │                              │
│  │      │   ├── photo-storage.ts           │     │                              │
│  │      │   ├── photo-sync.ts              │     │                              │
│  │      │   ├── photo-backflow.ts          │     │                              │
│  │      │   └── photo-review.ts            │     │                              │
│  │      └── scripts/                      │     │                              │
│  │          ├── photo-sync.sh             │     │                              │
│  │          └── photo-backflow.sh         │     │                              │
│  └─────────────────────────────────────────┘     │                              │
│                                                   │                              │
│                               公开页面只展示:      │                              │
│                               visibility=public   │                              │
│                               status=active       │                              │
│                               reviewStatus=approved│                             │
│                               ecsSyncPolicy=synced│                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、三个独立控制维度

照片的状态由三个独立维度控制，互不干扰：

| 维度 | 字段 | 含义 | 可选值 |
|------|------|------|--------|
| **可见性** | `visibility` | 谁能看？ | `public` / `friends` / `private` |
| **展示状态** | `status` | 是否对外展示？ | `published`(或`active`) / `hidden` / `archived` |
| **ECS同步策略** | `ecsSyncPolicy` | 缩略图是否在ECS？ | `synced` / `pending` / `syncing` / `failed` / `local_only` |

另外还有两个辅助维度：

| 维度 | 字段 | 含义 | 可选值 |
|------|------|------|--------|
| **审核状态** | `reviewStatus` | 是否通过审核？ | `pending` / `approved` / `rejected` / `needs_edit` |
| **存储位置** | `storageLocation` | 原图在哪？（兼容字段） | `local` / `ecs_only` / `ecs_and_local` / `archived` |

### 维度组合示例

```
┌─────────────┬───────────┬─────────────────┬──────────────┬─────────────────────────┐
│ visibility  │ status    │ ecsSyncPolicy   │ reviewStatus │ 说明                    │
├─────────────┼───────────┼─────────────────┼──────────────┼─────────────────────────┤
│ public      │ active    │ synced          │ approved     │ ✅ 公开展示，ECS有缩略图 │
│ public      │ active    │ pending         │ approved     │ ⏳ 待同步到ECS           │
│ public      │ hidden    │ local_only      │ approved     │ 🔒 已下架               │
│ friends     │ active    │ synced          │ approved     │ 👥 朋友可见             │
│ friends     │ hidden    │ local_only      │ approved     │ 🔒 朋友页已下架         │
│ private     │ any       │ local_only      │ any          │ 🔐 永远不同步到ECS      │
│ any         │ hidden    │ local_only      │ pending      │ 📤 刚上传，待审核       │
└─────────────┴───────────┴─────────────────┴──────────────┴─────────────────────────┘
```

---

## 三、照片生命周期（完整流程）

### 3.1 流程总览

```
  上传 ──→ 存储(临时) ──→ 审核 ──→ 上架 ──→ 同步到ECS ──→ 公开展示
   │                                      │
   │                                      ▼
   │                              下架/归档(可选)
   │                                      │
   ▼                                      ▼
  原图回流 ←──── ECS临时原图 ←──── 缩略图从ECS删除
   │
   ▼
  本地永久存储
```

### 3.2 详细步骤

#### 步骤 1：用户上传

**入口**：`POST /api/photos/upload`

```
用户浏览器 ──multipart/form-data──→ ECS API
                                      │
                                      ├─ 验证：MIME类型(jpg/png/gif/webp) + 大小(≤10MB)
                                      ├─ 保存原图 → /app/public/uploads/photos/ecs-originals/{YYYY-MM}/{uuid}_original.{ext}
                                      ├─ 生成缩略图（sharp）:
                                      │   ├─ thumb (400px宽, quality 80)
                                      │   └─ medium (1200px宽, quality 85)
                                      ├─ 保存缩略图 → /app/public/uploads/photos/thumbnails/{YYYY-MM}/
                                      ├─ 创建数据库记录:
                                      │   ├─ visibility = 'private' (强制)
                                      │   ├─ status = 'hidden'
                                      │   ├─ reviewStatus = 'pending'
                                      │   ├─ ecsSyncPolicy = 'local_only' (私有不同步)
                                      │   └─ storageLocation = 'local'
                                      └─ 返回 photoId
```

**安全规则**：
- 上传者无法自行设置 `visibility=public` 或 `status=active`
- 所有上传默认 `private` + `hidden` + `pending` 审核

#### 步骤 2：管理员审核

**入口**：`POST /api/photos/:id/approve` 或后台管理 UI

审核时 owner 决定：
- `visibility`：改为 `public` / `friends` / 保持 `private`
- `status`：改为 `active` / 保持 `hidden`
- `reviewStatus`：改为 `approved` / `rejected` / `needs_edit`
- 其他：标题、描述、标签、相册、是否允许下载原图

审核通过后，`photo-sync.ts` 的 `calculateEcsSyncPolicy()` 自动计算：
- `public` + `active` → `ecsSyncPolicy = 'pending'`（待同步）
- `friends` + `active` → `ecsSyncPolicy = 'pending'`（待同步）
- `private` → 永远 `local_only`

#### 步骤 3：缩略图同步到 ECS（upload 模式）

**入口**：`./scripts/photo-sync.sh --mode upload --limit 10`

```
本地服务器                                      ECS
   │                                              │
   │  1. GET /api/photos/sync?limit=10            │
   │  ───────────────────────────────────────────→ │
   │  ← 返回 ecsSyncPolicy='pending' 的照片列表    │
   │  ←─────────────────────────────────────────── │
   │                                              │
   │  2. 对每张照片:                               │
   │     scp 本地缩略图 ──────────────────────────→ │ uploads/photos/thumbnails/{YYYY-MM}/
   │     scp 本地中图 ────────────────────────────→ │ uploads/photos/thumbnails/{YYYY-MM}/
   │                                              │
   │  3. POST /api/photos/sync/complete            │
   │  ───────────────────────────────────────────→ │
   │     { photoId, ecsThumbPath }                │
   │     → ecsSyncPolicy = 'synced'               │
```

**核心逻辑**：
- 只同步 `public` + `active` + `reviewStatus=approved` 的照片
- `private` 照片永远不同步缩略图
- `friends` 照片同步缩略图到 ECS（朋友登录后可通过 API 访问）

#### 步骤 4：原图回流到本地（backflow 模式）

**入口**：`./scripts/photo-backflow.sh --limit 10`

```
ECS                                              本地服务器
   │                                              │
   │  1. GET /api/photos/backflow?limit=10        │
   │  ←─────────────────────────────────────────── │
   │  ← 返回 storageLocation='ecs_only' 的照片     │
   │                                              │
   │  2. 对每张照片:                               │
   │     docker cp → /tmp/photo-backflow-{id}     │
   │     scp /tmp/photo-backflow-{id} ───────────→ │ photos/{visibility}/{YYYY-MM}/{uuid}_original.{ext}
   │     rm /tmp/photo-backflow-{id}              │
   │                                              │
   │  3. POST /api/photos/backflow/complete        │
   │  ←─────────────────────────────────────────── │
   │     { photoId, localPath }                   │
   │     → storageLocation = 'ecs_and_local'       │
   │     → syncStatus = 'synced'                  │
```

**触发时机**：
- 手动执行脚本
- 未来可设置 cron 定时执行

#### 步骤 5：公开展示

**入口**：`GET /api/photos` 或照片画廊页面

前端查询条件（非 admin 用户）：
```
reviewStatus = 'approved'
status = 'active'（或 'published'）
visibility = 'public'（未登录）
OR visibility = 'friends' AND visibleTo 包含当前用户（已登录）
OR visibility = 'private' AND uploadedBy = 当前用户（已登录）
```

---

## 四、两种上传场景对比

### 场景 A：远程上传（手机/电脑浏览器）

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────────┐
│ 用户浏览器    │──POST─→│ ECS (Nuxt App)    │──SSH──→│ 本地服务器        │
│              │       │                   │       │                  │
│              │       │ 1. 保存原图(临时)  │       │                  │
│              │       │ 2. 生成缩略图     │       │                  │
│              │       │ 3. 创建DB记录     │       │                  │
│              │       │ 4. 原图留在ECS    │       │                  │
│              │       │    (待回流)       │       │                  │
│              │       └───────────────────┘       │                  │
│              │                                   │                  │
│              │       回流脚本:                    │                  │
│              │       ECS原图 ──scp──→ 本地photos/ │                  │
│              │       ECS保留缩略图               │                  │
└──────────────┘                                   └──────────────────┘
```

**数据流**：用户 → ECS(原图+缩略图) → 回流 → 本地(原图) + ECS(缩略图)

### 场景 B：本地上传（直接在服务器操作）

```
┌──────────────────┐       ┌───────────────────┐
│ 本地服务器        │──rsync─→│ ECS               │
│                  │       │                   │
│ 1. 保存原图      │       │ 1. 接收缩略图     │
│ 2. 生成缩略图    │       │ 2. 更新DB记录     │
│ 3. 创建DB记录    │       │                   │
│ 4. 同步缩略图──→─│       │                   │
└──────────────────┘       └───────────────────┘
```

**数据流**：本地(原图+缩略图) → rsync → ECS(缩略图)

---

## 五、存储结构对照

### ECS 宿主机 (`/opt/personal-website/`)

```
/opt/personal-website/
├── data/
│   └── prod.db                          ← SQLite 数据库
│
├── uploads/
│   └── photos/                          ← 容器内: /app/public/uploads/photos/
│       ├── ecs-originals/               ← 远程上传的原图（临时，待回流）
│       │   └── 2026-07/
│       │       ├── {uuid1}_original.jpg
│       │       └── {uuid2}_original.png
│       │
│       └── thumbnails/                  ← 缩略图（ECS 永久保留，用于公开展示）
│           └── 2026-07/
│               ├── {uuid1}_thumb.jpg    ← 400px 缩略图
│               ├── {uuid1}_medium.jpg   ← 1200px 中图
│               ├── {uuid2}_thumb.jpg
│               └── {uuid2}_medium.jpg
│
└── backups/
```

### 本地服务器 (`/mnt/data/personal-website/`)

```
/mnt/data/personal-website/
├── photos/                              ← 所有原图（永久存储，真正的资产）
│   ├── public/                          ← 公开照片原图
│   │   └── 2026-07/
│   │       └── {uuid1}_original.jpg
│   ├── friends/                         ← 朋友可见原图
│   │   └── 2026-07/
│   │       └── {uuid3}_original.jpg
│   └── private/                         ← 私人原图
│       └── 2026-07/
│           └── {uuid4}_original.jpg
│
├── thumbnails/                          ← 缩略图本地副本
│   ├── public/
│   │   └── 2026-07/
│   │       ├── {uuid1}_thumb.jpg
│   │       └── {uuid1}_medium.jpg
│   ├── friends/
│   └── private/
│
└── nuxt-app/                            ← 源代码
```

### Docker Volume 映射

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data                     # SQLite 数据库
  - ./uploads:/app/public/uploads        # 照片文件
  - ./backups:/app/backups               # 备份
```

---

## 六、Prisma 数据库模型（Photo 相关字段）

```prisma
model Photo {
  id                   Int      @id @default(autoincrement())
  title                String
  description          String?
  filename             String   @unique
  originalUrl          String                  // 访问URL
  thumbnailUrl         String?
  mediumUrl            String?
  width                Int?
  height               Int?
  fileSize             Int?
  mimeType             String?
  location             String?                 // 拍摄地点
  takenAt              DateTime?               // 拍摄时间

  // ── 三个核心控制维度 ──
  visibility           String   @default("private")     // public / friends / private
  status               String   @default("published")   // published / hidden / archived
  ecsSyncPolicy        String   @default("local_only")  // synced / local_only / pending / syncing / failed

  // ── 审核 ──
  reviewStatus         String   @default("pending")     // pending / approved / rejected / needs_edit
  reviewNote           String?
  reviewedBy           Int?
  reviewedAt           DateTime?
  uploadedBy           Int?

  // ── 文件路径 ──
  originalPath         String?                 // 原图路径（ECS 或本地）
  thumbPath            String?                 // 缩略图路径（本地）
  ecsThumbPath         String?                 // ECS 缩略图路径

  // ── 同步与回流 ──
  storageLocation      String   @default("local")  // ecs_only / local_only / ecs_and_local / archived
  syncedAt             DateTime?
  syncError            String?
  checksum             String?

  // ── 权限与下载 ──
  visibleTo            String?                 // 指定可见用户（逗号分隔）
  allowOriginalDownload Boolean @default(false)

  // ── AI 分析（预留）──
  suggestedTags        String?
  suggestedLocation    String?
  suggestedDescription String?
  analysisStatus       String   @default("none")

  // ── 时间戳 ──
  archivedAt           DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // ── 关联 ──
  albums               AlbumPhoto[]
  tags                 PhotoTag[]
}
```

---

## 七、API 接口一览

### 7.1 照片 CRUD

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| `GET` | `/api/photos` | 照片列表（带权限过滤） | 公开（按visibility过滤） |
| `GET` | `/api/photos/:id` | 照片详情 | 公开（按visibility过滤） |
| `POST` | `/api/photos/upload` | 上传照片 | 登录用户 |
| `PUT` | `/api/photos/:id` | 编辑照片 | Admin |
| `DELETE` | `/api/photos/:id` | 删除照片 | Admin |
| `GET` | `/api/photos/my-uploads` | 我的上传 | 登录用户 |
| `POST` | `/api/photos/:id/resubmit` | 重新提交（审核退回后） | 原上传者 |

### 7.2 同步（缩略图 → ECS）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/photos/sync?action=stats` | 获取同步统计 |
| `GET` | `/api/photos/sync?limit=N` | 获取待同步照片列表 |
| `POST` | `/api/photos/sync` | 触发同步操作（`sync-batch` / `reset-failed`） |
| `POST` | `/api/photos/sync/complete` | 标记同步完成 |
| `POST` | `/api/photos/sync/fail` | 标记同步失败 |

### 7.3 回流（原图 ECS → 本地）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/photos/backflow?action=stats` | 获取回流统计 |
| `GET` | `/api/photos/backflow?limit=N` | 获取待回流照片列表 |
| `POST` | `/api/photos/backflow` | 触发回流操作（`backflow-batch` / `backflow-single` / `reset-failed`） |
| `POST` | `/api/photos/backflow/complete` | 标记回流完成 |
| `POST` | `/api/photos/backflow/fail` | 标记回流失败 |

---

## 八、Shell 脚本操作指南

### 8.1 photo-sync.sh（缩略图同步）

```bash
cd /mnt/data/personal-website

# 查看同步统计
./scripts/photo-sync.sh --stats

# 上传本地缩略图到 ECS
./scripts/photo-sync.sh --mode upload --limit 10

# 从 ECS 回流原图到本地（此脚本也支持回流模式）
./scripts/photo-sync.sh --mode backflow --limit 10

# 重置失败的照片
./scripts/photo-sync.sh --reset-failed
```

### 8.2 photo-backflow.sh（原图回流）

```bash
cd /mnt/data/personal-website

# 查看回流统计
./scripts/photo-backflow.sh --stats

# 处理所有待回流照片
./scripts/photo-backflow.sh

# 处理指定数量
./scripts/photo-backflow.sh --limit 10

# 重置失败的照片
./scripts/photo-backflow.sh --reset-failed
```

---

## 九、展示条件矩阵

### 公开页面（未登录用户）

```
visibility = 'public'
status = 'active'（或 'published'）
reviewStatus = 'approved'
```

### 朋友页面（已登录，且在 visibleTo 列表中）

```
visibility = 'friends'
status = 'active'
reviewStatus = 'approved'
visibleTo 包含当前用户名
```

### 私有页面（仅 owner）

```
visibility = 'private'
uploadedBy = 当前用户ID
```

### Admin 后台

```
无过滤条件，可看到所有照片
可按 reviewStatus 筛选（pending / approved / rejected / needs_edit）
```

---

## 十、代码文件清单

### 服务层（server/services/）

| 文件 | 职责 |
|------|------|
| `photo-storage.ts` | 文件存储操作：保存上传、复制缩略图、删除文件、路径生成 |
| `photo-sync.ts` | 同步逻辑：待同步查询、标记完成/失败、计算 ecsSyncPolicy、上架/下架 |
| `photo-backflow.ts` | 回流逻辑：待回流查询、标记完成/失败、存储位置状态管理 |
| `photo-review.ts` | 审核逻辑：创建待审记录、批准/拒绝/退回重审、用户查看自己的上传 |

### API 路由（server/api/photos/）

| 文件 | 职责 |
|------|------|
| `upload.post.ts` | 照片上传（保存到 ECS + 创建 DB 记录） |
| `index.get.ts` | 照片列表（带权限过滤） |
| `index.post.ts` | 创建照片记录（元数据） |
| `[id].get.ts` | 照片详情 |
| `[id].put.ts` | 编辑照片 |
| `[id].delete.ts` | 删除照片 |
| `my-uploads.get.ts` | 当前用户的上传列表 |
| `[id]/resubmit.post.ts` | 重新提交审核 |
| `sync.get.ts` / `sync.post.ts` | 同步统计与触发 |
| `sync/complete.post.ts` / `sync/fail.post.ts` | 同步完成/失败回调 |
| `backflow.get.ts` / `backflow.post.ts` | 回流统计与触发 |
| `backflow/complete.post.ts` / `backflow/fail.post.ts` | 回流完成/失败回调 |

### Shell 脚本（scripts/）

| 文件 | 职责 |
|------|------|
| `photo-sync.sh` | 缩略图同步到 ECS（SCP） + 回流模式 |
| `photo-backflow.sh` | 原图从 ECS 回流到本地（SSH + docker cp + SCP） |

---

## 十一、故障排查

### 同步/回流脚本报错 "Connection refused"

```bash
# 检查 ECS 容器状态
ssh yyh-ecs "docker ps | grep personal"

# 检查 API 是否可达
curl http://<ECS_HOST>/api/photos/sync?action=stats
```

### 照片状态一直是 "syncing"

同步/回流过程中断，需要重置：

```bash
./scripts/photo-sync.sh --reset-failed
./scripts/photo-backflow.sh --reset-failed
```

### 本地路径不存在

```bash
mkdir -p /mnt/data/personal-website/photos/{public,friends,private}
mkdir -p /mnt/data/personal-website/thumbnails/{public,friends,private}
```

### Prisma 报错 "column does not exist"

容器内 SQLite schema 与 Prisma client 不同步。**解决**：重启容器（Prisma client 缓存问题）。

---

## 十二、设计原则

1. **ECS 是轻量入口**：只存储缩略图用于公开展示，不长期保存原图
2. **本地是资产中心**：所有原图最终都在本地服务器永久保存
3. **私有永远不出站**：`private` 照片的缩略图和原图都不同步到 ECS
4. **审核前置**：上传 → 必须审核 → 才能公开/同步
5. **三维度独立控制**：可见性、展示状态、同步策略互不干扰
6. **失败可恢复**：所有同步/回流操作都支持标记失败 + 重试

---

*最后更新：2026-07-07*
