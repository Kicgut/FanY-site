# Phase 11：运维、备份、告警、日志与审计

## 1. 任务目标

建立低成本但可恢复的运维体系：数据库备份、照片备份、存储告警、任务日志、访问审计、失败重试。

## 2. 前置条件

- 核心功能基本完成。
- 已阅读 `docs/operations/deploy-backup-restore.md`、`docs/operations/monitoring-alerting.md`、`docs/operations/storage-sync-archive.md`。

## 3. 改动范围

### 允许改动

- `scripts/**`
- `logs/**`
- cron/systemd timer 配置文档。
- `/admin/storage`
- `/admin/jobs`
- AccessLog/Job 写入逻辑。

### 禁止改动

- 不自动删除原图。
- 不自动公开任何内容。
- 不在日志中写明文 token/password。

## 4. 备份任务

### 数据库备份

```bash
sqlite3 prod.db ".backup backup.db"
```

频率：每日。

保留：本地 30 天，移动硬盘长期。

### 照片备份

本地 photos → 移动硬盘 photos。

### 配置备份

Nginx/frp/docker-compose/env.example/scripts。

真实 `.env` 不进 Git。

## 5. 告警阈值

ECS：

```text
>70% warning
>85% critical，暂停缩略图同步
```

本地：

```text
>80% warning
>90% critical，建议归档
```

## 6. 日志分类

```text
access.log
security.log
photo-sync.log
content-pipeline.log
hermes-skill-scan.log
backup.log
error.log
```

## 7. 审计事件

必须记录：

- 登录失败。
- 权限拒绝。
- 原图下载。
- 私人照片查看。
- 批量权限修改。
- 用户权限修改。
- AI 访问。
- 高危操作成功/失败。

## 8. 验收标准

- 数据库备份可恢复。
- 同步脚本失败时有日志。
- ECS 空间超过阈值会阻止缩略图同步。
- 后台能看到最近任务状态。
- 审计日志不包含明文密码或 token。

## 9. 回滚方案

- 停止 cron/systemd timer。
- 手动恢复数据库备份。
- 根据同步日志回滚文件。

## 10. Agent 注意事项

- 不允许脚本默认执行破坏性操作。
- 所有清理类脚本必须先支持 `--dry-run`。
