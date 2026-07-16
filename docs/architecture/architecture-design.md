---
title: "个人网站架构设计文档"
created: 2026-07-04 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 📅 编写日期：2026-07-04"
scope: "全阶段"
related: []
tags:
  - architecture
---

# 个人网站架构设计文档

> 📅 编写日期：2026-07-04
> 📝 状态：待审查
> 🎯 用途：审查通过后作为代码执行的依据

---

## 一、系统总览

### 1.1 设计原则

```
ECS = 轻量入口 + 公开内容展示（空间小 ~20GB）
本地 = 重存储 + 私密内容 + 备份（空间大 ~500GB+）
```

### 1.2 完整架构图

```
                         用户（手机/电脑）
                              │
                    ┌─────────┴─────────┐
                    │   ECS (入口服务器)   │
                    │   ECS              │
                    │   Ubuntu 22.04      │
                    │   2C / 1.6GB / ~20GB│
                    │                     │
                    │  ┌───────────────┐  │
                    │  │  Nginx :80    │  │
                    │  │ (路由调度中心)  │  │
                    │  └───────┬───────┘  │
                    │          │          │
                    │   ┌──────┼──────┐   │
                    │   │      │      │   │
                    │   ▼      ▼      ▼   │
                    │ 博客   公开照片  /admin│
                    │ 作品集  缩略图  登录页 │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ Docker 容器    │  │
                    │  │ Nuxt 3 :3000  │  │
                    │  │ + SQLite DB   │  │
                    │  └───────────────┘  │
                    │                     │
                    │  frp 客户端 ─────────┼──────→ 本地 frp 服务端
                    └─────────────────────┘            │
                                                       ▼
                                            ┌─────────────────────┐
                                            │   本地服务器          │
                                            │   ASUS TUF FX504GE   │
                                            │   Ubuntu 24.04       │
                                            │   8C / 16GB / ~500GB │
                                            │                     │
                                            │  ┌───────────────┐  │
                                            │  │  frp 服务端    │  │
                                            │  └───────┬───────┘  │
                                            │          │          │
                                            │   ┌──────┼──────┐   │
                                            │   │      │      │   │
                                            │   ▼      ▼      ▼   │
                                            │ 朋友照片 私人照片 API │
                                            │ (需登录) (仅自己)     │
                                            │                     │
                                            │  ┌───────────────┐  │
                                            │  │ 移动硬盘       │  │
                                            │  │ /mnt/backup/  │  │
                                            │  │ (永久存档)     │  │
                                            │  └───────────────┘  │
                                            └─────────────────────┘
```

### 1.3 各组件职责

| 组件 | 运行位置 | 端口 | 职责 |
|------|---------|------|------|
| Nginx | ECS | 80 | 反向代理、路由调度、静态文件服务 |
| Nuxt 3 | ECS Docker | 3000 | Web 应用（博客、作品集、管理后台） |
| SQLite | ECS Docker 内 | - | 数据库（所有内容元信息+权限） |
| frp 客户端 | ECS | - | 建立到本地的隧道 |
| frp 服务端 | 本地 | 7000 | 接收 ECS 隧道连接 |
| 照片服务 | 本地 | 3001 | 提供朋友/私人照片的 HTTP 服务 |
| Nginx（可选） | 本地 | - | 本地反向代理（可选） |

---

## 二、ECS 服务器文件结构

