---
title: "照片系统：导入 / 展示 / 回流 / 同步"
created: 2026-07-08
updated: 2026-07-08
status: final
purpose: "```prisma"
scope: "全阶段"
tags:
  - architecture
---

# 照片系统：导入 / 展示 / 回流 / 同步

## 数据模型

```prisma
model Photo {
  id            Int      @id @default(autoincrement())
  filename      String
  originalName  String
  path          String               // 相对路径: /uploads/2026/07/xxx.jpg
  thumbnailPath String?              // 缩略图路径
  mimeType      String
  size          Int
  width         Int?
  height         Int?
  title         String?
  description   String?
  tags          String?              // JSON 数组
  visibility    String   @default("private")  // private | friends | public
  status        String   @default("active")   // active | archived | deleted
  ecsSyncPolicy String   @default("manual")   // manual | auto | disabled
  uploadedById  Int
  albumId       Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 三维控制

| 字段 | 作用 | 值 |
|------|------|------|
| `visibility` | 谁能看 | `private` / `friends` / `public` |
| `status` | 生命周期 | `active` / `archived` / `deleted` |
| `ecsSyncPolicy` | 同步策略 | `manual` / `auto` / `disabled` |

## 照片生命周期流程

```
                    ┌──────────────────────────────────────────┐
                    │              Admin 后台                    │
                    │  (ECS Nuxt App /admin/photos)             │
                    └────────────┬───────────────────────────────┘
                                 │
                    ┌────────────▼───────────────────────────────┐
          ① 导入    │  POST /api/admin/photos/upload             │
                    │  multipart/form-data → 保存到               │
                    │  /app/public/uploads/2026/07/xxx.jpg        │
                    │  写入 SQLite: Photo 表                       │
                    └────────────┬───────────────────────────────┘
                                 │
                    ┌────────────▼───────────────────────────────┐
          ② 管理    │  PUT /api/admin/photos/:id                 │
                    │  修改 title/description/tags                │
                    │  修改 visibility (谁能看)                    │
                    │  修改 status (归档/删除)                     │
                    │  修改 ecsSyncPolicy (同步策略)               │
                    └────────────┬───────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
  ┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
  │ ③ 展示        │   │ ④ 本地回流     │   │ ⑤ 清理            │
  │               │   │               │   │                   │
  │ 前端页面访问   │   │ photo-sync.sh │   │ 删除 status=deleted│
  │ GET /uploads/ │   │ rsync 拉取     │   │ 的物理文件         │
  │ Nginx 静态服务 │   │ 到本地备份     │   │                   │
  └───────────────┘   └───────────────┘   └───────────────────┘
```

## ① 照片导入

### Admin 后台上传

前端 `pages/admin/photos.vue` → `POST /api/admin/photos/upload`

服务端处理：
1. 接收 multipart 文件
2. 按年/月生成存储路径: `/uploads/2026/07/uuid.jpg`
3. 生成缩略图（如配置）
4. 写入 Photo 表，默认 `visibility=private`, `status=active`, `ecsSyncPolicy=manual`
5. 返回 Photo 对象

### 批量导入（回流场景）

从本地 `photo-sync.sh` 推送的照片也通过同一 API 入库。

## ② 照片展示

### 访问控制

```
用户请求照片
    │
    ├→ visibility=public  → 任何人可看
    ├→ visibility=friends → 登录用户可看（根据 groups 判断）
    └→ visibility=private → 仅上传者和 admin 可看
```

### 前端展示页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 作品集 | `/portfolio` | 公开照片展示 |
| 相册 | `/portfolio/album/:id` | 按相册浏览 |
| 照片详情 | `/portfolio/photo/:id` | 单张照片大图 |

### 静态文件服务

照片文件存储在 `/app/public/uploads/`，Nuxt 自动提供静态文件服务。
Nginx 也可以配置直接代理 `/uploads/` 路径以提高性能。

## ③ 照片本地回流

### photo-sync.sh 脚本

将 ECS 上的照片同步回本地备份。

**触发方式**: 手动执行 或 Cron 定时任务

**同步逻辑**:
```bash
# 从 ECS 拉取新照片到本地
rsync -avz --progress \
  root@120.26.231.150:/opt/personal-website/uploads/ \
  ~/photo-backup/
```

**筛选条件**（基于三维控制）:
- `status = active`（不拉已归档/删除的）
- `ecsSyncPolicy ≠ disabled`（跳过不同步的）
- 按 `visibility` 可以分批拉取

### 同步策略

| ecsSyncPolicy | 行为 |
|---------------|------|
| `auto` | 自动同步到本地（Cron 触发） |
| `manual` | 手动选择后同步（默认） |
| `disabled` | 不同步（临时文件等） |

## ④ 照片管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/photos/upload` | 上传照片 |
| GET | `/api/admin/photos` | 列表（分页、筛选） |
| GET | `/api/admin/photos/:id` | 详情 |
| PUT | `/api/admin/photos/:id` | 更新信息 |
| DELETE | `/api/admin/photos/:id` | 删除（软删除） |
| POST | `/api/photos/sync` | 触发同步 |

## 文件存储结构

```
ECS: /opt/personal-website/
├── uploads/                        ← Docker volume 映射
│   ├── 2026/
│   │   ├── 01/
│   │   │   ├── uuid1.jpg
│   │   │   └── uuid2.png
│   │   └── 07/
│   │       └── uuid3.jpg
│   └── thumbnails/                 ← 缩略图（如启用）
│       └── ...
└── data/
    └── prod.db                     ← SQLite (Photo 表)

本地: ~/photo-backup/               ← rsync 回流备份
├── 2026/
│   └── 01/
│       └── ...
└── ...
```
