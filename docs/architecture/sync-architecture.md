---
title: "ECS ↔ 本地服务器同步架构"
created: 2026-07-08 00:00
updated: 2026-07-15 23:29
status: final
purpose: "```"
scope: "全阶段"
related: []
tags:
  - architecture
---

# ECS ↔ 本地服务器同步架构

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        本地服务器 (ASUS FX504GE)                      │
│                        Ubuntu 24.04 / 192.168.x.x                   │
│                                                                     │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │ ~/.hermes/skills/ │  │ Skills API :9800  │  │ frpc            │  │
│  │ (89 个 SKILL.md)  │→→│ (Python HTTP)     │→→│ → skills.local  │  │
│  └───────────────────┘  └───────────────────┘  └────────┬────────┘  │
│                                                         │           │
│  ┌───────────────────┐                                  │           │
│  │ Nuxt Dev :3000    │  ← 开发时本地运行                  │           │
│  └───────────────────┘                                  │           │
└─────────────────────────────────────────────────────────┼───────────┘
                                                          │
                                                    frp 隧道 (加密)
                                                    server: 7000
                                                    vhost: 7080
                                                          │
┌─────────────────────────────────────────────────────────┼───────────┐
│                       阿里云 ECS                            │           │
│                       120.26.231.150 / Ubuntu 22.04        │           │
│                                                             │           │
│  ┌──────────────────┐  ┌──────────────────────────────────┘           │
│  │ frps :7000       │←←│ frp server                                    │
│  │ (frp server)     │  └───────────────────────────────────────────────┘
│  └──────┬───────────┘                                                  │
│         │ vhost :7080                                                  │
│  ┌──────▼───────────┐                                                  │
│  │ Nginx            │  ← 反向代理 (systemd 管理)                        │
│  │ - :80 → :3000    │                                                  │
│  │ - skills.local   │                                                  │
│  └──────┬───────────┘                                                  │
│         │                                                              │
│  ┌──────▼───────────────────────────────────────────────┐              │
│  │ Docker: personal-website                              │              │
│  │ ┌──────────────────────────────────────────────────┐ │              │
│  │ │ Nuxt App :3000                                   │ │              │
│  │ │                                                  │ │              │
│  │ │ syncSkillsToDb() ──HTTP──→ skills.local:7080     │ │              │
│  │ │                        (extra_hosts → host GW)   │ │              │
│  │ │                                                  │ │              │
│  │ │ SQLite: /app/data/prod.db                        │ │              │
│  │ │   - HermesSkill (89 条)                          │ │              │
│  │ │   - Photo, Article, User ...                     │ │              │
│  │ └──────────────────────────────────────────────────┘ │              │
│  │ volumes:                                             │              │
│  │   - ./data:/app/data                                 │              │
│  │   - ./uploads:/app/public/uploads                    │              │
│  └──────────────────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────┘
```

## 同步机制一览

| 数据 | 方向 | 方式 | 触发 |
|------|------|------|------|
| Skills | 本地 → ECS | frp 隧道 + HTTP API | Admin 后台手动点击「同步」 |
| 照片导入 | 外部 → ECS | Admin 后台上传 | 用户操作 |
| 照片回流 | ECS → 本地 | `photo-sync.sh` + rsync | 手动/Cron |
| 照片展示 | ECS → 浏览器 | Nuxt SSR/CSR | 用户访问 |
| 代码部署 | 本地 → ECS | git push → Docker build → scp | 开发流程 |

## frp 隧道配置

### frpc (本地服务器)

```toml
# ~/.config/frp/frpc.toml
serverAddr = "120.26.231.150"
serverPort = 7000

auth.method = "token"
auth.token = "HDgVMX3P1aL28oXR4FQp7bXzYhEnxYvQertw64FPq28"

[[proxies]]
name = "skills-api"
type = "http"
localIP = "127.0.0.1"
localPort = 9800
customDomains = ["skills.local"]

[[proxies]]
name = "local-web"
type = "http"
localIP = "127.0.0.1"
localPort = 3000
customDomains = ["local.localhost"]
```

### frps (ECS)

```toml
# /etc/frp/frps.toml
bindPort = 7000
vhostHTTPPort = 7080
```

### Docker 网络配置

```yaml
# /opt/personal-website/docker-compose.yml
services:
  app:
    extra_hosts:
      - "skills.local:host-gateway"   # 让容器解析 skills.local → 宿主机
    environment:
      - DATABASE_URL=file:/app/data/prod.db
```

**关键点**: Docker 容器内无法直接解析 `skills.local`，需要 `extra_hosts` 映射到宿主机网关。
frps 根据 HTTP `Host: skills.local` 头进行 vhost 路由。

## 部署流程

```
本地修改代码
    │
    ├→ npm run build (本地验证)
    │
    ├→ git add + commit + push (GitHub)
    │
    ├→ docker build -t personal-website:latest .
    │
    ├→ docker save | gzip → scp 到 ECS
    │
    ├→ ECS: docker load + docker compose up -d
    │
    └→ 验证: curl http://120.26.231.150:3000
```

**注意**: ECS 内存仅 1.6GB，无法在 ECS 上构建 Docker 镜像，必须本地 build 后上传。

## 数据库迁移

由于 Prisma migrate 在生产环境有限制，使用 `scripts/start.sh` 容错启动：

```bash
#!/bin/bash
# scripts/start.sh — Docker 容器启动脚本
npx prisma migrate deploy 2>/dev/null || npx prisma db push
npx prisma generate
exec node .output/server/index.mjs
```

`prisma migrate deploy` 失败时自动 fallback 到 `prisma db push`。