```
ECS: /opt/personal-website/
│
├── data/
│   └── prod.db                              # 数据库（所有内容元信息+权限）
│
├── public/uploads/                          # Nginx 直接提供静态文件
│   ├── photos/                              # ★ 公开照片（仅缩略图 ~100KB/张）
│   │   ├── 2026-07/
│   │   │   ├── sunset_abc123_thumb.jpg
│   │   │   └── city_def456_thumb.jpg
│   │   └── 2026-08/
│   │       └── mountain_ghi789_thumb.jpg
│   ├── portfolio/                           # 作品集图片（直接存，通常不大）
│   │   └── project-a/
│   │       ├── cover.jpg
│   │       └── screenshot.jpg
│   └── blog/                                # 博客内嵌图片（直接存）
│       └── my-post/
│           └── diagram.png
│
├── nginx/
│   └── conf.d/
│       └── personal-website.conf            # 路由配置
│
├── frp/
│   └── frpc.ini                             # frp 客户端配置
│
├── scripts/
│   ├── check-storage.sh                     # 存储检查脚本
│   └── alert-admin.sh                       # 告警通知脚本
│
├── Dockerfile
├── docker-compose.yml
└── .env
```

### ECS 存储空间预估

| 内容类型 | 存储方式 | 预估空间 |
|---------|---------|---------|
| 公开照片缩略图 | 缩略图 ~100KB/张，5000 张 | ~500MB |
| 作品集图片 | 原图，~50 个项目 | ~200MB |
| 博客内嵌图片 | 原图，~100 篇文章 | ~100MB |
| 数据库 | SQLite 文件 | ~10MB |
| Docker 镜像+应用 | Nuxt 构建产物 | ~3GB |
| **总计** | | **~4GB** |

ECS ~20GB 空间，使用约 20%，留有充足余量。

---

## 三、本地服务器文件结构

```
本地: /mnt/data/personal-website/
│
├── photos/                                  # ★ 所有照片的完整存储（原图）
│   ├── public/                              # 公开照片原图
│   │   ├── 2026-07/
│   │   │   ├── sunset.jpg                   # 原图 ~5MB
│   │   │   └── city.jpg
│   │   └── 2026-08/
│   │       └── mountain.jpg
│   ├── friends/                             # 朋友可见照片
│   │   ├── family/
│   │   │   ├── birthday.jpg
│   │   │   └── dinner.jpg
│   │   └── travel/
│   │       └── beach.jpg
│   └── private/                             # 个人私密照片
│       ├── self/
│       └── archive/
│
├── thumbnails/                              # 缩略图（rsync 到 ECS 用）
│   ├── 2026-07/
│   │   ├── sunset_abc123_thumb.jpg          # ~100KB
│   │   └── city_def456_thumb.jpg
│   └── 2026-08/
│       └── mountain_ghi789_thumb.jpg
│
├── cold-storage/                            # 冷存储目录（可挂载移动硬盘）
│   ├── 2024/                                # 按年归档
│   │   ├── 01/
│   │   │   ├── photo1_uuid.jpg
│   │   │   └── photo2_uuid.jpg
│   │   └── 02/
│   ├── 2025/
│   └── .manifest.json                       # 归档索引（记录哪些照片在冷存储中）
│
├── db/                                      # 数据库备份
│   ├── prod.db.2026-07-04
│   └── prod.db.2026-07-05
│
├── services/                                # 本地服务
│   ├── frps/                                # frp 服务端
│   │   └── frps.ini
│   ├── photo-server/                        # 照片服务（提供朋友+私人照片）
│   │   └── server.js                        # 轻量 HTTP 服务（Node.js）
│   └── nginx/                               # 本地 Nginx（可选）
│       └── conf.d/
│
├── scripts/                                 # 管理脚本
│   ├── sync-thumbnails.sh                   # 同步缩略图到 ECS
│   ├── sync-originals.sh                    # 按需同步原图到 ECS
│   ├── generate-thumbnails.sh               # 批量生成缩略图
│   ├── archive-photos.sh                    # 归档到冷存储
│   ├── restore-from-cold.sh                 # 从冷存储恢复
│   ├── check-storage.sh                     # 存储检查
│   └── backup-db.sh                         # 数据库备份
│
└── nuxt-app/                                # 开发环境
    ├── content/blog/                        # 博客 Markdown 文件
    ├── pages/                               # 页面组件
    ├── server/                              # API 路由
    ├── prisma/                              # 数据库模型
    └── ...
```

---

## 四、移动硬盘文件结构

