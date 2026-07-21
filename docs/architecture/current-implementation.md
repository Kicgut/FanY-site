---
title: "现有项目技术分析"
created: 2026-07-05 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 📅 分析日期：2026-07-04"
scope: "全阶段"
related: []
tags:
  - architecture
---

# 现有项目技术分析

> 📅 分析日期：2026-07-04
> 🎯 用途：与 architecture-design.md 对比，了解已实现 vs 待实现

---

## 一、技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Nuxt** | ^3.17.0 | 全栈框架（SSR） |
| **Vue** | ^3.5.0 | 前端框架 |
| **Vue Router** | ^4.5.0 | 路由 |
| **TypeScript** | ^5.8.0 | 类型安全 |
| **Element Plus** | ^2.14.2 | UI 组件库 |
| **@element-plus/nuxt** | ^1.1.5 | Element Plus Nuxt 集成 |
| **@nuxt/content** | ^3.15.0 | Markdown 内容管理 |
| **Prisma** | ^6.19.3 | ORM |
| **SQLite** | - | 数据库 |
| **bcryptjs** | ^3.0.3 | 密码哈希 |
| **jsonwebtoken** | ^9.0.3 | JWT 认证 |
| **Node.js** | 22 Alpine | 运行时 |
| **pnpm** | 11.9.0 | 包管理器 |
| **Docker** | - | 容器化部署 |
| **Nginx** | - | 反向代理 |

---

## 二、项目文件结构与作用

```
nuxt-app/
├── app.vue                    # 根组件：NuxtLayout + NuxtPage + 页面过渡动画
├── nuxt.config.ts             # Nuxt 配置：SSR、Element Plus、Content 模块、路由缓存
├── tsconfig.json              # TypeScript 配置
├── content.config.ts          # Nuxt Content 集合定义（blog 集合）
├── package.json               # 依赖清单
├── pnpm-lock.yaml             # 依赖锁定文件
├── pnpm-workspace.yaml        # 允许原生模块构建
├── Makefile                   # Docker 操作快捷命令
├── docker-compose.yml         # 生产环境 Docker Compose
├── Dockerfile                 # 生产 Dockerfile（单阶段构建）
├── .dockerignore              # Docker 忽略文件
├── .env                       # 环境变量（JWT_SECRET、DATABASE_URL）
│
├── assets/css/
│   └── variables.css          # 全局 CSS 变量 + 页面过渡动画样式
│
├── layouts/
│   ├── default.vue            # 默认布局：顶部导航栏（首页/博客/作品集/关于/归档）+ 页脚
│   └── admin.vue              # 管理后台布局：可折叠侧边栏 + 顶部栏（用户信息/登出）
│
├── middleware/
│   └── auth.global.ts         # 全局路由守卫：/admin 路径需 token
│
├── pages/                     # ⬇️ 详见"页面功能"章节
│
├── server/
│   ├── middleware/auth.ts     # 服务端中间件：/api/admin/* 路径 JWT 验证
│   ├── utils/
│   │   ├── db.ts              # Prisma 客户端单例
│   │   └── jwt.ts             # JWT 密钥工具函数
│   └── api/                   # ⬇️ 详见"API 端点"章节
│
├── data/blog-md/              # 运行时文章 Markdown（挂载卷，Git 忽略）
├── data/content-pipeline/     # 运行时内容流水线数据（挂载卷，Git 忽略）
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   └── migrations/            # 数据库迁移文件
│
├── config/                    # 配置文件模板
│   ├── nginx/                 # Nginx 配置
│   ├── frp/                   # frp 服务端/客户端配置
│   └── immich/                # Immich Docker Compose
│
└── scripts/                   # 运维脚本（12 个）
    ├── deploy.sh              # 部署脚本
    ├── quick-deploy.sh        # 快速部署
    ├── backup.sh              # 数据库备份
    ├── backup-all.sh          # 全量备份
    ├── restore.sh             # 数据库恢复
    ├── rollback.sh            # 回滚
    ├── monitor.sh             # 监控
    ├── ecs-init.sh            # ECS 初始化
    ├── setup-nginx.sh         # Nginx 安装
    ├── setup-ssl.sh           # SSL 证书
    ├── setup-frps.sh          # frp 服务端
    └── setup-immich.sh        # Immich 安装
```

---

