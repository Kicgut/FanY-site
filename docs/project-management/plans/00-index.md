---
title: "00-index - 文档索引"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: draft
purpose: "记录目标设计和待完成方案，不代表当前代码已经实现。"
scope: "全项目"
related: []
tags:
  - project-management
---
# 目标方案索引

## 总体文档

- `01-overall-architecture.md`：新版目标架构设计。
- `02-current-to-target-adjustments.md`：与当前架构相比的目标调整。

## Agent 上下文

- `../../../AGENTS.md`：通用代码代理规则。
- `../../../HERMES.md`：Hermes 专用规则。
- `../../../CODEX.md`：Codex 专用规则。
- `../../agent-context/templates/context-loading-order.md`：推荐读取顺序。
- `../../agent-context/templates/decision-log-template.md`：决策记录模板。

## 架构部分

目标架构草案位于 `architecture/`；当前实现优先查看 `../../architecture/`。

## 设计部分

设计草案已迁移到 `../../design/`，对应实现以代码和当前架构文档为准。

## 实施部分

实施规范已迁移到 `../../implementation/`。

## 运维部分

运维方案已迁移到 `../../operations/`。

---

## 可执行任务拆分

任务拆分文档位于：

```text
docs/project-management/tasks/
```

建议执行顺序见：

```text
docs/project-management/tasks/00-task-index.md
```

模板位于：

```text
docs/templates/task-spec-template.md
```


## Git / GitHub 协作规则

- `docs/implementation/git-version-control-governance.md`：Git/GitHub 版本控制、多人协作、真实数据排除规则。
