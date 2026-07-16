---
title: "个人网站 + 照片服务 —— 完整架构与计划"
created: 2026-07-04 00:00
updated: 2026-07-15 23:29
status: final
purpose: "```"
scope: "全阶段"
related: []
tags:
  - architecture
---

# 个人网站 + 照片服务 —— 完整架构与计划

## 一、项目全景

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                             │
└──────────────────────────────┬───────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  ECS（2核2G，30GB）  │
                    │  公网入口            │
                    │                      │
                    │  Nginx（80/443）     │
                    │  ├── / → 个人主站    │
                    │  ├── /blog → 博客    │
                    │  ├── /portfolio → 作品│
                    │  ├── /photo → 照片   │
                    │  │   ├── 缩略图/WebP │ ← 直接返回（极快）
                    │  │   ├── 中图（热）  │ ← 缓存直接返回
                    │  │   └── 中图（冷）  │ ← frp → 本地
                    │  └── /admin → 管理   │
                    │                      │
                    │  存储分配：           │
                    │  ├── 系统+工具: ~6GB │
                    │  ├── 应用层:    ~5GB │
                    │  ├── 照片缓存: ~15GB │
                    │  └── 预留:     ~4GB  │
                    └──────────┬──────────┘
                               │ frp 隧道（仅转发冷数据+私密相册）
                    ┌──────────▼──────────┐
                    │  本地服务器           │
                    │  存储：无限制         │
                    │                      │
                    │  ├── 全量照片存储     │
                    │  ├── Immich 私密相册  │
                    │  ├── rsync 备份       │
                    │  └── 原始文件归档     │
                    └─────────────────────┘
```

---

## 二、技术栈全景

### 前端

| 技术 | 版本 | 用途 | 学习难度 |
|------|------|------|---------|
| **Nuxt 3** | 最新 | 全栈框架（前后端一体） | ⭐⭐ |
| **Vue 3** | 最新 | 前端 UI 框架 | ⭐⭐ |
| **Element Plus** | 最新 | UI 组件库（表格、表单、按钮） | ⭐ |
| **Nuxt Content** | 最新 | 博客系统（Markdown 驱动） | ⭐ |
| **Tailwind CSS** | 最新 | 样式框架（快速写 CSS） | ⭐⭐ |
| **sharp** | 最新 | 图片处理（压缩、WebP、缩略图） | ⭐ |

### 后端

| 技术 | 版本 | 用途 | 学习难度 |
|------|------|------|---------|
| **Nuxt Server Routes** | 内置 | API 接口（增删改查） | ⭐⭐ |
| **Prisma** | 最新 | ORM（数据库操作工具） | ⭐⭐ |
| **SQLite** | 内置 | 轻量数据库 | ⭐ |
| **JWT (jsonwebtoken)** | - | 登录认证 | ⭐⭐ |
| **sharp** | - | 图片处理 | ⭐ |

### 照片服务

| 技术 | 版本 | 用途 | 学习难度 |
|------|------|------|---------|
| **Immich** | 最新 | 私密相册（人脸识别、地图） | ⭐ |
| **Nuxt 自建模块** | - | 公开摄影作品画廊 | ⭐⭐ |

### 部署与运维

| 技术 | 版本 | 用途 | 学习难度 |
|------|------|------|---------|
| **Docker** | 最新 | 容器化打包 | ⭐⭐ |
| **Docker Compose** | 最新 | 多容器编排 | ⭐⭐ |
| **Nginx** | 最新 | 反向代理 + 静态资源 | ⭐⭐ |
| **frp** | 最新 | 内网穿透（ECS ↔ 本地） | ⭐⭐ |
| **rsync** | 系统自带 | 数据同步备份 | ⭐ |
| **crontab** | 系统自带 | 定时任务 | ⭐ |

### 学习文档

| 技术 | 用途 |
|------|------|
| **Markdown** | 写学习笔记 |
| **项目 docs/ 目录** | 统一管理所有文档 |

---

## 三、ECS 30GB 存储分配

```
30GB 总计
│
├── 系统层                              6.0 GB
│   ├── Ubuntu OS + 系统软件             3.0 GB
│   ├── Docker Engine + 镜像            1.5 GB
│   └── Swap 分区（防 OOM）             1.5 GB
│
├── 应用层                              5.0 GB
│   ├── Nuxt 主站代码 + node_modules    1.5 GB
│   ├── Nginx 配置 + 日志               0.5 GB
│   ├── frp 客户端                      0.1 GB
│   ├── SQLite 数据库                   0.5 GB
│   ├── 学习笔记 + 文档                 0.1 GB
│   └── 日志 + 临时文件                 2.3 GB
│
├── 照片热数据层                        15.0 GB
│   ├── 公开作品缩略图 WebP（400px）     3.0 GB  ← ~5000张
│   ├── 公开作品中图 WebP（1200px）      6.0 GB  ← ~500张近期
│   ├── 博客配图 + 首页素材              2.0 GB
│   ├── 照片元数据缓存                  1.0 GB
│   └── 临时上传 + 处理中转              3.0 GB
│
└── 预留缓冲                            4.0 GB
    └── Docker 膨胀 + 紧急空间
