---
title: 项目文档入口
updated: 2026-07-24
status: current
---

# 项目文档入口

文档按“当前事实优先、历史最少保留”组织。阅读和维护规则见 [AGENTS.md](AGENTS.md) 与 [documentation-guide.md](documentation-guide.md)。

## 从哪里开始

- 了解当前系统：[`architecture/current-architecture.md`](architecture/current-architecture.md)
- 运行或维护生产：[`operations/`](operations/)
- 修改接口、模型或页面：[`design/`](design/)
- 遵守工程与安全规则：[`governance/`](governance/)
- 查看真正未完成的事项：[`planning/backlog.md`](planning/backlog.md)
- 了解学习过程：[`learning-notes/`](learning-notes/)

## 目录职责

| 目录 | 内容 | 是否作为当前事实来源 |
| --- | --- | --- |
| `architecture/` | 当前总体/模块架构及精简的总体版本历史 | 是；历史版本除外 |
| `design/` | 当前 API、数据、页面与工作流约定 | 是 |
| `operations/` | 部署、备份、同步、监控与恢复手册 | 是 |
| `governance/` | 代码、安全、测试与协作规范 | 是 |
| `planning/` | 唯一的未完成工作入口 | 是 |
| `learning-notes/` | 分阶段学习记录 | 否 |
| `templates/` | 可复用模板 | 否 |

完成的任务、计划、验收记录和重复方案不保留为归档；其仍有价值的信息应被合并进当前文档或架构版本记录。
