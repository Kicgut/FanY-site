---
name: server-infrastructure
description: 维护本项目双服务器基础设施、生产部署、FRP 链路或照片存储与同步时使用。覆盖 ECS 网站服务器与 Ubuntu 服务器 A 的职责边界、实际目录、SSH 检查、镜像发布和高风险操作约束。
---

# 双服务器基础设施

将 ECS（公网网站）和 Ubuntu 服务器 A（原图与本地高信任服务）视为独立主机。执行远程命令前，确认目标机器、绝对路径、影响范围和验证方式；不要因两台主机共享仓库而混用其职责。

## 当前仓库和运行目录

仓库根目录的 Nuxt 应用位于 `nuxt-app/`。其中的 `docker-compose.yml`、`Dockerfile`、`server/`、`prisma/`、`scripts/` 与 `config/` 是应用和运维配置的来源；根目录的 `docs/`、`.codex/` 与 `scripts/` 为项目级文档、技能和辅助脚本。

ECS 的应用 Compose 从 `/opt/personal-website/nuxt-app/docker-compose.yml` 运行。按该 Compose 的相对挂载，持久化目录为：

```text
/opt/personal-website/
├── nuxt-app/                 # Compose 文件和受版本控制的部署配置
├── data/prod.db              # 宿主机数据库
├── uploads/                  # 运行时上传文件
│   └── photos/
│       ├── ecs-originals/    # 临时原图
│       └── thumbnails/       # 缩略图和中图
├── backups/                  # 容器挂载的备份目录
└── releases/                 # 已校验的镜像包与校验文件
```

容器内的对应关系是：`/app/data` ← `../data`、`/app/public/uploads` 和 `/app/.output/public/uploads` ← 同一个 `../uploads`、`/app/backups` ← `../backups`。不要把容器路径 `/app/...` 写成 ECS 宿主机路径，也不要使用已废弃的 `/opt/personal-website/public/uploads` 或 `app/nuxt-app` 布局。

Ubuntu 服务器 A 的原图根目录是 `/mnt/data/personal-website/photos/`，通常按 `incoming/`、`public/`、`friends/`、`private/` 和月份组织。缩略图根目录是 `/mnt/data/personal-website/thumbnails/`。仓库中的 Ubuntu service 模板从 `/mnt/data/personal-website/nuxt-app/scripts/` 启动；真实环境文件位于 `/etc/default/` 或用户的 `~/.config/personal-website/`，不进入 Git。

## 服务器职责

### ECS（SSH 别名 `yyh-ecs`）

- 运行 Nuxt 网站、Server API、`personal-website` 容器、Nginx 和 `frps`。
- 保存 SQLite 生产数据库、展示用上传文件、缩略图和尚未回流的临时原图。
- 接收已构建的镜像包，执行校验、`docker load`、数据库迁移、容器重建和健康检查。
- 不保存永久原图，不运行 Ubuntu 的原图 API、Immich、`frpc` 或本地 Skills 服务。

### Ubuntu 服务器 A（SSH 别名 `yyh-ubuntu-a`）

- 保存永久原图、私密内容和本地备份。
- 运行 `photo-original-api`、照片回流和缩略图同步任务、Immich、本地 Skills API/同步及其他本地高信任服务。
- 运行 `frpc`，向 ECS 上的 `frps` 建立隧道；不运行公网网站容器。

## Git 与数据边界

- 根 `.gitignore` 忽略根级 `photos/`、`thumbnails/`、`uploads/`、`backups/`、`releases/`、数据库、媒体文件和内容流水线运行时目录；`nuxt-app/.gitignore` 还忽略应用目录内的 `data/`、`uploads/` 和 `backups/`。
- `nuxt-app/public/images/`、`nuxt-app/assets/images/` 与 `docs/**` 中被明确放行的设计素材属于源码，应提交 Git；运行时 `public/uploads/` 不应提交。
- 对某一路径的实际忽略规则使用 `git check-ignore -v <path>` 验证，不要仅凭目录名判断。
- 真实 `.env`、JWT/FRP/照片 token、数据库、照片、日志、备份及运行时内容不得写入 Git、命令输出或任务报告。

## 照片流与路径边界

