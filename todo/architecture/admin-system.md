# 后台管理系统架构

## 1. 目标

后台是 owner 的控制中心，支持远程安全管理，但高危操作仍受限。

## 2. 页面

```text
/admin/dashboard
/admin/articles
/admin/photos
/admin/photos/review
/admin/albums
/admin/portfolio
/admin/users
/admin/content-pipeline
/admin/hermes
/admin/hermes/skills
/admin/storage
/admin/jobs
/admin/audit-log
/admin/security
```

## 3. 远程后台允许

- 审核照片。
- 调整可见范围。
- 管理普通用户。
- 查看私人照片，需二次认证。
- 管理 Hermes 候选内容。
- 查看 Skill 状态。
- 标记 Skill 待处理。
- 查看任务和存储状态。

## 4. 远程后台禁止

- 永久删除照片。
- 删除冷存储文件。
- 执行 shell。
- 修改 stable skill 文件。
- 修改系统配置。

## 5. 本地后台额外允许

- 永久删除。
- 批量归档。
- skill 固化。
- 运行本地大模型批处理。
- 执行维护脚本。

## 6. UI 必须显示权限边界

高危按钮不应只是 disabled，还应说明：

```text
此操作仅允许本地可信访问执行。
```

## 7. Audit Log

所有后台敏感操作必须记录：

- userId。
- action。
- resourceType。
- resourceId。
- before。
- after。
- accessSource。
- ip。
- createdAt。