```

---

## 四、项目目录结构

```
/mnt/data/personal-website/
│
├── docs/                                    # 📚 全部文档
│   ├── learning-notes/                      # 学习笔记
│   │   ├── 01-vue-vs-react.md               # ✅ Vue vs React
│   │   ├── 02-nuxt3-basics.md               # Nuxt 3 基础入门
│   │   ├── 03-vue3-core.md                  # Vue 3 核心概念
│   │   ├── 04-sqlite-and-prisma.md          # 数据库入门
│   │   ├── 05-api-routes.md                 # 后端 API 入门
│   │   ├── 06-docker-basics.md              # Docker 入门
│   │   ├── 07-nginx-deploy.md               # Nginx 部署
│   │   ├── 08-frp-tunnel.md                 # frp 内网穿透
│   │   └── 09-immich-setup.md               # Immich 照片服务
│   ├── plan.md                              # 总体计划
│   ├── architecture.md                      # 系统架构
│   ├── storage-bandwidth-plan.md            # 存储与带宽方案
│   └── deployment.md                        # 部署手册
│
├── nuxt-app/                                # 🚀 主站项目
│   ├── pages/                               # 页面路由
│   │   ├── index.vue                        # 首页（自我介绍）
│   │   ├── about.vue                        # 关于我
│   │   ├── blog/
│   │   │   ├── index.vue                    # 博客列表
│   │   │   └── [...slug].vue               # 文章详情
│   │   ├── portfolio/
│   │   │   ├── index.vue                    # 作品集（公开）
│   │   │   └── [id].vue                     # 作品详情
│   │   └── admin/
│   │       ├── index.vue                    # 管理首页（仪表盘）
│   │       ├── login.vue                    # 登录
│   │       ├── posts.vue                    # 文章管理
│   │       ├── photos.vue                   # 照片管理（上下架）
│   │       └── backup.vue                   # 备份状态
│   │
│   ├── components/                          # 可复用组件
│   │   ├── layout/
│   │   │   ├── Header.vue                   # 导航栏
│   │   │   ├── Footer.vue                   # 页脚
│   │   │   └── Sidebar.vue                  # 侧边栏
│   │   ├── photo/
│   │   │   ├── PhotoGrid.vue               # 照片网格/瀑布流
│   │   │   ├── PhotoCard.vue               # 照片卡片
│   │   │   ├── PhotoDetail.vue             # 照片详情弹窗
│   │   │   └── PhotoFilter.vue             # 筛选器（地点/时间/类型）
│   │   └── common/
│   │       ├── DarkMode.vue                # 暗黑模式切换
│   │       └── Loading.vue                 # 加载动画
│   │
│   ├── content/                             # 📝 博客文章
│   │   └── blog/
│   │       ├── hello-world.md
│   │       └── building-my-website.md
│   │
│   ├── server/                              # 🔧 后端 API
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login.post.ts           # 登录
│   │   │   │   └── me.get.ts               # 获取当前用户
│   │   │   ├── posts/
│   │   │   │   ├── index.get.ts            # 文章列表
│   │   │   │   ├── index.post.ts           # 创建文章
│   │   │   │   ├── [id].put.ts             # 更新文章
│   │   │   │   └── [id].delete.ts          # 删除文章
│   │   │   └── photos/
│   │   │       ├── index.get.ts            # 照片列表
│   │   │       ├── index.post.ts           # 上传照片
│   │   │       ├── [id].put.ts             # 更新照片信息
│   │   │       ├── [id].delete.ts          # 删除照片
│   │   │       └── [id]/toggle.patch.ts    # 上下架
│   │   ├── middleware/
│   │   │   ├── auth.ts                     # 认证中间件
│   │   │   └── photo-cache.ts              # 照片缓存中间件
│   │   └── utils/
│   │       ├── db.ts                       # Prisma 客户端
│   │       ├── jwt.ts                      # JWT 工具
│   │       └── image.ts                    # sharp 图片处理
│   │
│   ├── prisma/                              # 数据库
│   │   └── schema.prisma                    # 表结构定义
│   │
│   ├── public/                              # 静态资源
│   │   └── images/
│   │       └── avatar.jpg
│   │
│   ├── assets/                              # 样式资源
│   │   └── css/
│   │       └── main.css
│   │
│   ├── nuxt.config.ts                       # Nuxt 配置
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile                           # Docker 构建文件
│   └── docker-compose.yml                   # Docker 编排
│
├── frp/                                     # 🌐 内网穿透配置
│   ├── frps.toml                            # ECS 端（服务端）
│   └── frpc.toml                            # 本地端（客户端）
│
├── scripts/                                 # 🔧 运维脚本
│   ├── sync-photos.sh                       # 照片同步
│   ├── backup-db.sh                         # 数据库备份
│   ├── cleanup-hot-cache.sh                 # 清理过期缓存
│   └── deploy.sh                            # 一键部署
│
└── docker/                                  # 🐳 Docker 部署文件
    ├── docker-compose.ecs.yml               # ECS 部署
    └── docker-compose.local.yml             # 本地部署（Immich）
