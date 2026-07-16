---
title: "项目文档入口"
created: 2026-07-15 00:00
updated: 2026-07-15 23:29
status: active
purpose: "统一项目架构、设计、实现、运维、学习记录和执行计划的入口。"
scope: "全项目"
related: []
tags:
  - documentation
  - project-management
---

# 项目文档入口

## 阅读顺序

1. 根目录 `AGENTS.md`：所有代码代理的安全与项目边界。
2. `CODEX.md` 或 `HERMES.md`：按工具读取专用约束。
3. 本页对应的当前架构文档。
4. `docs/project-management/tasks/`：执行任务和验收标准。
5. `docs/project-management/plans/`：目标设计、路线和仍未完成的计划。

## 目录职责

| 目录 | 内容 | 权威性 |
| --- | --- | --- |
| `architecture/` | 当前系统架构和已确认的子系统说明 | 当前实现优先 |
| `design/` | 数据模型、API、页面、目录和审核设计 | 设计基线 |
| `implementation/` | 编码约束、安全、测试、发布和 Git 规则 | 开发规范 |
| `operations/` | 部署、备份、监控、同步和恢复 | 运维规范 |
| `deployment/` | 可直接执行的环境、部署和网络操作手册 | 操作手册 |
| `project-management/tasks/` | 分阶段任务、验收标准和完成状态 | 执行跟踪 |
| `project-management/plans/` | 尚未完全落地的目标方案和路线 | 计划，不代表已实现 |
| `project-management/history/` | 历史规划和阶段记录 | 只读历史 |
| `agent-context/` | 实现笔记、决策记录和验证记录 | 上下文记录 |
| `learning-notes/` | 教学和阶段复盘 | 学习资料 |
| `templates/` | 可复制的任务和文档模板 | 模板 |

## 文档状态

- `active`：当前使用中的入口或规范。
- `final`：已确认的稳定文档，但仍可能随代码变更更新。
- `draft`：方案或设计草稿，不代表已经实现。
- `archived`：历史记录或被替代的文档。

每个 Markdown 文档都应以 YAML frontmatter 开始，至少包含 `title`、`created`、`updated`、`status`、`purpose`、`scope`、`related` 和 `tags`。`created`、`updated` 使用 `YYYY-MM-DD HH:mm`，精确到分钟。

## 当前实现与计划的区别

架构文档描述当前代码时，以 `docs/architecture/current-implementation.md` 和对应实现笔记为准；计划文档只用于追踪未完成工作。新增或完成一项功能后，同时更新对应任务状态、实现笔记和相关索引。