```text
浏览器 → ECS Nuxt/API → ECS uploads/photos/ecs-originals
                         └→ ECS uploads/photos/thumbnails（展示）
审核与状态变更 → 受控同步/回流任务 → Ubuntu 永久原图或缩略图目录
原图请求 → ECS 权限 API → 已验证的 FRP/原图 API 链路 → Ubuntu
```

- 原图与缩略图属于不同数据层；`private` 原图绝不能通过公开 ECS 静态路径提供。
- `originalPath`、`thumbPath`、`ecsThumbPath` 等为服务端内部路径，普通客户端只能获得受控 URL。
- 回流完成前保留 ECS 临时原图；仅在 Ubuntu 落盘、checksum 和状态更新均已成功后，才可在明确授权下清理临时文件。
- 不假定 `photos.local:7080`、原图 API 端口或 FRP 代理已可用。先读取现场配置并做健康检查；仓库内 FRP 配置含占位 token，不能当作生产事实。

## 发布和远程变更

1. 在开发机、Ubuntu 构建机或 CI 固定 Git commit，执行验证并构建 `personal-website:<commit>` 镜像。
2. 导出镜像包和 SHA-256 校验文件，传输到 ECS 的 `/opt/personal-website/releases/`。
3. 在 ECS 校验 checksum，加载镜像、保留可回滚 tag、执行 Prisma migration、重建 `app` 容器并做健康检查。
4. 只在需要 Ubuntu 服务变更时于 Ubuntu `git pull --ff-only`，安装或重载对应的 systemd 服务，再验证原图 API、`frpc` 和目录权限。

严禁在 ECS 执行 `docker build`、`docker compose build`、`pnpm install` 或 `pnpm build`。不要通过 `git pull`、`git checkout` 或复制源码把 ECS 当开发机；生产工作区出现意外改动时，先保全 diff 和运行时数据，再决定恢复策略。

执行重启、`docker compose up/pull/run`、迁移、修改 `.env`、修改 Nginx/FRP、批量同步、回流、移动或删除文件前，必须先确认目标和影响范围。默认只读检查包括：

```bash
ssh yyh-ecs "hostname; id -un; docker ps; ss -ltnp"
ssh yyh-ubuntu-a "hostname; id -un; df -h / /mnt/data; systemctl is-active frpc"
ssh yyh-ubuntu-a "find /mnt/data/personal-website/photos -maxdepth 2 -type d -print"
```

使用 `yyh-ubuntu-a` 别名访问服务器 A；它依赖 ECS 的 ProxyCommand/FRP 链路。不要绕过别名猜测公网端口。

## 验收与定位

变更报告必须分别说明“代码/配置已修改”“ECS 已部署”“Ubuntu 服务已更新”“数据已同步”。至少验证：

- ECS：容器健康、`3000` 端口、Nginx、应用日志和数据库迁移状态；
- Ubuntu：`/mnt/data` 挂载、原图服务、`frpc`、文件权限与磁盘空间；
- 链路：ECS `frps`、Ubuntu `frpc` 和实际代理端口；
- 应用：权限 API 返回受控 URL，未向客户端泄漏 `/app/...` 或 `/mnt/data/...` 路径。

以 `docs/operations/production-deployment.md`、`docs/operations/server-roles.md`、`docs/design/data-storage.md` 为当前运维事实来源；历史学习笔记不能覆盖当前代码和这些手册。
## 构建失败经验（2026-08）

- Docker Hub 基础镜像拉取失败时，先确认 Docker Desktop/daemon 已启动，再通过 `--build-arg HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY` 传入代理；不要把代理地址写入仓库文件。
- 本机 pnpm store 不能假定会被 Linux 容器复用；即使复制到容器，也可能显示 `reused 0`。如需尝试缓存，显式设置 `pnpm config set store-dir`，并把它视为加速手段而非离线保证。
- npm 镜像源连接慢或超时时，优先使用代理访问 `https://registry.npmjs.org`，同时提高 pnpm 的 `fetch-timeout` 和 `fetch-retries`；构建日志应确认实际使用的 registry。
- 生产构建必须在本机/Ubuntu/CI 完成；ECS 只接收已导出的镜像包，执行 SHA-256 校验、`docker load`、迁移、`compose up --no-build` 和健康检查。
- 导出包上传前记录镜像 tag、归档 SHA-256 和 Git commit；ECS 磁盘不足时，先保留当前运行镜像、回滚 tag、当前发布包和数据库备份，再清理其余旧资源。