```
移动硬盘: /mnt/backup/（插上时自动挂载）
│
├── photos/
│   ├── 2023/                                # 按年归档
│   │   ├── 01/                              # 按月
│   │   │   ├── photo1_uuid.jpg
│   │   │   └── photo2_uuid.jpg
│   │   └── 02/
│   ├── 2024/
│   └── 2025/
│
├── thumbnails/                              # 对应缩略图备份
│   ├── 2023/
│   └── 2024/
│
├── databases/                               # 数据库备份
│   ├── prod.db.2026-01-01
│   └── prod.db.2026-07-04
│
└── manifest.json                            # 完整索引
```

### manifest.json 格式

```json
{
  "version": "1.0",
  "lastUpdated": "2026-07-04T12:00:00Z",
  "photos": [
    {
      "id": 1,
      "filename": "sunset_abc123.jpg",
      "originalPath": "photos/2024/06/sunset_abc123.jpg",
      "thumbnailPath": "thumbnails/2024/06/sunset_abc123_thumb.jpg",
      "visibility": "public",
      "status": "archived",
      "archivedAt": "2025-12-01",
      "size": 5242880,
      "takenAt": "2024-06-15"
    }
  ]
}
```

---

## 五、数据库设计（Prisma Schema）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  name      String
  role      String   @default("admin")    // admin / friend / viewer
  groups    String?                        // JSON: ["family", "close-friends"]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 博客文章表
model Article {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @unique
  content     String
  description String?
  coverImage  String?
  status      String    @default("draft")   // draft / published
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  tags        Tag[]
}

// 标签表
model Tag {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  articles Article[]
}

