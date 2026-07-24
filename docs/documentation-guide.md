---
title: 项目文档维护指南
updated: 2026-07-24
status: current
---

# 项目文档维护指南

本指南说明“改动发生后，应该更新哪份文档”。强制规则以 [AGENTS.md](AGENTS.md) 为准。

## 1. 更新顺序

1. 先以代码、迁移、测试和生产状态确认事实。
2. 修改当前架构或相关模块架构；必要时更新版本记录。
3. 修改受影响的设计、运维或工程规范。
4. 若仍有未完成事项，更新 `planning/backlog.md`；完成、取消或被替代的事项立即删除。
5. 修复所有相对链接，并检查文档入口。

## 2. 按改动类型定位

| 改动 | 必须检查的文档 |
| --- | --- |
| 模块边界、数据流、权限、部署拓扑 | `architecture/current-architecture.md` 与相关模块架构 |
| API、Prisma 模型、页面、审核状态 | `design/` 对应文档 |
| 发布、迁移、备份、FRP、同步、监控 | `operations/` 对应手册 |
| 代码约束、安全、测试、Git 协作 | `governance/` 对应规则 |
| 学习总结 | 当前 `learning-notes/vN/` 中新增或更新主题 |

## 3. 三类文档的关系

| 类型 | 回答的问题 | 状态 | 典型内容 |
| --- | --- | --- | --- |
| Architecture | 系统怎样组织和协作？ | 当前事实或精简历史 | 模块边界、服务关系、数据流、权限边界、部署拓扑 |
| Design | 每个模块具体怎样实现？ | 当前有效约定 | API、数据模型、页面、状态流转、目录约定 |
| Plan | 尚未实施的大改动怎样完成？ | 临时、未实施 | 目标版本、迁移步骤、取舍、风险、验收、回滚 |

通常先确定 Architecture，再细化 Design，最后实施、测试和更新 Operations。若改动没有改变系统边界，例如已有 API 的字段、页面交互或输入校验，则直接更新 Design；Plan 只用于尚未实施且会改变架构边界的大改动。

Plan 完成后不能继续作为当前说明：把已实施内容合并进 Architecture 和 Design，更新 Operations，随后删除 Plan。当前事实永远不以 Plan 为准。

## 4. 架构版本操作

### 小更新

直接更新当前架构或当前模块文档，在 `current-architecture.md` 末尾写明变更、日期和下一个补丁版本。例如 `v3.0.0` 完成缩略图修复后，下一次小变更写为 `v3.0.1`。

### 大更新

仅当系统边界、跨主机数据流、权限模型、核心数据模型或部署拓扑发生变化时，创建 `architecture/plan-architecture.md`。实施完成后，将内容合并到当前架构，将上一主版本压缩为 `architecture/history/vX.0.md` 的总体摘要，再删除计划文档。

## 5. 删除而非归档

本项目不为完成的 tasks、plans、实施记录、验证记录建立 archive。删除前确认其中仍有效的信息已进入当前架构、设计、运维或治理文档；Git 历史仍可追溯原文。

## 6. 提交前检查

```powershell
rg -n "project-management|agent-context|docs/deployment|docs/implementation" docs README.md
git diff --check
git status --short
```

搜索结果中的历史学习链接应改为当前入口，或明确标注为历史背景。提交信息应说明文档事实发生了什么变化，而不是只写“update docs”。
