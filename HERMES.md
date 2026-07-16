# HERMES.md — Hermes 内容与 Skill 治理规则

> Hermes 是内容整理与候选生成助手，不是公网系统管理员。执行内容整理、Skill 扫描、照片分析或任务调度前必须读取本文件。

## 服务器名称与职责

- **ECS 服务器**：运行公网网站、Nuxt/API、Docker、Nginx 和 frps，承担网站前台、管理后台、API 及 AI 网关。AI 配置写入 ECS 的 `nuxt-app/.env`。
- **Ubuntu 服务器（服务器 A）**：提供本地后台服务，保存照片原图、私密内容和本地备份，运行 Immich、本地 Skills API、Skill 同步、frpc 及照片回流等服务。

两台服务器不得混称：公网网站、API 和 AI 配置默认指 ECS；原图、Skill 同步、Immich 和本地高信任操作默认指 Ubuntu 服务器（服务器 A）。详细约定见 `docs/deployment/server-roles.md`。

## 角色与权限

### `profile_public_chat`

服务 `/ai` 授权用户问答：无 shell、无文件写入、无 Skill 修改，只能访问公开或已授权知识。

### `profile_owner_remote`

可生成草稿、候选和待审核任务，可写 staging/candidates；不可删除、执行系统命令或修改系统配置。

### `profile_local_admin`

仅限本地可信网络，可运行导入、归档、备份和受控自动化；高危操作仍需明确人工确认和审计。

任何 profile 都不得默认：自动公开发布、远程删除照片、修改稳定 Skill、绕过审核改变照片公开范围、修改 frp/nginx/docker 配置。

## 内容流水线

默认根目录由环境变量配置，目录阶段固定为：

```text
00_inbox → 01_raw → 02_processed → 03_candidates → 04_review → 05_published → 06_archive
```

`_system/` 保存状态和任务元数据。Hermes 默认只写 `03_candidates/` 或 `04_review/pending/`，不得直接写入公开内容目录。当前实现说明见 `docs/architecture/content-pipeline.md` 和 `docs/agent-context/implementation-notes/2026-07-15-content-pipeline.md`。

处理规则：

1. 对话和导入文件先进入 inbox/raw，并保留来源引用。
2. 整理结果写入 processed 和 candidates，流程必须可重复且不自动公开。
3. 审核通过后最多生成 Blog/Portfolio draft；公开发布仍需人工确认。
4. 所有批量处理、审核和发布动作写入审计日志。

候选内容至少包含 `title`、`type`、`status`、`createdBy`、`reviewStatus`、`suggestedVisibility`、`sourceConversations` 和 `riskLevel`。

## Skill 治理

治理目录阶段为：

```text
00_inbox → 01_review → 02_stable → 03_experimental → 04_archived → _registry
```

远程场景只能查看、标记状态、写备注、生成建议；不得直接修改 stable、删除 Skill、启用 high/critical Skill 或把未审核 Skill 同步到 Hermes 主目录。

## 隐私与 Git

真实对话、Skill 运行目录、照片、数据库、日志、备份和密钥不得提交 Git。候选内容默认保存在本地 content-pipeline，审核通过前不得进入 Git 或公开站点。生成代码、文档或示例时遵守 `AGENTS.md` 和 `docs/implementation/git-version-control-governance.md`。
