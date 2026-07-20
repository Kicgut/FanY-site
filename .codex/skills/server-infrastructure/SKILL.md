---
name: server-infrastructure
description: 项目两台服务器的职责边界、照片数据流、SSH 连接和安全操作规范。
---

# Server Infrastructure Skill

本 skill 用于处理本项目的 ECS 网站服务器与 Ubuntu 原图服务器。执行任何远程命令前，先判断目标机器和操作范围，不能把两台服务器视为同一台主机。

## 服务器职责

### `you-ecs`（公网网站服务器）

- 运行 Nuxt 网站、Server API 和管理后台。
- 运行 `personal-website` Docker 容器，通常监听 `3000`。
- 运行 Nginx（公网入口）和 `frps`（FRP 服务端）。
- 宿主机项目目录通常为 `/opt/personal-website`。
- SQLite 生产数据库通常为 `/opt/personal-website/data/prod.db`。
- 照片挂载目录为 `/opt/personal-website/uploads`，其中 `photos/thumbnails` 用于展示，`photos/ecs-originals` 是待回流的临时原图。
- 负责上传接收、审核、权限 API、缩略图/中图展示和同步状态管理。

### `you-ubuntu-a`（Ubuntu 原图与本地服务服务器）

- 保存照片永久原图和私密资产，不承担公网网站主站职责。
- 原图根目录通常为 `/mnt/data/personal-website/photos`，按 `public/`、`friends/`、`private/`、`incoming/` 分类。
- 运行原图访问服务、备份、Immich、本地 Skills API 或其他本地高信任服务；实际端口必须以现场配置为准。
- 运行 `frpc`，主动连接 ECS 的 `frps`；不直接修改 ECS 网站容器配置。
- 原图服务和 FRP 照片代理未确认前，不得假设某个端口或 URL 已经可用。

## 数据流与边界

```text
浏览器 → ECS Nuxt/API
上传   → ECS 临时保存原图 + 生成 thumb/medium
审核   → ECS 决定 visibility/status/reviewStatus
同步   → ECS 展示缩略图；按策略将需要的缩略图同步到 ECS
回流   → ECS 临时原图经受控 SSH/SCP 写入 Ubuntu 原图目录
原图   → ECS API 按权限调用 Ubuntu 原图服务或受控回源
```

- `private` 原图不得通过公开 ECS 资源路径暴露。
- 缩略图和原图是不同数据层；日常画廊请求不应把原图当作首屏资源。
- 数据库中的 `originalPath`、`thumbPath` 等路径只供服务端使用，不得直接返回给普通客户端。
- 上传、审核、同步、回流必须使用显式状态和可重试流程；删除或清理 ECS 原图前必须确认 Ubuntu 已完成校验和持久化。

## SSH 连接

本机 SSH 配置使用别名：

```bash
ssh yyh-ecs
ssh yyh-ubuntu-a
```

`yyh-ubuntu-a` 通过 ECS 的 `ProxyCommand` 和 FRP TCP 端口转发连接到 Ubuntu。不要绕过别名直接猜测公网端口。

常用只读检查：

```bash
ssh yyh-ecs "hostname; id -un; docker ps; ss -ltnp"
ssh yyh-ubuntu-a "hostname; id -un; df -h / /mnt/data; systemctl is-active frpc"
ssh yyh-ubuntu-a "find /mnt/data/personal-website/photos -maxdepth 2 -type d -print"
```

通过 ECS 检查 Ubuntu 的 FRP/SSH 链路：

```bash
ssh yyh-ecs "systemctl is-active frps; ss -ltnp | grep -E ':7000|:6022|:7080'"
ssh yyh-ubuntu-a "systemctl is-active frpc; journalctl -u frpc -n 80 --no-pager"
```

## 操作分级

### 默认允许：只读

- `hostname`、`id`、`df`、`du`、`find`、`ss`、`ps`、`systemctl is-active/status`。
- `docker ps/inspect/logs`、`git status`、读取 compose/Nginx/FRP 配置。
- `curl` 健康检查和只读 API 查询。

### 必须先确认目标和影响范围

- 重启容器、Nginx、frpc/frps 或其他 systemd 服务。
- `docker compose up/pull`、数据库迁移、修改 `.env`、修改 Nginx/FRP 配置。
- 批量同步、回流、移动或删除任何照片文件。

### 禁止默认执行

- `rm -rf`、清空上传目录、删除数据库或冷存储。
- 在 Ubuntu 上运行网站部署命令，或在 ECS 上把原图目录当作永久资产目录。
- 把 FRP token、SSH 私钥、JWT secret 或真实 `.env` 内容写入代码、日志或 Git。

## 远程变更流程

1. 先在本地确认 `git status`，记录目标机器、路径和预期影响。
2. 先执行只读检查并保存结果；涉及照片时先做数量、checksum 或 dry-run 校验。
3. 变更 ECS 网站时优先使用项目部署脚本和 Docker Compose；变更 Ubuntu 原图服务时优先使用对应 systemd/service 配置。
4. 变更后分别验证 ECS 网站/API、Ubuntu 原图服务、FRP 链路和照片权限。
5. 报告必须区分“代码已修改”“服务器已部署”“数据已同步”三种状态。

## 故障定位顺序

1. ECS：容器健康、端口 `3000`、Nginx `80/443`、应用日志和数据库状态。
2. Ubuntu：原图服务进程/端口、`/mnt/data` 挂载、照片文件权限和磁盘空间。
3. 链路：ECS `frps`、Ubuntu `frpc`、代理名称/域名和对应端口。
4. 应用：确认 API 返回的是受控 URL，而不是 `/app/...` 或 `/mnt/data/...` 内部路径。

