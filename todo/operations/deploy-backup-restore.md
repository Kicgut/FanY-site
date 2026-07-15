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
