# Phase 8：Hermes 内容流水线

## 当前状态

`in_progress`

Current implementation also includes inbox/raw processing, private AI conversation Markdown archives, a Job-backed processing endpoint, and an opt-in single-instance scheduler. A continuously running worker, multi-instance-safe external scheduling, full YAML frontmatter parsing, real-auth end-to-end testing, and final acceptance review remain outstanding.

第一批已完成数据库候选模型、版本记录、审核状态机、发布为草稿和 AI 候选入口；原始对话归档、每日 Hermes 整理任务、Job worker、完整后台编辑与最终验收仍未完成。

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
- 不允许候选内容自动进入正式 content/blog。
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

## 7. Hermes 每日整理任务

每日任务只能：

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

建议第一版发布到：

```text
content/blog/_drafts/
```

而不是直接进入公开博客目录。

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
