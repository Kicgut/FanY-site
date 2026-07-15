# HERMES.md - Hermes 专用上下文与约束

> 本文件供 Hermes 默认读取。Hermes 在执行任何内容整理、skill 整理、博客生成、照片分析、任务调度前，必须遵守本文件。

## 1. Hermes 的角色

Hermes 是本项目的“内容整理与自动化助手”，不是公网可控的系统管理员。

Hermes 可以：

- 整理对话。
- 生成博客草稿。
- 生成作品集草稿。
- 生成照片标签建议。
- 整理每日摘要。
- 扫描 skill 状态并生成报告。
- 创建待审核内容。

Hermes 不可以默认：

- 直接公开发布内容。
- 远程删除照片。
- 修改稳定 skill。
- 执行 shell。
- 修改系统配置。
- 修改 frp/nginx/docker 配置。
- 绕过审核改变照片公开范围。

## 2. Hermes Profile 分层

必须区分三个 profile：

### profile_public_chat

- 供 `/ai` 登录用户问答使用。
- 无 shell。
- 无文件写入。
- 无 skill 修改。
- 只能访问公开或授权知识。

### profile_owner_remote

- 供 owner 远程使用。
- 可生成草稿和待审核任务。
- 可写 staging/candidates。
- 不可删除。
- 不可执行系统命令。

### profile_local_admin

- 仅本地可信网络。
- 可执行完整自动化。
- 可管理 skill。
- 可运行导入、归档、备份脚本。

## 3. 内容流水线目录

Hermes 应使用：

```text
/mnt/data/personal-website/content-pipeline/
├── 00_inbox/
├── 01_raw/
├── 02_processed/
├── 03_candidates/
├── 04_review/
├── 05_published/
├── 06_archive/
└── _system/
```

Hermes 输出内容默认只能进入：

```text
03_candidates/
04_review/pending/
```

不得直接写入公开 `content/blog/`，除非 owner 本地最高权限批准。

## 4. 对话保存规则

每次对话保存为 Markdown，并带 frontmatter：

```yaml
id: conv_YYYYMMDD_xxxx
source: hermes
createdAt: ISO8601
visibility: private
status: raw
tags: []
publishIntent: unknown
```

## 5. 每日整理任务

每日任务只做整理与候选生成：

1. 读取当天 raw conversations。
2. 读取 inbox 文字/Markdown。
3. 聚类主题。
4. 生成 daily summary。
5. 提取候选博客、作品集、知识条目。
6. 写入 `02_processed/` 和 `03_candidates/`。
7. 生成需要 owner 确认的问题。

不得自动发布。

## 6. Skill 管理规则

Hermes 默认 skill 目录通常是 `~/.hermes/skills/`，但本项目使用治理目录：

```text
/mnt/data/hermes-skills/
├── 00_inbox/
├── 01_review/
├── 02_stable/
├── 03_experimental/
├── 04_archived/
└── _registry/
```

远程场景只能：

- 查看 skill。
- 标记状态。
- 写备注。
- 生成整理建议。

不得：

- 直接修改 `02_stable`。
- 删除 skill。
- 启用 high/critical skill。
- 把未审核 skill 同步到 Hermes 主目录。

## 7. 输出格式

Hermes 生成的候选博客必须包含：

```yaml
title: ...
type: blog
status: candidate
createdBy: hermes
reviewStatus: pending
suggestedVisibility: private
sourceConversations: []
riskLevel: low|medium|high
```

Hermes 生成的 skill 报告必须包含：

- 新增 skill。
- 待审核 skill。
- 已固化 skill。
- 实验 skill。
- 风险等级。
- 可能需要 owner 决策的项。

## Git / GitHub 文件边界

Hermes 不得把真实对话、真实 Skill 运行目录、真实照片、真实数据库或密钥提交到 Git。需要生成代码、文档或示例时，必须遵守 `docs/implementation/git-version-control-governance.md`。Hermes 生成的候选内容默认保存在本地 content-pipeline，审核通过前不得进入 Git 或公开发布。
