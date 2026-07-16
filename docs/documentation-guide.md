---
title: "项目文档使用指南"
created: 2026-07-16 00:00
updated: 2026-07-16 00:00
status: active
purpose: "说明各文档目录的职责、修改顺序和使用逻辑，避免把计划、设计和当前实现混淆。"
scope: "全项目"
related:
  - path: "README.md"
    relation: "documentation-index"
  - path: "project-management/tasks/00-task-index.md"
    relation: "task-index"
tags:
  - documentation
  - workflow
  - project-management
---

# 项目文档使用指南

## 一、先记住这条主线

```text
项目管理任务 → 设计契约 → 架构边界 → 实现规则 → 代码修改 → 部署运行 → 验证记录 → 回写任务状态
```

各目录不是平级的资料分类，而是同一项工作的不同阶段。

## 二、各目录的职责

| 目录 | 核心问题 | 应该放什么 | 不应该放什么 |
| --- | --- | --- | --- |
| `architecture/` | 系统由什么组成、如何协作 | 当前架构、模块边界、数据流、安全不变量 | 临时任务、具体部署命令 |
| `design/` | 功能具体准备怎么做 | 数据模型、API、页面、审核流程、目录设计 | 已验证的运行结果 |
| `implementation/` | 代码必须遵守什么规则 | 安全、测试、职责、发布、Git 约束 | 某次功能的进度记录 |
| `deployment/` | 如何安装、运行和恢复 | Conda、Docker、Nginx、frp、备份、上线手册 | 业务设计和任务规划 |
| `project-management/` | 做什么、先做什么、完成了吗 | tasks、plans、backlog、history | 代码级实现细节 |
| `agent-context/` | 这次实际做了什么、验证了什么 | decision、implementation-note、verification | 长期架构规范 |
| `learning-notes/` | 学习和复盘 | 教学笔记、历史经验 | 当前系统的唯一事实 |

当前代码事实优先参考：

```text
代码实现 > docs/architecture/current-implementation.md > docs/agent-context/implementation-notes/ > docs/project-management/plans/
```

计划文档只代表目标，不代表功能已经存在。

## 三、修改文档的标准顺序

### 1. 先处理任务

进入 `docs/project-management/tasks/`：找到对应任务并确认范围；没有任务时先新增任务；同步状态、验收标准和禁止事项。

常用状态：

```text
not_started → in_progress → implemented → verified
                         ↘ blocked
```

### 2. 再处理设计

根据改动类型修改 `docs/design/`：数据库改 `data-models-prisma.md`，API 改 `api-contracts.md`，页面改 `frontend-pages.md`，审核和状态改 `review-workflows.md`，目录改 `directory-structure.md`。

设计文档描述“应该怎么做”，不应把未实现内容写成已完成。

### 3. 需要时更新架构

只有模块边界、数据流、部署拓扑或安全边界变化时，才更新 `docs/architecture/`。

### 4. 检查实现规则

如果涉及新的权限、路径、测试、迁移或 Git 规则，更新 `docs/implementation/`。普通代码修改不需要修改实现规范。

### 5. 修改代码并验证

将实际改动写入 `docs/agent-context/implementation-notes/`，将命令、环境、结果和警告写入 `docs/agent-context/verification/`。数据库变更验证 Prisma schema/migration；TypeScript 变更执行 `pnpm exec tsc --noEmit`；页面、路由或服务变更执行 `pnpm build`。

### 6. 最后处理部署文档

只有运行方式发生变化时才修改 `docs/deployment/`，例如 Node、pnpm、Conda、环境变量、Docker、Nginx、frp、迁移、备份、恢复或回滚流程变化。

### 7. 回写状态

最后同步任务状态、Backlog、架构实现状态和相关索引链接。

## 四、按改动类型快速判断

| 改动 | 首先修改 | 可能还要修改 |
| --- | --- | --- |
| 新功能计划 | `project-management/tasks/` | `plans/` |
| Prisma 字段或模型 | `design/data-models-prisma.md` | architecture、migration、verification |
| API 请求或响应变化 | `design/api-contracts.md` | architecture、代码、测试 |
| 页面交互变化 | `design/frontend-pages.md` | 代码、verification |
| 审核状态变化 | `design/review-workflows.md` | architecture、AGENTS/HERMES |
| 安全规则变化 | `implementation/security-validation.md` | AGENTS/CODEX/HERMES |
| 部署命令变化 | `deployment/` | environment、verification |
| 只记录进度 | `project-management/` | 通常不改 design/architecture |
| 只记录学习过程 | `learning-notes/` | 不作为当前实现依据 |

## 五、推荐阅读顺序

### 日常开发

```text
AGENTS.md → CODEX.md 或 HERMES.md → docs/README.md → current-implementation.md → 对应 task → 对应 design
```

### 部署或验证

```text
AGENTS.md → docs/README.md → docs/deployment/development-environment.md → 对应 deployment 手册 → verification 记录
```

### 了解目标方向

```text
docs/project-management/plan.md
docs/project-management/plans/00-index.md
对应 architecture/design 草案
```

## 六、是否可以进一步精简？

可以，但当前项目不建议再次大规模迁移。个人项目最精简的结构可以是：

```text
docs/
├── README.md                 # 唯一入口
├── architecture/             # 当前架构 + 设计契约
├── operations/               # 部署和运维
├── project-management/       # 任务、计划、Backlog
├── agent-context/             # 决策、实现、验证记录
└── learning-notes/            # 学习资料
```

当前保留 `design/` 和 `implementation/` 的好处是：数据/API 设计不会和当前架构事实混在一起，安全/测试/Git 规则也能被 Codex 和人工开发者单独复用。

因此日常只需要记住：

```text
任务 → 设计 → 架构 → 代码 → 部署 → 验证
```

需要查具体目录时打开 `docs/README.md` 和本指南。
