---
title: "Phase 3：认证、用户分组与 AI 访问权限"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Phase 3：认证、用户分组与 AI 访问权限

## 1. 任务目标

建立用户角色、分组、AI 使用权限、本地/远程权限分级，为照片和 Hermes 功能提供统一权限判断。

## 2. 前置条件

- Phase 2 已完成。
- User 模型已包含 `role`、`groups`、`aiAccess`、`aiAccessLevel`、`status`。
- 已阅读 `docs/architecture/auth-permission-model.md`。

## 3. 改动范围

### 允许改动

- `server/middleware/auth.ts`
- `middleware/auth.global.ts`
- `server/utils/auth*`
- `server/utils/permission*`
- `/api/auth/**`
- `/api/admin/users/**`
- 用户管理页面，若已有。

### 禁止改动

- 不接入 Hermes 执行能力。
- 不开放 `/ai` 给未登录访客。
- 不允许远程 owner 获得本地最高权限。

## 4. 权限核心函数

建议实现以下纯函数或服务函数：

```ts
getRequestUser(event): Promise<AuthUser | null>
requireLogin(event): Promise<AuthUser>
requireAdmin(event): Promise<AuthUser>
getAccessOrigin(event): 'local_trusted' | 'remote_owner' | 'remote_user' | 'public'
canAccessAi(user, levelRequired): boolean
canManageUser(actor, targetUser, origin): boolean
canPerformDangerousOperation(actor, origin, operation): boolean
```

## 5. 本地可信来源判定

第一版建议支持配置：

```env
LOCAL_TRUSTED_CIDRS=127.0.0.1/32,192.168.0.0/16,10.0.0.0/8
LOCAL_TRUSTED_HEADER=
```

注意：不要盲目信任客户端传来的 header。只有 Nginx 内部注入且来源可信时才可用。

## 6. 用户分组规则

`groups` 使用 JSON 字符串：

```json
["family", "close-friends"]
```

内置分组建议：

```text
family
close-friends
friends
```

## 7. AI 权限规则

```text
aiAccess=false → 不能访问 /ai
aiAccessLevel=chat → 普通问答
aiAccessLevel=limited → 可基于授权内容问答
aiAccessLevel=owner → 你本人远程助手能力，但无高危操作
```

## 8. 执行步骤

1. 新增权限工具函数。
2. 更新 auth/me 返回字段，但不要泄露敏感字段。
3. 新增用户管理 API 支持设置 groups、aiAccess、aiAccessLevel、uploadQuotaMb。
4. 更新服务端中间件：禁用 disabled 用户。
5. 在所有 admin API 中使用统一权限函数。
6. 添加权限单元测试或最小验证脚本。

## 9. 验收标准

- disabled 用户无法登录或无法访问受保护接口。
- 未登录用户不能访问 `/ai`。
- 登录但未授权用户不能访问 `/ai`。
- aiAccess=true 的用户可以访问 `/ai`，但不能执行 Hermes 工具。
- 远程 owner 不能调用本地最高权限接口。
- 本地可信来源逻辑有测试覆盖。

## 10. 回滚方案

- 回滚权限工具与 API 改动。
- 保留数据库新增字段不影响旧功能。

## 11. Agent 注意事项

- 不允许通过前端隐藏按钮代替后端权限判断。
- 不允许仅凭 `role=admin` 允许删除、shell、skill 修改等高危操作。
