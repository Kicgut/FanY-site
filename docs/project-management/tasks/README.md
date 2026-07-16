---
title: "Codex / Hermes 可执行任务目录"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Codex / Hermes 可执行任务目录

本目录用于把架构设计拆成可执行工程任务。建议每次只交给 Codex 一个 Phase 文档，避免一次性跨多个子系统重构。

## 给 Codex 的推荐提示词模板

```text
请先阅读 AGENTS.md、CODEX.md、docs/README.md，以及 docs/project-management/tasks/XX-xxx.md。
只实现该任务文档允许范围内的内容。
不要扩大范围。
实现前请列出你将修改的文件。
实现后请给出验证步骤、风险和未完成项。
```

## 给 Hermes 的推荐提示词模板

```text
请先阅读 HERMES.md、docs/README.md，以及 docs/project-management/tasks/XX-xxx.md。
你只负责整理、生成文档、生成候选内容或生成执行计划。
不要直接修改源代码、不要执行高危命令、不要发布公开内容。
```

## 阶段列表

- `01-foundation-docs-and-rules.md`
- `02-database-permission-migration.md`
- `03-auth-user-groups.md`
- `04-photo-review-workflow.md`
- `05-photo-storage-sync.md`
- `06-admin-ui-upgrade.md`
- `07-ai-gateway-hermes-safe-chat.md`
- `08-content-pipeline.md`
- `09-skill-registry-readonly.md`
- `10-local-admin-high-trust.md`
- `11-operations-observability.md`
- `12-final-integration-acceptance.md`
- `13-photo-status-sync-policy.md`
- `14-user-upload-resubmit.md`
