# Personal Website V2 文档包

> 用途：给人类、Hermes、Codex/代码代理共同阅读，作为后续重构、编码、审核和运维的上下文。

## 推荐放置位置

建议把整个 `todo/` 目录复制到项目根目录：

```text
your-project/
├── AGENTS.md
├── HERMES.md
├── CODEX.md
└── your-project/
    ├── 00-index.md
    ├── 01-overall-architecture.md
    ├── 02-current-to-target-adjustments.md
    ├── agent-context/
    ├── architecture/
    ├── design/
    ├── implementation/
    └── operations/
```

三个根级文件用途：

- `AGENTS.md`：通用代码代理默认读取的项目规则。
- `CODEX.md`：Codex 或代码生成工具专用上下文。
- `HERMES.md`：Hermes 专用上下文、权限边界和任务规则。

## 阅读顺序

1. `todo/00-index.md`
2. `todo/01-overall-architecture.md`
3. `todo/02-current-to-target-adjustments.md`
4. `AGENTS.md`
5. `HERMES.md` / `CODEX.md`
6. `todo/architecture/*.md`
7. `todo/design/*.md`
8. `todo/implementation/*.md`
9. `todo/operations/*.md`

## 文档分层

- 总体文档：说明系统目标、边界、原则。
- 架构文档：说明各子系统如何协作。
- 设计文档：说明数据模型、API、页面、目录结构。
- 实施文档：说明函数职责、代码约束、验证方式。
- 运维文档：说明部署、备份、同步、告警、回滚。

## 任务拆分文档

新增的可执行任务文档位于：

```text
todo/tasks/
```

推荐从以下文件开始：

```text
todo/tasks/00-task-index.md
todo/tasks/README.md
```

这些文档用于给 Codex/Hermes 提供逐阶段代码实现上下文和验收约束。


## 新增：Git / GitHub 版本控制规则

- `todo/implementation/git-version-control-governance.md`：说明哪些内容必须进 GitHub，哪些真实数据必须留在本地或备份介质。
