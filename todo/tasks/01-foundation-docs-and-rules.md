# Phase 1：项目规则、文档与上下文加载基础

## 1. 任务目标

把文档包正式接入项目，使 Hermes、Codex、人工开发者在写代码前有统一上下文、统一边界和统一禁止事项。

## 2. 前置条件

- 已把文档包解压到项目根目录。
- 项目根目录存在 Nuxt 代码。
- 人工确认是否采用以下命名：`AGENTS.md`、`HERMES.md`、`CODEX.md`。

## 3. 改动范围

### 允许改动

- 根目录文档：`AGENTS.md`、`HERMES.md`、`CODEX.md`。
- `docs/**`。
- `README.md` 中增加文档入口。
- 可新增 `.agentignore`、`.codexignore`、`.hermesignore`，如果项目工具支持。

### 禁止改动

- 不改业务代码。
- 不改数据库。
- 不改部署配置。
- 不移动现有源码目录。

## 4. 执行步骤

1. 将文档包放入项目根目录。
2. 确认根目录存在：
   - `AGENTS.md`
   - `HERMES.md`
   - `CODEX.md`
3. 确认 `docs/00-index.md` 能导航到所有设计文档。
4. 在项目 `README.md` 中增加“架构与 Agent 文档入口”。
5. 新增 `docs/agent-context/decisions/`、`implementation-notes/`、`verification/` 目录。
6. 要求 Agent 每次实现前写入本次读取的文档列表。

## 5. 验收标准

- Codex 能从 `AGENTS.md` 得到项目总规则。
- Hermes 能从 `HERMES.md` 得到安全边界和内容流水线规则。
- 人工能从 `docs/00-index.md` 找到所有子系统文档。
- 文档明确禁止远程删除、远程 shell、公开暴露 Hermes WebUI。

## 6. 验证方式

执行：

```bash
find . -maxdepth 3 -name '*.md' | sort
```

检查：

- 文档命名正确。
- 没有重复冲突的规则文档。
- `AGENTS.md`、`HERMES.md`、`CODEX.md` 不为空。

## 7. 回滚方案

- 删除新增文档目录。
- 恢复原 `README.md`。
- 不影响业务数据。

## 8. Agent 注意事项

- 不允许为了“更方便”改代码。
- 不允许把文档中的默认建议直接当成已确认事实；未确认项必须记录。
