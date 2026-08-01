---
title: "目录结构设计"
created: 2026-07-15 23:29
updated: 2026-08-01
status: current
purpose: "说明仓库、ECS 与 Ubuntu 服务器 A 的当前目录边界。"
scope: "全项目"
related:
  - ./data-storage.md
  - ../operations/production-deployment.md
  - ../operations/server-roles.md
tags:
  - docs\design
---

# 目录结构设计

以下内容以当前仓库、`nuxt-app/docker-compose.yml` 和服务脚本为准。运行时目录是否实际存在取决于部署；不要将历史目录示例当作已部署事实。

## 1. 仓库

```text
FanY-site/
├── .codex/skills/                 # 项目级 Codex skills
├── nuxt-app/                      # Nuxt 应用与 Docker 构建上下文
│   ├── server/                     # Server API、service、utils
│   ├── prisma/                     # schema 与 migrations
│   ├── scripts/                    # 应用、照片与服务脚本
│   ├── config/                     # Nginx、FRP、Immich 配置模板
│   ├── public/images/              # 提交 Git 的固定前端素材
│   └── docker-compose.yml
├── docs/                           # 当前架构、设计、运维和治理文档
├── scripts/                        # 项目级运维辅助脚本
├── AGENTS.md
├── CODEX.md
└── HERMES.md
```

`nuxt-app/public/uploads/`、`nuxt-app/.data/`、数据库和用户媒体为本地/运行时数据，不属于源码目录。

## 2. ECS 网站服务器

`docker compose` 从 `/opt/personal-website/nuxt-app/` 运行；Compose 将其相邻目录挂载进容器：

```text
/opt/personal-website/
├── nuxt-app/                       # docker-compose.yml 和部署配置
├── data/
│   └── prod.db                     # → /app/data/prod.db
├── uploads/                        # → /app/public/uploads
│   ├── photos/
│   │   ├── ecs-originals/           # ECS 临时原图
│   │   └── thumbnails/              # 缩略图与中图
│   └── portfolio/                  # 作品媒体
├── backups/                         # → /app/backups
└── releases/                        # 已校验镜像包与 SHA-256 文件
```

同一个 `uploads/` 也挂载到容器的 `/app/.output/public/uploads/`，供 Nitro 提供静态上传文件。`/app/...` 是容器内路径；不要误写为 ECS 宿主机目录。

## 3. Ubuntu 服务器 A

```text
/mnt/data/personal-website/
├── nuxt-app/                       # 本地服务使用的仓库工作树
├── photos/                         # 永久原图
│   ├── incoming/
│   ├── public/
│   ├── friends/
│   └── private/
└── thumbnails/                     # 可重建的缩略图
```

`photo-original-api`、照片回流和缩略图同步的 service 模板位于 `nuxt-app/scripts/`；安装后的 unit 文件属于 systemd，真实 token 和环境变量位于 `/etc/default/` 或用户配置目录，不在仓库中。

本项目不以仓库定义 Hermes Skills、Immich 数据或冷存储的完整磁盘布局。维护这些服务时先检查该服务器上的实际配置和挂载，再记录确认为当前事实的路径。
