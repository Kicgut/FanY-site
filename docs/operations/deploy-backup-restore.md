---
title: "部署、备份与恢复"
created: 2026-07-15 23:29
updated: 2026-07-24
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\operations
---
# 部署、备份与恢复

## 1. 部署

ECS 继续使用 Docker + Nginx。

新增服务：

- frps。
- 可能的 background worker。

本地服务器新增：

- photo-server。
- frpc。
- hermes-gateway。
- content-pipeline scripts。

## 2. 数据库备份

SQLite 使用 `.backup`：

```bash
sqlite3 /opt/personal-website/data/prod.db ".backup /path/prod.db.$(date +%F)"
```

保留策略：

- ECS 最近 7 天。
- 本地最近 30 天。
- 移动硬盘长期保留。

## 3. 文件备份

- 本地 photos → 移动硬盘。
- thumbnails → 移动硬盘。
- content-pipeline → 移动硬盘。
- hermes-skills registry → 移动硬盘。

## 4. 恢复

恢复顺序：

1. 停止服务。
2. 恢复 DB。
3. 恢复 public thumbnails。
4. 恢复本地 originals。
5. 校验 manifest/checksum。
6. 启动服务。
7. 运行一致性检查。
## 自动化健康检查与恢复演练

生产容器启动后执行 `scripts/production-healthcheck.sh`（默认检查 `http://127.0.0.1:3000/`、容器 healthcheck 与根分区使用率）。恢复演练必须在副本目录完成：复制最近的 `backups/prod.db-*.db` 到临时 SQLite 路径，使用同一镜像执行 `prisma migrate status`，再做只读查询；确认可读后删除临时副本，禁止直接覆盖生产 `data/prod.db`。
