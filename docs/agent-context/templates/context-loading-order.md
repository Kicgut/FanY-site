---
title: "Agent Context Loading Order"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - agent-context
---
# Agent Context Loading Order

代码代理或 Hermes 执行任务前，建议按以下顺序读取上下文：

1. `AGENTS.md`
2. `HERMES.md` 或 `CODEX.md`
3. `docs/01-overall-architecture.md`
4. `docs/02-current-to-target-adjustments.md`
5. 与任务相关的 `docs/architecture/*.md`
6. 与任务相关的 `docs/design/*.md`
7. `docs/implementation/coding-constraints.md`
8. `docs/implementation/security-validation.md`

## 任务类型到文档映射

### 照片相关

- `architecture/photo-asset-system.md`
- `architecture/auth-permission-model.md`
- `design/data-models-prisma.md`
- `design/api-contracts.md`
- `design/review-workflows.md`

### Hermes 相关

- `architecture/hermes-ai-gateway.md`
- `architecture/content-pipeline.md`
- `architecture/hermes-skill-registry.md`
- `HERMES.md`

### 后台页面相关

- `architecture/admin-system.md`
- `design/frontend-pages.md`
- `implementation/function-responsibilities.md`

### 部署运维相关

- `architecture/ecs-local-frp-storage.md`
- `operations/deploy-backup-restore.md`
- `operations/storage-sync-archive.md`
- `operations/monitoring-alerting.md`
