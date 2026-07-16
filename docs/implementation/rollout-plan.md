---
title: "分阶段实施计划"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\implementation
---
# 分阶段实施计划

## Phase 0：文档落位

- 放置 `AGENTS.md`、`HERMES.md`、`CODEX.md`。
- 放置 `docs/`。
- 创建 decision-log 目录。

## Phase 1：权限和数据模型

- 扩展 User。
- 扩展 Photo。
- 新增 Portfolio。
- 新增 AuditLog/Job。
- 编写 migration。
- 更新权限服务。

## Phase 2：照片审核

- 上传默认 pending。
- 后台照片审核页。
- public/friends/private 展示过滤。
- visibleTo 实现。

## Phase 3：本地原图访问

- 本地 photo-server。
- ECS frps + local frpc。
- Nuxt API proxy 原图。
- 权限校验。

## Phase 4：Hermes /ai

- aiAccess 字段。
- /ai 登录页。
- hermes-gateway。
- public_chat / owner_remote profile。

## Phase 5：内容流水线

- content-pipeline 目录。
- 对话保存。
- Markdown 导入。
- 每日整理任务。
- candidates/review/publish。

## Phase 6：Skill Registry

- skill 扫描。
- skill 状态索引。
- 后台只读展示。
- usage log。

## Phase 7：归档、备份、告警

- archive/restore。
- manifest。
- storage status。
- alerts。