## 三、数据库模型

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  User    │     │   Article    │────→│   Tag    │
│──────────│     │──────────────│     │──────────│
│ id       │     │ id           │     │ id       │
│ username │     │ title        │     │ name     │
│ password │     │ slug         │     └──────────┘
│ name     │     │ content      │
│ role     │     │ description  │
│          │     │ coverImage   │
│          │     │ status       │
│          │     │ publishedAt  │
└──────────┘     └──────────────┘

┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Photo   │────→│  AlbumPhoto  │←────│  Album   │
│──────────│     │──────────────│     │──────────│
│ id       │     │ id           │     │ id       │
│ title    │     │ photoId (FK) │     │ name     │
│ filename │     │ albumId (FK) │     │ description│
│ originalUrl│   │ order        │     │ coverUrl │
│ thumbnailUrl│  └──────────────┘     └──────────┘
│ mediumUrl │
│ width     │     ┌──────────────┐
│ height    │────→│  PhotoTag    │
│ fileSize  │     │──────────────│
│ mimeType  │     │ id           │
│ location  │     │ photoId (FK) │
│ takenAt   │     │ name         │
│ status    │     └──────────────┘
└──────────┘
```

**关系说明**：
- Article ↔ Tag：多对多（Prisma 隐式关系表）
- Photo ↔ Album：多对多（显式中间表 AlbumPhoto，含 order 排序）
- Photo → PhotoTag：一对多（存储标签名，非外键关联 Tag 表）

**与新架构设计的差异**：
- 现有 Photo 表没有 `visibility`（public/friends/private）字段
- 现有 Photo 表没有 `visibleTo`（细粒度权限）字段
- 现有 Photo 表没有 `storageLocation`（local/ecs/cold）字段
- 现有 User 表没有 `groups`（用户分组）字段
- 现有 Album 表没有 `visibility` 字段

---

## 四、API 端点清单

### 认证 API

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| POST | /api/auth/login | ❌ | 登录，返回 JWT token（24h） |
| GET | /api/auth/me | ✅ | 获取当前用户信息 |

### 文件上传

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| POST | /api/upload | ✅ | 图片上传（jpg/png/gif/webp，≤10MB） |

### 文章 API

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| GET | /api/articles | ❌ | 文章列表（分页、状态/标签/关键词 `q` 筛选） |
| POST | /api/articles | ✅ | 创建文章（自动生成 slug） |
| GET | /api/articles/:id | ❌ | 文章详情 |
| PUT | /api/articles/:id | ✅ | 更新文章 |
| DELETE | /api/articles/:id | ✅ | 删除文章 |

### 标签 API

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| GET | /api/tags | ❌ | 所有标签（含文章计数） |

### 照片 API

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| GET | /api/photos | ❌ | 照片列表（分页、状态/标签/相册/标题筛选） |
| POST | /api/photos | ✅ | 创建照片记录 |
| GET | /api/photos/:id | ❌ | 照片详情 |
| PUT | /api/photos/:id | ✅ | 更新照片 |
| DELETE | /api/photos/:id | ✅ | 删除照片 |

### 相册 API

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| GET | /api/albums | ❌ | 所有相册（含照片计数和封面） |
| POST | /api/albums | ✅ | 创建相册 |
| PUT | /api/albums/:id | ✅ | 更新相册 |
| DELETE | /api/albums/:id | ✅ | 删除相册 |

**总计：18 个 API 端点**

---

## 五、页面清单

### 前台页面（7 个）

| 路径 | 文件 | 功能 |
|------|------|------|
| `/` | index.vue | 首页：Hero 区域 + 技能标签 + 个人简介 + 精选内容卡片 |
| `/about` | about.vue | 关于页面（占位页） |
| `/blog` | blog/index.vue | 博客列表：标签筛选 + 分页（每页4篇） |
| `/blog/*` | blog/[...slug].vue | 博客详情：Markdown 渲染 + 阅读时间 + SEO |
| `/blog/archive` | blog/archive.vue | 归档页面：按年月分组 |
| `/portfolio` | portfolio/index.vue | 摄影画廊：CSS 瀑布流 + Lightbox + 筛选 |
| `/portfolio/:id` | portfolio/[id].vue | 照片详情：大图 + 元信息面板 |

### 后台页面（5 个）

| 路径 | 文件 | 功能 |
|------|------|------|
| `/admin/login` | admin/login.vue | 管理员登录 |
| `/admin` | admin/index.vue | Dashboard：用户信息 |
| `/admin/articles` | admin/articles/index.vue | 文章管理列表 |
| `/admin/articles/new` | admin/articles/new.vue | 新建文章 |
| `/admin/articles/:id` | admin/articles/[id].vue | 编辑文章 |
| `/admin/photos` | admin/photos/index.vue | 照片管理：上传 + 批量操作 |
| `/admin/albums` | admin/albums/index.vue | 相册管理：创建/编辑/删除 |

**总计：12 个页面**

---

## 六、已实现功能清单

### ✅ 前台功能
- 首页展示（个人介绍、技能标签、精选内容）
- 博客系统（Markdown 渲染、标签筛选、分页、阅读时间）
- 博客归档（按年月分组）
- SEO 优化（每页独立 useHead + useSeoMeta、OG 标签、Twitter Card）
- 摄影画廊（CSS 瀑布流、标签筛选、标题搜索）
- 照片灯箱（全屏查看、键盘导航、ESC 关闭）
- 照片详情页（大图 + 元信息面板）
- 响应式设计（移动端适配）
- 页面过渡动画

### ✅ 后台功能
- 管理员登录（JWT 24h + bcrypt）
- 全局路由守卫（客户端 + 服务端双重认证）
- 文章 CRUD（Markdown 内容、标签管理、状态管理）
- 图片上传（≤10MB、UUID 文件名、插入文章内容）
- 照片管理（上传、缩略图网格、批量发布/归档/删除）
- 相册管理（创建/编辑/删除、封面图、照片计数）

### ✅ 基础设施
- Docker 容器化（单容器、资源限制、健康检查）
- Nginx 反向代理（gzip、缓存、安全头）
- 数据持久化（SQLite + Docker volume）
- 自动化脚本（部署、备份、恢复、回滚、监控）
- frp 内网穿透配置
- Immich 集成配置
- Nuxt Content Markdown 博客
- 路由缓存（首页预渲染、SWR 1h）

---

## 七、与新架构设计的对比

| 维度 | 现有实现 | 新架构设计 | 差距 |
|------|---------|-----------|------|
| **照片权限** | 只有 status（published/archived） | 三档：public/friends/private + visibleTo | 🔴 需新增 |
| **照片存储** | 所有照片存 ECS public/uploads/ | 缩略图存 ECS，原图存本地 | 🔴 需重构 |
| **用户分组** | 无 | groups 字段（family/close-friends/friends） | 🔴 需新增 |
| **frp 实际部署** | 只有配置文件模板 | 实际运行照片服务通过 frp 隧道 | 🔴 需部署 |
| **本地照片服务** | 无 | Node.js 服务提供朋友/私人照片 | 🔴 需开发 |
| **缩略图生成** | 无自动化 | 自动生成 + rsync 到 ECS | 🔴 需开发 |
| **存储告警** | 无 | ECS >70%、本地 >80% 告警 | 🔴 需开发 |
| **冷存储/归档** | 无 | 按年月归档 + manifest.json | 🔴 需开发 |
| **批量上下架** | 有（status 批量修改） | 有（visibility + status 批量修改） | 🟡 需扩展 |
| **博客系统** | ✅ 完整 | 同 | ✅ 无需改动 |
| **作品集** | 用照片画廊代替 | 独立 Portfolio 模型 | 🟡 需分离 |
| **后台管理** | ✅ 基本完整 | 需增加用户管理、照片权限管理 | 🟡 需扩展 |
| **Docker 部署** | ✅ 已运行 | 同 | ✅ 无需改动 |
| **Nginx** | ✅ 已运行 | 需增加 frp 路由规则 | 🟡 需扩展 |
| **备份策略** | 有脚本模板 | 三层备份（ECS/本地/移动硬盘） | 🟡 需完善 |

---

## 八、总结

**已实现**：
- 完整的博客系统（Markdown + SEO）
- 基本的照片画廊（瀑布流 + Lightbox）
- 后台管理（文章/照片/相册 CRUD）
- Docker 容器化部署 + Nginx 反向代理
- 基础运维脚本

**待实现（新架构设计中的增量）**：
1. 三档照片权限系统（public/friends/private）
2. 用户分组与细粒度权限控制
3. 照片存储分层（ECS 缩略图 + 本地原图）
4. frp 内网穿透实际部署（本地照片服务）
5. 缩略图自动生成与同步脚本
6. 存储空间告警系统
7. 冷存储/归档机制
8. 作品集独立模型（与照片画廊分离）
