---
title: "双服务器共享仓库生产部署指南"
created: 2026-07-20 20:45
updated: 2026-07-23 00:00
status: active
purpose: "说明开发机、ECS 和 Ubuntu 之间的构建、传输、部署和回滚边界。"
scope: "部署与运维"
related: []
tags: [deployment, ecs, ubuntu, docker, monorepo]
---

# 双服务器共享仓库生产部署指南

## 架构原则

本项目是共享 Git 仓库的双服务器 monorepo：ECS 运行网站/API、Docker、Nginx、frps、缩略图和临时原图；Ubuntu 运行永久原图、原图 API、frpc、备份和本地服务。两台服务器允许保留对方服务的冗余代码，但只启动本机职责内的服务。

ECS 资源紧张，禁止在 ECS 上执行 `pnpm install`、`pnpm build` 或 Docker 编译。镜像可由开发机、Ubuntu 或其他构建机生成，再传输到 ECS；Ubuntu 可以直接拉取仓库部署本地 service，但不运行公网网站容器。

## ECS 镜像发布

### 构建目录约定

构建机上的临时目录和导出文件统一放在仓库外的 `E:\FanY-site-build\`（Linux 构建机对应 `$HOME/FanY-site-build/`）：

```text
FanY-site-build/
└── <commit>/
    ├── source/       # git archive 导出的源码快照
    └── artifacts/    # Docker 镜像 tar.gz 与 .sha256
```

`FanY-site-build-<commit>` 是旧流程留下的源码快照目录，`.zip` 是源码压缩包；`personal-website-<commit>.tar.gz` 才是 Docker 镜像导出包。两者都不是 Git 内容，不能混为“历史镜像目录”。

在构建机固定一个 Git commit，执行 `pnpm install --frozen-lockfile`、`npx prisma validate`、`npx tsc --noEmit`、`pnpm build`，然后执行 `docker build -t personal-website:<commit> .`、`docker save personal-website:<commit> | gzip > personal-website-<commit>.tar.gz` 和 `sha256sum`。构建机可以是开发机、Ubuntu 或 CI 主机，不要求必须是 ECS。

将 tar 包和 sha256 文件通过 `scp` 传到 ECS `/opt/personal-website/releases/`。ECS 只执行 `sha256sum -c`、`docker load`、打 tag、`./scripts/backup-db.sh`、`docker compose run --rm app npx prisma migrate deploy`、`docker compose up -d app` 和健康检查。失败时恢复上一个已验证 image tag；不得删除 `data/`、`uploads/`、`backups/`。

### Migration 漂移预检

执行 `migrate deploy` 前，先在隔离副本或只读检查中确认 `_prisma_migrations` 与实际表结构一致。若历史上曾用 `prisma db push` 补过字段，不能直接重复执行对应 migration；必须先备份数据库、记录实际列/表、由 owner 审核后执行 `prisma migrate resolve --applied <migration>`，再运行 `migrate deploy`。任何 migration 失败都必须停止发布，不能用 `db push --accept-data-loss` 绕过。

## Ubuntu 服务发布

Ubuntu 执行 `git pull --ff-only origin master`，安装仓库内的 `nuxt-app/scripts/photo-original-api.service`，执行 `systemctl daemon-reload`、`systemctl enable --now photo-original-api` 和 `systemctl restart frpc`。真实 token 放在 `/etc/default/photo-original-api`，不进入 Git。原图服务只监听 `127.0.0.1`，ECS 通过 FRP 的 `photos.local` 访问。

## 生产工作区和回滚

生产工作区正常情况下只允许明确的 `.env` 差异。发现大量修改时，禁止直接 pull/reset/clean；先保存 `git diff --binary`、未跟踪文件归档和 `git stash push --include-untracked`，同时备份 `data/`、`uploads/`、`backups/` 和 `.env`。确认可恢复后，才允许切换到 `origin/master`。

## ECS 大量未提交改动的原因

本次改动来自直接在 ECS 开发、手工复制页面/API、在服务器构建、开发机/ECS/GitHub 没有固定发布提交，以及本地分支与远端分支发生分叉。按本指南执行后，代码只在构建机修改并提交；ECS 只接收镜像；Ubuntu 只拉取仓库并运行指定 service，因此不应再次产生大规模生产工作区差异。

## 验收

发布目录清理使用仓库内 `scripts/retain-release-artifacts.sh`，默认只保留最新 3 个归档和容器上的一份 rollback tag；脚本会拒绝操作非 `/opt/personal-website/releases` 目录，并且不会触碰 `data/`、`uploads/`、`backups/` 或当前 `latest` 镜像。

构建机检查 commit、测试、镜像 digest 和 tar SHA-256；ECS 检查镜像、迁移、容器和网站；Ubuntu 检查 `photo-original-api`、`frpc` 和原图目录；最后验证 `ECS → photos.local:7080 → Ubuntu:9801` 以及上传、回流、checksum、临时原图删除。