// 作品集表
model Portfolio {
  id          Int      @id @default(autoincrement())
  title       String
  slug        String   @unique
  description String?
  content     String?                       // 详细介绍（Markdown）
  coverImage  String?
  images      String?                       // JSON: ["/uploads/portfolio/x/1.jpg", ...]
  link        String?                       // 外部链接（GitHub、Demo）
  tags        String?                       // JSON: ["Vue", "React"]
  category    String?                       // design / code / photography
  featured    Boolean  @default(false)
  order       Int      @default(0)
  status      String   @default("published")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 照片表
model Photo {
  id           Int      @id @default(autoincrement())
  filename     String   @unique             // 唯一文件名（UUID 格式）
  originalPath String                       // 原图路径（本地）
  thumbPath    String?                      // 缩略图路径（本地+ECS）
  ecsThumbPath String?                      // ECS 上的缩略图路径
  title        String?
  description  String?
  takenAt      DateTime?                    // 拍摄时间
  location     String?                      // 拍摄地点
  fileSize     Int?                         // 原图大小（字节）
  mimeType     String?

  // ★ 权限控制字段
  visibility   String   @default("private") // public / friends / private

  // ★ 细粒度权限（friends 级别）
  visibleTo    String?                      // JSON: ["user1", "user2"] 或 null

  // ★ 展示状态
  status       String   @default("active")  // active / hidden / archived

  // ★ 存储位置标记
  storageLocation String @default("local")  // local / ecs / cold

  // 相册关联
  albums       AlbumPhoto[]
  tags         PhotoTag[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// 相册表
model Album {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  coverUrl    String?
  visibility  String   @default("public")   // public / friends / private
  createdAt   DateTime @default(now())
  photos      AlbumPhoto[]
}

// 相册-照片关联表
model AlbumPhoto {
  id       Int   @id @default(autoincrement())
  photo    Photo @relation(fields: [photoId], references: [id], onDelete: Cascade)
  photoId  Int
  album    Album @relation(fields: [albumId], references: [id], onDelete: Cascade)
  albumId  Int
  order    Int   @default(0)
  @@unique([photoId, albumId])
}

// 照片标签表
model PhotoTag {
  id      Int   @id @default(autoincrement())
  photo   Photo @relation(fields: [photoId], references: [id], onDelete: Cascade)
  photoId Int
  name    String
  @@unique([photoId, name])
}
```

---

## 六、Nginx 路由设计

```nginx
# ECS Nginx 配置：/etc/nginx/sites-available/personal-website

server {
    listen 80 default_server;
    server_name _;

    # 1. 公开内容 → Docker 容器（Nuxt 3）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # 2. 公开照片缩略图 → ECS 本地静态文件
    location /uploads/photos/ {
        alias /opt/personal-website/public/uploads/photos/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 3. 作品集图片 → ECS 本地静态文件
    location /uploads/portfolio/ {
        alias /opt/personal-website/public/uploads/portfolio/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 4. 朋友可见照片 → frp 隧道到本地
    location /friends-photos/ {
        proxy_pass http://127.0.0.1:3001/friends/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 需要登录验证（由 Nuxt 中间件处理）
    }

    # 5. 查看原图 → frp 隧道到本地
    location /original/ {
        proxy_pass http://127.0.0.1:3001/original/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 需要登录验证
    }

    # 6. 私人照片 → frp 隧道到本地（仅 admin）
    location /private-photos/ {
        proxy_pass http://127.0.0.1:3001/private/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 需要 admin 权限验证
    }
}
```

### 请求路由流程

```
用户请求 → ECS Nginx :80
    │
    ├── /                    → Docker:3000 (Nuxt 首页)
    ├── /blog/*              → Docker:3000 (博客页面)
    ├── /portfolio/*         → Docker:3000 (作品集页面)
    ├── /gallery/*           → Docker:3000 (照片画廊页面)
    ├── /admin/*             → Docker:3000 (管理后台)
    ├── /api/*               → Docker:3000 (API 接口)
    │
    ├── /uploads/photos/*    → ECS 本地文件 (公开照片缩略图)
    ├── /uploads/portfolio/* → ECS 本地文件 (作品集图片)
    │
    ├── /friends-photos/*    → frp → 本地:3001 (朋友照片)
    ├── /original/*          → frp → 本地:3001 (原图)
    └── /private-photos/*    → frp → 本地:3001 (私人照片)
```

---

## 七、三档照片管理方案

### 7.1 三档对比

| 维度 | 公开照片 (Public) | 朋友可见 (Friends) | 个人私密 (Private) |
|------|------------------|-------------------|-------------------|
| **原图存储** | 本地 `photos/public/` | 本地 `photos/friends/` | 本地 `photos/private/` |
| **ECS 存储** | 缩略图 `uploads/photos/` | ❌ 不存 | ❌ 不存 |
| **用户访问** | ECS 直接提供缩略图 | frp 隧道 → 本地 | frp 隧道 → 本地 |
| **查看原图** | frp → 本地取原图 | frp → 本地取原图 | 仅本地查看 |
| **手机查看** | ✅ 公开地址直接看 | ✅ 登录后可看 | ✅ 仅自己登录后看 |
| **访问权限** | 所有人 | 登录用户（可分组） | 仅 admin |
| **上下架方式** | 改 DB status 字段 | 改 DB visibility 字段 | N/A |
| **ECS 空间占用** | ~100KB/张（缩略图） | 0 | 0 |
| **依赖本地在线** | 查看缩略图不依赖，看原图依赖 | ✅ 依赖 | ✅ 依赖 |

### 7.2 权限分组设计（Friends 级别）

```
用户分组：
  family      → 家人（可看家庭照片）
  close-friends → 密友（可看旅行照片等）
  friends     → 普通朋友（可看公开朋友照片）

照片可见范围：
  visibleTo: null           → 所有朋友可见
  visibleTo: ["family"]     → 仅家人可见
  visibleTo: ["family", "close-friends"] → 家人+密友可见
  visibleTo: ["user1", "user2"] → 指定用户可见
```

### 7.3 照片生命周期

```
新照片上传流程：
  手机/相机 → 本地电脑
    → 存入 photos/public/2026-07/（原图）
    → 生成缩略图 → thumbnails/2026-07/
    → rsync 缩略图到 ECS public/uploads/photos/
    → 数据库记录元信息 + visibility=public + status=active

查看缩略图流程：
  用户访问 /gallery → ECS Nginx → 直接返回缩略图（快）

查看原图流程：
  用户点击"查看原图" → ECS Nginx → frp 隧道 → 本地照片服务 → 返回原图

下架流程：
  Admin 在后台选择照片 → 批量操作 → 数据库 status=hidden
  → ECS 页面不展示（缩略图文件保留，0 成本，随时可重新上架）

归档流程（释放本地空间）：
  本地 photos/public/2025/ → cold-storage/2025/
  → 更新 manifest.json
  → 删除本地原图和缩略图
  → ECS 缩略图可保留或删除

重新上架流程（从冷存储恢复）：
  cold-storage/2025/ → 本地 photos/public/2025/
  → 生成缩略图 → rsync 到 ECS
  → 数据库 status=active
  → 网站上重新出现
```

---

## 八、本地与 ECS 同步方案

### 8.1 同步方式对比

| 方式 | 速度 | 版本控制 | 适合场景 |
|------|------|---------|---------|
| **rsync** | 快（增量同步） | ❌ | 日常照片/缩略图同步 |
| **SCP** | 中（全量传输） | ❌ | 单次文件传输 |
| **Git** | 慢（需构建） | ✅ | 代码更新、配置文件 |
| **frp 隧道** | 实时 | ❌ | 私人/朋友照片实时访问 |

### 8.2 同步策略

```
代码更新（Git）：
  本地 git push → GitHub → ECS git pull → 重建 Docker 镜像 → 重启
  用途：Nuxt 代码、页面模板、API 变更

内容同步（rsync）：
  # 同步博客 Markdown
  rsync -avz content/blog/ root@ECS:/opt/personal-website/content/blog/

  # 同步公开照片缩略图
  rsync -avz thumbnails/ root@ECS:/opt/personal-website/public/uploads/photos/

  # 同步作品集图片
  rsync -avz portfolio-images/ root@ECS:/opt/personal-website/public/uploads/portfolio/

实时访问（frp）：
  朋友照片 / 私人照片 → 通过 frp 隧道实时从本地提供
  不需要同步，不需要 ECS 存储空间
```

### 8.3 快速上下架操作

```
场景1：某个月照片不对外展示
  后台管理 → 照片管理 → 筛选"2026年7月" → 全选 → 批量操作 → "设为隐藏"
  → UPDATE photos SET status='hidden' WHERE taken_at LIKE '2026-07%'
  → 文件不动，0.1 秒完成

场景2：照片从公开移到朋友可见
  后台管理 → 选中照片 → 批量操作 → "设为朋友可见"
  → UPDATE photos SET visibility='friends' WHERE id IN (...)
  → 文件不动，0.1 秒完成

场景3：某些照片不传到 ECS
  本地管理 → 选中照片 → 标记"仅本地"
  → storageLocation = 'local'
  → 同步脚本跳过这些文件

场景4：不同朋友看不同照片
  后台管理 → 用户管理 → 设置用户分组
  → 用户 A: groups = ["family", "close-friends"]
  → 用户 B: groups = ["friends"]
  → 照片 visibleTo = ["family"] → A 能看，B 不能看

场景5：归档旧照片到移动硬盘
  scripts/archive-photos.sh --year 2024
  → 移动原图到 cold-storage/2024/
  → 更新 manifest.json
  → 可选：删除 ECS 上的缩略图
  → 数据库 status='archived', storageLocation='cold'

场景6：从冷存储恢复上架
  scripts/restore-from-cold.sh --year 2024 --month 06
  → 从 cold-storage/2024/06/ 复制回 photos/public/2024/06/
  → 生成缩略图 → rsync 到 ECS
  → 数据库 status='active', storageLocation='local'
```

---

## 九、存储空间管理

### 9.1 三层存储层级

```
┌─────────────────────────────────────────────────────────┐
│                   存储管理层级                            │
│                                                          │
│  Level 1: ECS 在线存储（~20GB）                          │
│  ├── 公开照片缩略图（100KB/张，最多 5000 张 = 500MB）     │
│  ├── 作品集图片（估计 200MB）                             │
│  ├── 博客图片（估计 100MB）                               │
│  ├── 数据库 + 应用（估计 3GB）                            │
│  └── 阈值告警：使用 >70%（14GB）时通知 Admin              │
│                                                          │
│  Level 2: 本地在线存储（~500GB）                          │
│  ├── 所有照片原图                                        │
│  ├── 缩略图副本                                          │
│  ├── 开发环境                                            │
│  └── 阈值告警：使用 >80%（400GB）时通知 Admin             │
│                                                          │
│  Level 3: 本地冷存储 / 移动硬盘（无上限）                  │
│  ├── 按月份归档的历史照片                                 │
│  ├── 不再上架但保留的照片                                 │
│  └── manifest.json 记录索引                              │
│                                                          │
│  流转方向：                                               │
│  新照片 → Level 2（本地在线）→ Level 1（ECS 缩略图同步）   │
│  下架照片 → Level 1 移除 → Level 2 保留                   │
│  归档照片 → Level 2 → Level 3（移动硬盘）                 │
│  重新上架 → Level 3 → Level 2 → Level 1                  │
└─────────────────────────────────────────────────────────┘
```

### 9.2 告警阈值

```
ECS 告警（~20GB 总空间）：
  ⚠️  警告：使用 >70%（14GB）→ 微信通知 Admin
  🔴 严重：使用 >85%（17GB）→ 自动暂停缩略图同步
  📋 建议：列出可移除的缩略图（最旧的、已下架的）

本地告警（~500GB 总空间）：
  ⚠️  警告：使用 >80%（400GB）→ 微信通知 Admin
  🔴 严重：使用 >90%（450GB）→ 建议归档到冷存储
  📋 建议：列出可归档的照片（最旧的、已下架的）

告警方式：
  ECS 告警 → 微信消息（通过 Hermes cronjob）
  本地告警 → 桌面通知 + 微信消息
```

---

## 十、内容管理方案

### 10.1 博客文章

**存储方式**：Markdown 文件（`content/blog/`）+ 数据库元信息

**添加方式**：

| 方式 | 流程 | 适合场景 |
|------|------|---------|
| 后台编辑器 | 浏览器访问 /admin → 写文章 → 保存 | 手机/任意电脑写文章 |
| Git 推送 | 本地写 .md → git push → ECS git pull → 重建 | 本地批量写作 |
| rsync 同步 | 本地写 .md → rsync 到 ECS → 重启容器 | 快速同步 |

**Markdown 文件格式**：
```markdown
---
title: 我的新文章
date: 2026-07-10
tags: [vue, nuxt, 前端]
description: 这是一篇关于 Vue 3 的文章
cover: /uploads/blog/my-post/cover.jpg
status: published
---

正文内容...
```

### 10.2 作品集

**存储方式**：数据库（Prisma）+ 图片文件

**添加方式**：
```
后台管理 → 作品管理 → 新建作品
  → 填写标题、描述、链接
  → 上传封面图和截图（拖拽上传）
  → 选择分类（design / code / photography）
  → 选择标签
  → 保存
```

### 10.3 博客 vs 作品集区别

| 维度 | 博客 | 作品集 |
|------|------|--------|
| 内容格式 | 长文（Markdown） | 图片为主 + 简短描述 |
| 排序方式 | 按日期倒序 | 按分类/置顶/手动 |
| 存储方式 | Markdown 文件 | 数据库 + 图片文件 |
| 添加方式 | 写文章（文字为主） | 上传图片 + 填信息 |
| URL 结构 | `/blog/my-post` | `/portfolio/my-app` |
| 典型内容 | 技术笔记、生活感悟 | 设计作品、代码项目 |
| 交互方式 | 阅读、评论 | 浏览、点击查看大图 |

---

## 十一、frp 内网穿透配置

### 11.1 架构

```
服务器 A frpc ──────→ ECS frps
  (内网 Ubuntu)          (公网入口)
       │                       │
       └─ 服务器 A:22 → ECS:6022
                               │
本机 ssh yyh-ubuntu-a ─────────┘
       │
       └─ 通过 ECS:22 的 ProxyCommand 转发到 ECS:127.0.0.1:6022
```

服务器 A 主动连接 ECS 建立 frp 隧道。ECS 的 `6022` 仅作为 frps 内部代理端口，当前不开放公网；本机先通过 SSH 密钥连接 ECS，再由 ECS 的 SSH 转发访问该端口。

### 11.2 服务器 A 的 frpc 配置

```toml
# /etc/frp/frpc.toml
serverAddr = "<ECS_HOST>"
serverPort = 7000
auth.method = "token"
auth.token = "<FRP_TOKEN>"

[[proxies]]
name = "server-a-ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 6022
transport.tls.enable = true
```

### 11.3 本机 SSH 配置

```sshconfig
Host yyh-ubuntu-a
  HostName 127.0.0.1
  Port 6022
  User aloof
  IdentityFile ~/.ssh/yyh-ubuntu-a
  IdentitiesOnly yes
  ProxyCommand ssh yyh-ecs -W %h:%p
```

连接：

```bash
ssh yyh-ubuntu-a
```

备用的手动等价方式：

```bash
ssh -N -L 22022:127.0.0.1:6022 yyh-ecs
ssh -i ~/.ssh/yyh-ubuntu-a aloof@127.0.0.1 -p 22022
```

---

## 十二、备份策略

### 12.1 数据库备份

```
备份频率：每天自动备份
备份位置：
  本地 db/prod.db.YYYY-MM-DD
  移动硬盘 databases/prod.db.YYYY-MM-DD
保留策略：
  本地保留最近 30 天
  移动硬盘永久保留
```

### 12.2 照片备份

```
原图备份：
  本地 photos/ → 移动硬盘 photos/（手动或脚本）
  增量同步，只复制新文件

缩略图备份：
  本地 thumbnails/ → 移动硬盘 thumbnails/
  与原图同步进行

manifest.json：
  每次归档/恢复时自动更新
  记录所有照片的位置和状态
```

### 12.3 备份脚本

```bash
#!/bin/bash
# backup-all.sh - 完整备份脚本

# 1. 备份数据库
sqlite3 /opt/personal-website/data/prod.db ".backup /mnt/data/personal-website/db/prod.db.$(date +%Y-%m-%d)"

# 2. 同步到移动硬盘（如果已挂载）
if mountpoint -q /mnt/backup; then
  rsync -avz /mnt/data/personal-website/db/ /mnt/backup/databases/
  rsync -avz /mnt/data/personal-website/photos/ /mnt/backup/photos/
  rsync -avz /mnt/data/personal-website/thumbnails/ /mnt/backup/thumbnails/
fi
```

---

## 十三、审查清单

在开始编码前，请确认以下设计决策：

- [ ] ECS 只存公开照片缩略图（不存原图）
- [ ] 朋友/私人照片通过 frp 隧道从本地实时提供
- [ ] 本地照片按 public/friends/private 三档组织
- [ ] 冷存储（移动硬盘）按年月归档，manifest.json 记录索引
- [ ] 存储告警：ECS >70%、本地 >80% 时通知 Admin
- [ ] 博客用 Markdown 文件，作品集用数据库
- [ ] 后台管理页面支持批量上下架操作
- [ ] 三档照片可以互相转换（改 DB 字段，不搬文件）
- [ ] 备份策略：每天数据库备份，定期同步到移动硬盘
- [ ] frp 隧道用于实时访问本地照片服务

**审查通过后，将按照本文档逐步实现。**
