---
title: "项目管理文档入口"
created: 2026-07-05 00:00
updated: 2026-07-15 23:29
status: active
purpose: "说明项目计划、任务、backlog 和历史记录的组织方式。"
scope: "项目管理"
related:
  - path: "../README.md"
    relation: "index"
tags:
  - project-management
---

# 项目管理文档入口

## 当前目录

- `tasks/`：可执行任务和验收标准，状态由任务文档维护。
- `plans/`：目标架构、设计路线和未完成方案，不等同于当前实现。
- `backlog.md`：跨阶段待办和改进项。
- `history/`：历史规划与阶段记录，只用于追溯。

## 开发时的判断规则

先以代码和 `docs/architecture/` 判断当前事实，再以 `tasks/` 判断待完成工作，最后参考 `plans/` 了解目标方向。完成一项任务时更新任务状态、实现笔记和验证记录。

## 相关入口

- 总文档入口：`../README.md`
- 文档使用指南：`../documentation-guide.md`
- 任务总索引：`tasks/00-task-index.md`
- 目标方案索引：`plans/00-index.md`
- 环境部署：`../deployment/development-environment.md`
