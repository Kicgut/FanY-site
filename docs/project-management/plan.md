---
title: "当前项目计划与文档导航"
created: 2026-07-04 00:00
updated: 2026-07-15 23:29
status: active
purpose: "提供当前项目状态、下一步工作和文档入口；不重复维护具体架构细节。"
scope: "全项目"
related:
  - path: "README.md"
    relation: "index"
  - path: "tasks/00-task-index.md"
    relation: "execution-plan"
  - path: "plans/00-index.md"
    relation: "target-design"
tags:
  - project-management
  - roadmap
---

# 当前项目计划与文档导航

## 当前事实

- Nuxt 3、Vue 3、TypeScript、Prisma、SQLite 和 JWT 主体已在 `nuxt-app/` 中运行。
- 内容流水线已完成候选、审核、草稿投影、AI 归档、inbox/raw 处理和 Job API；限制见 `../architecture/content-pipeline.md`。
- Conda 部署环境见 `../deployment/development-environment.md`，环境文件为根目录 `environment.yml`。
- 任务 13、14 仍未开始；Phase 8 仍需真实认证端到端验收和多实例调度方案。

## 下一步顺序

1. 完成照片状态与 ECS 同步策略：`tasks/13-photo-status-sync-policy.md`。
2. 完成用户上传查看与重新提交：`tasks/14-user-upload-resubmit.md`。
3. 执行 `tasks/12-final-integration-acceptance.md` 的整体验收。
4. 将验收结果写入 `../agent-context/verification/`，并同步更新架构和任务文档。

## 文档入口

| 目的 | 入口 |
| --- | --- |
| 所有文档 | `../README.md` |
| 当前架构 | `../architecture/` |
| 设计规范 | `../design/` |
| 实现和安全规范 | `../implementation/` |
| 运维和部署 | `../operations/`、`../deployment/` |
| 执行任务 | `tasks/` |
| 目标方案 | `plans/` |
| 待办项 | `backlog.md` |
