# 00-index - 文档索引

## 总体文档

- `01-overall-architecture.md`：新版完整架构设计。
- `02-current-to-target-adjustments.md`：与当前架构相比的明确调整。

## Agent 上下文

- `../AGENTS.md`：通用代码代理规则。
- `../HERMES.md`：Hermes 专用规则。
- `../CODEX.md`：Codex 专用规则。
- `agent-context/context-loading-order.md`：推荐读取顺序。
- `agent-context/decision-log-template.md`：决策记录模板。

## 架构部分

- `architecture/auth-permission-model.md`
- `architecture/photo-asset-system.md`
- `architecture/hermes-ai-gateway.md`
- `architecture/content-pipeline.md`
- `architecture/hermes-skill-registry.md`
- `architecture/portfolio-blog-gallery.md`
- `architecture/admin-system.md`
- `architecture/ecs-local-frp-storage.md`

## 设计部分

- `design/data-models-prisma.md`
- `design/api-contracts.md`
- `design/frontend-pages.md`
- `design/directory-structure.md`
- `design/review-workflows.md`

## 实施部分

- `implementation/function-responsibilities.md`
- `implementation/coding-constraints.md`
- `implementation/security-validation.md`
- `implementation/testing-checklist.md`
- `implementation/rollout-plan.md`

## 运维部分

- `operations/deploy-backup-restore.md`
- `operations/storage-sync-archive.md`
- `operations/monitoring-alerting.md`

---

## 可执行任务拆分

任务拆分文档位于：

```text
docs/tasks/
```

建议执行顺序见：

```text
docs/tasks/00-task-index.md
```

模板位于：

```text
docs/task-templates/task-spec-template.md
```


## Git / GitHub 协作规则

- `docs/implementation/git-version-control-governance.md`：Git/GitHub 版本控制、多人协作、真实数据排除规则。
