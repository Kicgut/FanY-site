---
title: "Phase 10：本地最高权限与高危操作保护"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Phase 10：本地最高权限与高危操作保护

## 1. 任务目标

实现“本地服务器才拥有最高权限”的安全模型。远程登录的你本人可以查看、审核、发布、授权，但不能执行删除、shell、Skill 修改等高危操作。

## 2. 前置条件

- Phase 3 已实现 `getAccessOrigin`。
- 已阅读 `docs/implementation/security-validation.md`。
- 已确认 local_trusted 判定方式。

## 3. 改动范围

### 允许改动

- 权限工具函数。
- 高危 API guard。
- 本地管理 API。
- Nginx 内部 header 配置，若采用。
- 审计日志。

### 禁止改动

- 不允许仅靠前端隐藏按钮。
- 不允许远程 owner 绕过 local_trusted。
- 不允许公网暴露 local admin 页面。

## 4. 高危操作列表

必须仅限 local_trusted：

```text
permanent_delete_photo
bulk_delete_files
archive_to_cold_storage
restore_from_cold_storage
modify_hermes_skill_source
enable_high_risk_skill
execute_shell
modify_nginx_config
modify_frp_config
modify_env
clear_database
```

## 5. 核心函数

```ts
requireLocalTrusted(event): void
requireOwnerAndLocalTrusted(event): Promise<AuthUser>
assertDangerousOperationAllowed(event, operation): Promise<void>
writeAuditLog(actor, origin, operation, result): Promise<void>
```

## 6. local_trusted 判定建议

第一版优先：

```text
localhost
局域网 IP
Tailscale/WireGuard 私网 IP
```

不建议：

```text
仅根据 X-Forwarded-For 判断
仅根据前端传参判断
仅根据 admin role 判断
```

## 7. UI 规则

- 远程后台可以显示“此操作仅本地可用”。
- 本地后台才显示高危按钮。
- 即使按钮显示，后端仍必须验证。

## 8. 验收标准

- 远程 owner 调用高危 API 返回 403。
- local_trusted owner 调用高危 API 才允许。
- 所有高危拒绝和成功都写审计日志。
- 伪造 header 不能获得 local_trusted。

## 9. 回滚方案

- 禁用所有高危 API。
- 保留远程只读和审核能力。

## 10. Agent 注意事项

- 不允许为了调试临时关闭 high-risk guard。
- 不允许新增未登记的高危操作。
