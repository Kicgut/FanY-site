---
title: "Hermes AI Gateway 架构"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: draft
purpose: "记录目标设计和待完成方案，不代表当前代码已经实现。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Hermes AI Gateway 架构

## 1. 目标

允许登录用户访问 `/ai`，同时防止任何人通过对话控制本地设备。

## 2. 访问策略

`/ai` 不对普通访客开放。

访问条件：

```text
logged in
user.status = active
user.aiAccess = true
```

## 3. Gateway 原则

前端绝不直接连接 Hermes 主实例。

```text
/ai
→ Nuxt API /api/ai/chat
→ hermes-gateway
→ selected safe profile
→ response
```

## 4. Profile

### public_chat

给被授权普通用户。

- 只能聊天。
- 无工具。
- 无文件写入。
- 无 shell。
- 不访问私人内容。

### owner_remote

给你远程使用。

- 可整理内容。
- 可生成候选草稿。
- 可查看任务结果。
- 不可删除。
- 不可执行 shell。
- 不可改 skill。

### local_admin

仅本地可信访问。

- 完整 Hermes 能力。
- 可执行脚本。
- 可管理 skill。
- 可运行本地模型。

## 5. API

```text
POST /api/ai/chat
GET  /api/ai/sessions
GET  /api/admin/hermes/jobs
POST /api/admin/hermes/jobs
GET  /api/admin/hermes/conversations
```

## 6. 安全禁止项

- 不暴露 Hermes WebUI 到公网。
- 不允许用户传入任意 system prompt。
- 不允许模型调用 shell。
- 不允许模型读取 arbitrary local files。
- 不允许模型直接发布内容。
- 不允许模型修改 skill。

## 7. 审计

记录：

- userId。
- profile。
- prompt hash 或摘要。
- token usage，如可用。
- 是否触发拒绝。
- createdAt。

敏感内容日志要可配置脱敏。
