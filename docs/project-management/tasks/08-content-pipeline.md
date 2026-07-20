---
title: "Phase 8：Hermes 内容流水线"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Phase 8：Hermes 内容流水线

## 当前状态

`in_progress`

当前实现已覆盖候选模型、版本记录、审核状态机、发布为草稿、AI 候选入口、AI 对话归档、inbox/raw 处理、后台编辑、Job API 和可选单实例 scheduler。尚未完成的部分是完整 YAML frontmatter 解析、多实例安全调度、真实认证端到端测试和最终验收。

## 1. 任务目标

建立从 AI 对话、Markdown、纯文本到博客/作品集/知识库候选内容的生产流水线。Hermes 可以整理和生成候选内容，但不能自动公开发布。

## 2. 前置条件

- Phase 7 已完成，或至少已有安全对话日志。
- 已阅读 `docs/architecture/content-pipeline.md`。
- 已确认本地内容根目录，默认：`/mnt/data/personal-website/content-pipeline/`。

## 3. 改动范围

### 允许改动

- 本地内容流水线目录。
- `/api/admin/content-pipeline/**`。
- `/admin/content-pipeline/**` 页面。
- Hermes 定时任务配置文档或脚本。
- 内容索引脚本。

### 禁止改动

- 不允许 Hermes 直接发布 public 博客。
- 不允许候选内容自动写入 `content/blog`、`data/blog-md` 的公开文章或 Git。
- 不允许公开私人对话原文。

## 4. 目录结构

```text
content-pipeline/
├── 00_inbox/
├── 01_raw/
├── 02_processed/
├── 03_candidates/
├── 04_review/
├── 05_published/
├── 06_archive/
└── _system/
```

## 5. 数据状态

```text
raw
processed
candidate
review_pending
approved
rejected
published
archived
```

## 6. 输入来源

- `/ai` 对话记录。
- Hermes 本地对话导出。
- 手机上传纯文本。
- 手机上传 Markdown。
- 手动放入 `00_inbox` 的文件。

## 7. Hermes 整理任务

手动 Job 和可选 scheduler 只能：

- 读取 `00_inbox` 和 `01_raw`。
- 生成 `02_processed` 总结。
- 生成 `03_candidates` 候选博客/作品集/知识卡片。
- 写日志。

每日任务不能：

- 发布内容。
- 删除 raw。
- 修改已发布内容。
- 修改 skill。
- 执行系统高危命令。

## 8. 候选内容 Frontmatter

```yaml
title: ""
type: blog
status: candidate
createdBy: hermes
sourceConversations: []
riskLevel: medium
suggestedVisibility: private
reviewStatus: pending
createdAt: ""
```

## 9. 后台审核动作

- 查看 raw 摘要。
- 查看 processed。
- 查看 candidate。
- 编辑 candidate。
- 批准为 blog draft。
- 批准为 portfolio draft。
- 拒绝。
- 归档。

## 10. 发布规则

公开发布必须由你批准：

```text
candidate → review approved → published draft → 人工确认 public
```

发布动作只创建站内 Blog draft：数据库写入 `Article`，正文写入运行时挂载卷 `data/blog-md/<slug>.md`；不会写入 `content/blog`，也不会创建 Git 提交。

## 11. 验收标准

- 对话可以保存为 Markdown。
- 手动上传 md/txt 可以进入 inbox。
- Hermes 整理后生成 processed 和 candidates。
- 后台可以看到候选内容。
- 未批准内容不会出现在公开网站。
- 批准后内容进入草稿区，而非直接公开。

## 12. 回滚方案

- 停止每日整理任务。
- 把 candidates 移入 archive。
- 不影响已有博客。

## 13. Agent 注意事项

- 不允许把私人 raw 内容自动摘要成公开文章。
- 不允许省略 reviewStatus。
