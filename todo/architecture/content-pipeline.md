# Hermes 内容流水线架构

## 1. 目标

让 Hermes 把对话、文字、Markdown、图片分析结果整理为可审核、可发布的内容资产。

## 2. 流程

```text
inbox/raw
→ processed
→ candidates
→ review
→ published
```

## 3. 本地目录

```text
/mnt/data/personal-website/content-pipeline/
├── 00_inbox/
│   ├── chat/
│   ├── text/
│   ├── markdown/
│   └── image-notes/
├── 01_raw/
│   ├── conversations/
│   └── uploads/
├── 02_processed/
│   ├── daily/
│   ├── topics/
│   └── summaries/
├── 03_candidates/
│   ├── blog/
│   ├── portfolio/
│   ├── gallery-notes/
│   └── knowledge-base/
├── 04_review/
│   ├── pending/
│   ├── approved/
│   ├── rejected/
│   └── needs-edit/
├── 05_published/
│   ├── blog/
│   ├── portfolio/
│   ├── gallery/
│   └── pages/
├── 06_archive/
└── _system/
    ├── manifests/
    ├── logs/
    ├── workflows/
    ├── prompts/
    └── schemas/
```

## 4. 对话文件格式

```markdown
---
id: conv_20260705_001
source: hermes
createdAt: 2026-07-05T12:00:00+08:00
visibility: private
status: raw
tags: []
publishIntent: unknown
---

# Conversation

## User
...

## Assistant
...
```

## 5. 候选内容格式

```markdown
---
title: ...
type: blog
status: candidate
createdBy: hermes
sourceConversations: []
riskLevel: medium
suggestedVisibility: private
reviewStatus: pending
---
```

## 6. 每日任务

Hermes 每日整理：

1. 读取当天 raw。
2. 主题聚类。
3. 生成每日摘要。
4. 提取可沉淀观点。
5. 生成候选博客/作品集/知识条目。
6. 写入 candidates。
7. 生成 owner 待确认问题。

## 7. 发布原则

Hermes 不直接发布。

发布必须：

```text
owner approve
→ move to approved
→ publish task
→ write Nuxt content or Portfolio DB
→ audit log
```