```

---

## 五、数据库设计

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// 用户表（管理员）
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // bcrypt 加密
  createdAt DateTime @default(now())
}

// 博客文章
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  slug      String   @unique  // URL 友好的标识
  content   String   // Markdown 内容
  excerpt   String?  // 摘要
  cover     String?  // 封面图
  status    String   @default("draft")  // draft/published/hidden
  tags      String?  // JSON 数组: ["技术","Vue"]
  views     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 摄影作品（公开画廊）
model Photo {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  fileName    String   // 原始文件名
  thumbPath   String   // 缩略图路径
  mediumPath  String   // 中图路径
  originPath  String   // 原图路径
  width       Int
  height      Int
  size        Int      // 文件大小 bytes
  location    String?  // 拍摄地点
  latitude    Float?   // 纬度
  longitude   Float?   // 经度
  takenAt     DateTime? // 拍摄时间
  camera      String?  // 相机型号
  lens        String?  // 镜头
  tags        String?  // JSON: ["风光","日落","西藏"]
  category    String?  // 分类: landscape/portrait/street...
  status      String   @default("published")  // published/hidden
  sortOrder   Int      @default(0)  // 排序权重
  views       Int      @default(0)
  isOnEcs     Boolean  @default(false)  // 是否缓存在 ECS
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 照片相册（分组）
model Album {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  coverPhoto  String?  // 封面图路径
  isPublic    Boolean  @default(true)  // 是否公开
  password    String?  // 私密相册密码
  sortOrder   Int      @default(0)
  status      String   @default("published")
  createdAt   DateTime @default(now())
  photos      Photo[]  // 关联照片
}

// 给 Photo 表加 album 关联
// Photo 中加入: albumId Int?  album Album? @relation(fields: [albumId])
```

---

## 六、实施计划（分 7 个阶段）

### 阶段 1：环境搭建 + 首页（Day 1-2）

**目标：** 跑起来一个能访问的页面

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 1.1 | 安装 Node.js + pnpm | 02-nuxt3-basics.md |
| 1.2 | 创建 Nuxt 3 项目 | 项目脚手架 |
| 1.3 | 集成 Element Plus + Tailwind CSS | UI 框架就绪 |
| 1.4 | 搭建首页（自我介绍） | index.vue |
| 1.5 | 响应式布局 + 暗黑模式 | 基础体验 |

**学习重点：** Nuxt 3 项目结构、Vue 3 Composition API、组件化思维

---

### 阶段 2：博客系统（Day 3-4）

**目标：** 能用 Markdown 写博客并展示

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 2.1 | 集成 Nuxt Content | 02-nuxt3-basics.md 补充 |
| 2.2 | 博客列表页（分页、筛选） | blog/index.vue |
| 2.3 | 文章详情页（Markdown 渲染） | blog/[...slug].vue |
| 2.4 | 标签系统 | 标签筛选功能 |
| 2.5 | 写 2-3 篇测试文章 | 内容就绪 |

**学习重点：** Nuxt Content 用法、Markdown 语法、动态路由

---

### 阶段 3：后台管理 + 数据库（Day 5-7）

**目标：** 登录后台，管理文章和照片

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 3.1 | 安装 Prisma + 配置 SQLite | 04-sqlite-and-prisma.md |
| 3.2 | 设计并创建数据库表 | schema.prisma |
| 3.3 | 实现 JWT 登录 API | 05-api-routes.md |
| 3.4 | 实现文章 CRUD API | REST API 增删改查 |
| 3.5 | 实现照片 CRUD API | 含上下架功能 |
| 3.6 | 搭建管理后台页面 | admin/ 所有页面 |
| 3.7 | Element Plus 表格+表单 | 后台 UI |

**学习重点：** 数据库概念、REST API 设计、JWT 认证、前后端联调

---

### 阶段 4：照片画廊（Day 8-10）

