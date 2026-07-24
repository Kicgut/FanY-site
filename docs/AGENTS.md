# Docs Agent Rules

本文件规定人在维护文档、Codex/Hermes 等 Agent 修改本目录时必须遵守的规则。

## 1. 真实性优先级

发生冲突时，按以下顺序判断事实：

1. 已验证的代码、Prisma schema、迁移与生产运行状态；
2. `architecture/current-architecture.md` 及当前模块架构文档；
3. `design/`、`operations/`、`governance/` 中仍标记为 current 的规则；
4. `planning/backlog.md`；
5. `architecture/history/` 与 `learning-notes/`。

历史文档和学习笔记不得被用作当前实现依据。

## 2. 必读路径

- 改动业务边界、数据流、权限或部署拓扑：先读 `architecture/current-architecture.md` 和相关模块架构文档。
- 改 API、模型、页面或审核规则：再读 `design/` 对应文件。
- 改部署、备份、FRP、同步、监控或恢复：再读 `operations/` 对应手册。
- 改代码规范、安全、测试或协作流程：再读 `governance/` 对应文件。

## 3. architecture/ 规范

`architecture/` 是唯一允许保留架构历史的目录。每份架构 Markdown 顶部必须包含 `version`、`status` 和 `updated`（历史摘要使用 `period`）。

### Architecture、Design 与 Plan 的边界

- **Architecture** 回答“系统如何组织”：模块边界、服务关系、跨主机数据流、权限边界、核心数据流与部署拓扑。它描述已经实现且核对过的事实，当前入口始终是 `current-architecture.md`。
- **Design** 回答“模块如何落地”：API 合同、Prisma 数据模型、页面职责、审核状态、内容模型与目录约定。它只能在既定架构边界内细化实现，不得用设计文档悄悄改变系统边界。
- **Plan** 回答“尚未实施的大改动如何从当前状态到达目标”：目标版本、范围、取舍、迁移步骤、风险、验收和回滚。Plan 不是当前事实，不能替代 Architecture 或 Design。

默认顺序为：需求或问题 → Architecture（若系统边界变化）→ Design → 实现与测试 → Operations。已有架构内的 API、字段、页面或校验小改动可直接从 Design 开始；纯运行步骤变更直接更新 Operations。

- `current-architecture.md` 是当前总体架构的唯一入口，复杂功能可拆分为同级的当前详细文档，例如 `photo-system.md`、`content-pipeline.md`。
- 当前详细文档必须与 `current-architecture.md` 使用相同的大版本，并在底部注明其版本记录规则。
- 小变更不新建架构文件：直接更新受影响的当前文档，在 `current-architecture.md` 底部追加“架构更新记录”，补丁版本递增，例如 `v3.0.0` → `v3.0.1`。
- 只有改变模块边界、跨主机数据流、权限模型、核心数据模型或部署拓扑的改动，才可新建临时 `plan-architecture.md`。该文件必须写明目标版本、范围、取舍和验收条件。
- 大变更完成后：将已实施设计合并到当前架构；把上一主版本的总体摘要写到 `history/vX.0.md`；删除 `plan-architecture.md`。不得把已完成计划长期保留在目录中。
- `history/` 只记录总体架构与关键变更，禁止复制当前模块的长篇操作细节。

## 4. 非架构文档规范

- `design/`：只写当前有效的 API、数据、页面、内容与工作流约定。
- `operations/`：只写可执行且经验证的运行手册；命令变更后必须同步更新。
- `governance/`：只写当前强制或推荐的工程规则。
- `planning/`：只保留未完成且仍有价值的事项。完成、取消或被替代后立即从 backlog 删除或改写。
- `learning-notes/`：按 v1、v2、v3 等阶段持续记录学习过程；它们可以保留历史，但必须说明不作为当前事实来源。
- 不建立通用 archive。已完成的 tasks、plans、实施笔记、验证记录和重复问题日志，在其有效信息被吸收后删除。

## 5. 每次文档改动的最低要求

1. 更新受影响文档的 `updated` 日期和版本（若适用）。
2. 修复仓库内 Markdown 相对链接；不得保留指向已删除目录的链接。
3. 不在当前文档中保留“待完成”描述，除非它仍在 `planning/backlog.md` 中。
4. 提交前执行链接/陈旧路径扫描，并检查 `git diff` 确认没有误删仍有效的运行说明。
