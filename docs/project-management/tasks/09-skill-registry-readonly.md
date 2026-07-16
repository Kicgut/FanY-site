---
title: "Phase 9：Hermes Skill Registry 远程只读管理"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Phase 9：Hermes Skill Registry 远程只读管理

## 1. 任务目标

建立 Hermes Skill 的远程查看和治理索引，使手机后台可以查看新增、待处理、已固化、实验中和调用次数，但不能远程修改 Skill 源文件。

## 2. 前置条件

- 已确认 Hermes skill 实际目录，默认待确认：`~/.hermes/skills/`。
- 已确认 Hermes 日志目录，默认待确认：`~/.hermes/logs/`。
- 已阅读 `docs/architecture/hermes-skill-registry.md`。

## 3. 改动范围

### 允许改动

- Skill Registry 目录。
- Skill 扫描脚本。
- Skill 索引 JSON。
- `/api/admin/hermes/skills/**`。
- `/admin/hermes/skills` 页面。

### 禁止改动

- 不允许远程编辑 `SKILL.md`。
- 不允许远程删除 skill。
- 不允许远程启用 high/critical skill。
- 不允许把未审核 skill 自动同步到 Hermes 主 skill 目录。

## 4. 推荐目录

```text
/mnt/data/hermes-skills/
├── 00_inbox/
├── 01_review/
├── 02_stable/
├── 03_experimental/
├── 04_archived/
└── _registry/
```

## 5. Skill 状态

```text
new
reviewing
stable
experimental
deprecated
archived
blocked
```

## 6. 风险等级

```text
low      只读/写作/总结
medium   可写 staging
high     可执行命令或改文件
critical 删除、系统配置、权限变更
```

## 7. 核心函数

```ts
scanHermesSkills(): Promise<SkillScanResult>
readSkillMetadata(skillPath): Promise<HermesSkillMetadata>
updateSkillRegistry(scanResult): Promise<void>
listSkills(filters): Promise<PaginatedSkills>
markSkillReviewStatus(skillId, status, note, actor): Promise<void>
parseSkillUsageLogs(): Promise<UsageStats>
```

## 8. 远程允许操作

- 查看 Skill 列表。
- 查看 `SKILL.md` 摘要或只读内容。
- 标记状态：new/reviewing/deprecated/blocked。
- 添加备注。
- 查看调用次数。
- 查看最近更新时间。

## 9. 远程禁止操作

- 修改 `SKILL.md`。
- 删除文件。
- 移动 skill 目录。
- 同步到 Hermes 主目录。
- 执行 skill。

## 10. 验收标准

- 后台能显示 skill 总数。
- 能区分新增、待处理、stable。
- 能显示风险等级。
- 能显示调用次数，若暂无法统计则显示 unknown，并记录待确认。
- 远程修改源文件接口不存在或返回 403。

## 11. 回滚方案

- 停止扫描任务。
- 删除 registry 索引，不影响 Hermes 原生 skill。

## 12. Agent 注意事项

- 不要假设 Hermes 目录一定正确，必须可配置。
- 不要把外部 skill 目录当作安全隔离边界。
