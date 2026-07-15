---
title: "个人网站项目 — 部署手册"
created: 2026-07-05
updated: 2026-07-05
status: final
purpose: "```"
scope: "全阶段"
tags:
  - project-management
---

# 个人网站项目 — 部署手册

## 项目结构

```
personal-website/
├── nuxt-app/              # Nuxt 3 主应用
│   ├── pages/             # Vue 页面
│   ├── components/        # Vue 组件
│   ├── layouts/           # 布局
│   ├── server/api/        # API 路由
│   ├── prisma/            # 数据库 Schema
│   ├── content/           # Markdown 文章
│   ├── Dockerfile         # 多阶段构建
│   ├── docker-compose.yml # 服务编排
│   └── Makefile           # 常用命令
├── config/                # 配置文件
│   ├── nginx/             # Nginx 配置
│   ├── frp/               # frp 配置
│   └── immich/            # Immich 配置
├── scripts/               # 部署脚本
│   ├── ecs-init.sh        # ECS 初始化
│   ├── deploy.sh          # 首次部署
│   ├── quick-deploy.sh    # 快速更新
│   ├── rollback.sh        # 回滚
│   ├── setup-nginx.sh     # Nginx 安装
│   ├── setup-ssl.sh       # HTTPS 配置
│   ├── setup-frps.sh      # frp 服务端
│   ├── setup-immich.sh    # Immich 安装
│   ├── backup-all.sh      # 综合备份
│   └── monitor.sh         # 健康监控
└── docs/                  # 文档（按子目录分类）
    ├── architecture/        # 架构设计
    │   └── architecture-design.md
    ├── deployment/          # 部署运维
    │   ├── deployment-progress.md
    │   └── storage-bandwidth-plan.md
    ├── issues/              # ⚠️ 踩坑日志（开发前必读）
    │   └── issues.md
    ├── learning-notes/      # 学习笔记
    │   └── 01~10 ...
    └── project-management/  # 项目管理
        ├── backlog.md         # 待办清单
        ├── plan.md            # 当前计划
        ├── README.md          # 本文件
        └── history/           # 已完成任务归档
            └── 2026-07-04/    # 28阶段全部完成
                ├── 28-phases.md
                └── phase-status.md
```

## 部署步骤（按顺序执行）

### Step 1: ECS 初始化
```bash
ssh root@YOUR_ECS_IP
bash ecs-init.sh
```

### Step 2: 部署网站
```bash
bash deploy.sh https://github.com/YOUR_USER/personal-website.git
```

### Step 3: 配置 Nginx
```bash
bash setup-nginx.sh your-domain.com
```

### Step 4: 配置 HTTPS
```bash
bash setup-ssl.sh your-domain.com
```

### Step 5: 配置 frp（可选，用于访问本地服务）
```bash
# ECS 端
bash setup-frps.sh
# 本地端：安装 frpc 并复制 frpc.toml 配置
```

### Step 6: 部署 Immich（可选）
```bash
# 在本地服务器
bash setup-immich.sh
```

### Step 7: 设置定时备份
```bash
# 添加 crontab
crontab -e
# 添加以下行：
0 3 * * * /opt/personal-website/scripts/backup-all.sh >> /var/log/backup.log 2>&1
*/15 * * * * /opt/personal-website/scripts/monitor.sh
```

## 常用运维命令

```bash
# 查看网站状态
make up / make down / make logs

# 更新网站
bash quick-deploy.sh

# 回滚版本
bash rollback.sh

# 备份数据库
make backup

# 查看容器状态
docker compose ps

# 进入容器
make shell
```

## ⚠️ 开发前必读

**每次开发前必须先查看 `docs/issues/issues.md`（踩坑日志）！**

该文件记录了项目开发中遇到的所有问题、原因和解决方案。避免重复踩坑。

```
查看方式：cat docs/issues/issues.md
```

已知高频问题速查：
- Dockerfile 必须逐行对照本地环境版本（pnpm、Node、原生模块）
- ECS 只有 1.6GB RAM，Docker 构建用单阶段避免 OOM
- ECS 无外网 GitHub 访问，需 SSH 反向隧道代理
- pnpm 是包管理器（npm 在 Node v24 崩溃）
- RustDesk 端口 21114-21119 不可占用

## 技术栈

- **前端：** Nuxt 3 + Vue 3 + Element Plus
- **后端：** Nuxt Server API + Prisma ORM + SQLite
- **部署：** Docker + Docker Compose + Nginx
- **安全：** JWT 认证 + HTTPS + bcrypt 密码哈希
- **备份：** SQLite .backup + rsync + cron 定时任务
