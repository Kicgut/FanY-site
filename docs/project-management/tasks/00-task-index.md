---
title: "任务拆分总索引"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# 任务拆分总索引

本目录把架构设计拆成可交给 Codex / Hermes / 人工执行的阶段任务。每个任务文档都遵循同一结构：目标、前置条件、改动范围、执行步骤、验收标准、禁止事项、回滚方案。

## 推荐执行顺序

1. `01-foundation-docs-and-rules.md`：先落地项目规则、目录与上下文加载顺序。
2. `02-database-permission-migration.md`：升级数据模型，建立权限基础。
3. `03-auth-user-groups.md`：用户、分组、AI 访问权限和本地/远程权限分级。
4. `04-photo-review-workflow.md`：照片上传、待审核、批准、拒绝、要求修改。
5. `05-photo-storage-sync.md`：本地原图、ECS 缩略图、同步状态、归档预留。
6. `06-admin-ui-upgrade.md`：后台照片、用户、审核、任务、存储页面。
7. `07-ai-gateway-hermes-safe-chat.md`：受限 `/ai` 与 Hermes Gateway。
8. `08-content-pipeline.md`：对话/Markdown 输入、整理、候选、审核、发布。
9. `09-skill-registry-readonly.md`：Hermes Skill 远程查看、状态、使用统计。
10. `10-local-admin-high-trust.md`：本地最高权限与高危操作保护。
11. `11-operations-observability.md`：部署、备份、告警、日志、审计。
12. `12-final-integration-acceptance.md`：整体验收与上线前检查。
13. `13-photo-status-sync-policy.md`：照片状态变更时联动 ECS 同步策略。
14. `14-user-upload-resubmit.md`：用户上传功能（我的上传 + 重新提交）。

## Agent 执行规则

- Codex 在改代码前必须读取根目录 `AGENTS.md`、`CODEX.md`，再读取本任务文档。
- Hermes 在执行整理、生成、归档前必须读取根目录 `HERMES.md`，再读取本任务文档。
- 每个任务必须小步提交，不允许一次性重构多个子系统。
- 涉及权限、安全、删除、文件移动、公开发布的变更必须先实现测试或验证脚本。
- 所有未确认决策必须写入 `docs/agent-context/templates/decision-log-template.md` 的副本，不允许在代码中静默假设。

## 状态标记

建议在任务文档顶部或项目看板中使用以下状态：

```text
not_started
in_progress
blocked
implemented
verified
rolled_back
```

## 交付物命名

每个阶段完成后建议产出：

```text
docs/agent-context/decisions/YYYY-MM-DD-phase-N.md
docs/agent-context/implementation-notes/YYYY-MM-DD-phase-N.md
docs/agent-context/verification/YYYY-MM-DD-phase-N.md
```
