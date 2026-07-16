---
title: "Hermes Skill Registry 架构"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: draft
purpose: "记录目标设计和待完成方案，不代表当前代码已经实现。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Hermes Skill Registry 架构

## 1. 目标

支持远程手机查看 Hermes skills：

- 哪些是新增。
- 哪些待处理。
- 哪些已固化。
- 哪些实验中。
- 调用次数统计。

远程只读和标记，不允许直接修改稳定 skill。

## 2. 目录

```text
/mnt/data/hermes-skills/
├── 00_inbox/
├── 01_review/
│   ├── pending/
│   ├── needs-edit/
│   └── rejected/
├── 02_stable/
│   ├── content/
│   ├── coding/
│   ├── devops/
│   ├── photography/
│   ├── writing/
│   └── personal-website/
├── 03_experimental/
├── 04_archived/
└── _registry/
    ├── skills-index.json
    ├── usage-log.jsonl
    ├── review-log.jsonl
    └── snapshots/
```

## 3. Skill 状态

```text
new
reviewing
stable
experimental
deprecated
archived
blocked
```

## 4. 风险等级

```text
low       只读/总结/写作
medium    可写 staging
high      可执行脚本/修改文件
critical  删除/系统配置/权限变更
```

## 5. 元数据

每个 skill 应有 metadata：

```yaml
id: skill_xxx
name: xxx
category: content
status: stable
riskLevel: low
canExecuteShell: false
canWriteFiles: true
allowedWriteRoots:
  - /mnt/data/personal-website/content-pipeline/03_candidates
usageCount: 0
lastUsedAt: null
reviewStatus: approved
```

## 6. 后台页面

```text
/admin/hermes/skills
/admin/hermes/skill-review
```

展示：

- skill 名称。
- 状态。
- 风险等级。
- 最近修改时间。
- 调用次数。
- 最近调用时间。
- 是否需要处理。

远程允许：

- 标记待处理。
- 写备注。
- 变更 reviewStatus。
- 请求本地固化。

远程禁止：

- 编辑 SKILL.md。
- 删除 skill。
- 启用 high/critical。
- 同步到 Hermes 主目录。

## 7. 统计方式

优先实现简单扫描：

```text
scan Hermes logs
→ parse skill name
→ append usage-log.jsonl
→ update skills-index.json
```

若日志不可用，则先只展示文件状态，调用次数标记为 unknown。
