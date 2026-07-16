---
title: "审核流程设计"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\design
---
# 审核流程设计

## 1. 通用审核状态

```text
pending
approved
rejected
needs_edit
```

## 2. 照片审核

上传后：

```text
reviewStatus=pending
status=hidden
visibility=private
```

批准后可进入：

- public active。
- friends active。
- private active。
- private hidden，仅保存。

拒绝后：

```text
reviewStatus=rejected
status=hidden
visibility=private
```

要求修改后：

```text
reviewStatus=needs_edit
status=hidden
```

## 3. 内容审核

Hermes 生成内容后：

```text
03_candidates
→ 04_review/pending
```

Owner 操作：

- approve：进入 approved。
- reject：进入 rejected。
- needs_edit：返回 Hermes 修改。
- publish：进入 05_published 并同步到网站。

## 4. Skill 审核

新增 skill：

```text
00_inbox
→ 01_review/pending
→ 02_stable or 03_experimental or rejected
```

远程 owner 只能标记和备注；本地 highest permission 才能固化。