**目标：** 公开作品展示美观，支持筛选检索

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 4.1 | 照片上传接口（sharp 处理） | 图片处理流程 |
| 4.2 | 自动生成三种尺寸（缩略图/中图/原图） | WebP 优化 |
| 4.3 | 瀑布流/网格画廊组件 | PhotoGrid.vue |
| 4.4 | 筛选器（地点/时间/类型/标签） | PhotoFilter.vue |
| 4.5 | 照片详情弹窗（EXIF 信息） | PhotoDetail.vue |
| 4.6 | 懒加载 + 渐进式加载 | 性能优化 |
| 4.7 | 作品集页面美化 | portfolio/ |

**学习重点：** sharp 图片处理、前端性能优化、组件封装

---

### 阶段 5：Docker 容器化（Day 11-12）

**目标：** 整个项目打包成 Docker 镜像

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 5.1 | 学习 Docker 基础概念 | 06-docker-basics.md |
| 5.2 | 编写 Dockerfile | 多阶段构建 |
| 5.3 | 编写 docker-compose.yml | 编排文件 |
| 5.4 | 本地测试 Docker 运行 | 验证通过 |
| 5.5 | 编写部署脚本 deploy.sh | 一键部署 |

**学习重点：** Docker 概念、Dockerfile 编写、Compose 编排

---

### 阶段 6：ECS 部署 + Nginx（Day 13-15）

**目标：** 通过 IP 地址能访问网站

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 6.1 | ECS 安装 Docker + Docker Compose | 服务器环境 |
| 6.2 | 配置 Nginx 反向代理 | 07-nginx-deploy.md |
| 6.3 | 上传代码 + 构建镜像 | 部署流程 |
| 6.4 | 启动服务 + 测试访问 | 🎉 上线！ |
| 6.5 | 配置 HTTPS（可选，IP 可跳过） | 证书配置 |

**学习重点：** Nginx 配置、服务器运维、Docker 远程部署

---

### 阶段 7：本地服务 + frp + 备份（Day 16-18）

**目标：** 照片服务上线，自动备份就绪

| 步骤 | 内容 | 输出文档 |
|------|------|---------|
| 7.1 | 本地安装 Docker + Immich | 09-immich-setup.md |
| 7.2 | 配置 frp（ECS 端 + 本地端） | 08-frp-tunnel.md |
| 7.3 | Nginx 配置照片路由 | 冷数据走 frp |
| 7.4 | 编写 rsync 同步脚本 | sync-photos.sh |
| 7.5 | 编写数据库备份脚本 | backup-db.sh |
| 7.6 | 配置 crontab 定时任务 | 自动化运维 |
| 7.7 | 测试完整链路 | 端到端验证 |

**学习重点：** Docker Compose、frp 配置、rsync、crontab

---

## 七、带宽优化策略

| 优化手段 | 效果 | 实现位置 |
|---------|------|---------|
| WebP 格式压缩 | 单张 8MB → 50KB（缩小 160x） | sharp 上传时处理 |
| 三级图片（缩略/中/原图） | 首屏只加载 50KB 缩略图 | Nuxt API + 前端组件 |
| 懒加载 | 只加载可视区域 | `loading="lazy"` |
| 分层存储 | 90% 浏览不走 frp | ECS 缓存热数据 |
| frp 精确路由 | 只转发必要请求 | Nginx location |
| 缓存策略 | 热门照片常驻 ECS | photo-cache 中间件 |

---

## 八、费用与资源估算

| 项目 | 费用 | 备注 |
|------|------|------|
| ECS 服务器 | 已有 | 2核2G + 30GB 足够 |
| 域名 | ~60元/年 | .com 域名 |
| ICP 备案 | 免费 | 阿里云免费，需 1-2 周 |
| SSL 证书 | 免费 | Let's Encrypt |
| frp | 免费 | 开源工具 |
| Immich | 免费 | 开源工具 |
| **总计** | **~60元/年** | |

---

## 九、关键技术决策汇总

| # | 决策 | 选择 | 原因 |
|---|------|------|------|
| 1 | 整体架构 | 混合部署（ECS + 本地） | 兼顾性能和存储 |
| 2 | 前端框架 | Nuxt 3 (Vue 3) | 用户偏好 Vue |
| 3 | UI 组件库 | Element Plus | 中文友好、生态成熟 |
| 4 | 博客系统 | Nuxt Content | Markdown 驱动、零配置 |
| 5 | 数据库 | SQLite + Prisma | 轻量、新手友好 |
| 6 | 公开照片 | 自建 Nuxt 模块 | 定制化强 |
| 7 | 私密相册 | Immich | 开箱即用、功能丰富 |
| 8 | 内网穿透 | frp | 国内最流行、稳定 |
| 9 | 数据备份 | rsync + crontab | 简单可靠 |
| 10 | 容器化 | Docker + Compose | 现代部署标准 |

---

*文档创建时间：2026-07-04*
*版本：v1.0*
