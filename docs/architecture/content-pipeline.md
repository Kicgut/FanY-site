---
title: "Content Pipeline — 当前架构与实现状态"
created: 2026-07-05 00:00
updated: 2026-07-15 23:29
status: final
purpose: "说明 AI、Hermes、Markdown 和纯文本如何进入候选内容审核流，以及哪些步骤仍需人工确认。"
scope: "内容流水线"
related:
  - path: "../project-management/tasks/08-content-pipeline.md"
    relation: "tracks"
  - path: "../agent-context/implementation-notes/2026-07-15-content-pipeline.md"
    relation: "implementation-note"
tags:
  - architecture
  - content-pipeline
---

# Content Pipeline — 当前架构与实现状态

内容流水线负责把 AI 对话、Markdown 和纯文本转成可审核的 Blog、Portfolio 或 Knowledge 候选。AI/Hermes 可以整理和生成候选，但不能自动公开发布。

## 数据流

```text
AI 对话 / 管理员导入 / 手动放入文件
                  ↓
             00_inbox
                  ↓
              01_raw
                  ↓
           02_processed
                  ↓
          03_candidates
                  ↓
        管理员审核与修订
                  ↓
       approved → Blog/Portfolio draft
                  ↓
        人工确认后才可 public
```

文件根目录由 `CONTENT_PIPELINE_ROOT` 配置，阶段目录为：

```text
00_inbox/       原始输入和 AI 对话归档
01_raw/         已接收、保留来源的原始文件
02_processed/   整理后的中间产物
03_candidates/  数据库候选的 Markdown 镜像
04_review/      审核辅助文件
05_published/   已生成发布草稿的流水线产物
06_archive/     拒绝、撤回或归档内容
_system/        任务和系统元数据
```

## 当前实现

| 能力 | 当前状态 | 说明 |
| --- | --- | --- |
| 候选模型 | 已实现 | `ContentCandidate`、`ContentRevision`、`ContentPublication` |
| 候选创建和编辑 | 已实现 | 数据库为主，Markdown 为可审计镜像；编辑产生 revision |
| AI 对话归档 | 已实现 | 私密 Markdown 写入 `00_inbox/conversations/` |
| Markdown/TXT 导入 | 已实现 | 管理员导入到 inbox，并保留来源引用 |
| inbox/raw 处理 | 已实现 | 处理到 processed/candidates，重复执行可幂等跳过 |
| 审核状态机 | 已实现 | draft、submitted、reviewing、changes_requested、approved、rejected、published、archived |
| 后台审核 | 已实现 | 查看、预览、修改、提交、批准、要求修改、拒绝、归档 |
| 发布投影 | 已实现 | 批准后创建 Blog/Portfolio `draft`，不直接公开 |
| 撤回 | 已实现 | 撤回发布投影并归档候选 |
| Job 与定时触发 | 已实现 | 管理员 Job API；可选单实例 scheduler |

## API 入口

- `/api/content/candidates`：候选 CRUD 和审核生命周期。
- `/api/admin/content-pipeline/import`：管理员导入 Markdown/TXT。
- `/api/admin/content-pipeline/process`：手动创建或立即执行处理 Job。
- `/api/admin/content-pipeline/jobs`：查看最近处理任务。
- `/api/ai/candidates`：从授权 AI 结果创建私密候选。

所有入口都必须经过认证、管理员或 AI 权限校验、输入校验和审计记录。`approve` 只改变审核状态；`publish` 只生成站内 draft 投影。

## 仍未完成或需要补强

1. 尚未完成真实登录状态下的端到端验收。
2. 当前 frontmatter 解析器支持标量字段和简单 tags 数组，尚未替代为完整 YAML 解析器。
3. 多实例部署需要外部 scheduler 或分布式锁；内置 scheduler 只适合单实例。
4. 任务 13（照片状态与 ECS 同步策略）和任务 14（用户上传重新提交）仍是独立未开始计划。

## 安全不变量

- 未批准候选不得出现在公开 Blog、Portfolio 或 Gallery 查询中。
- Hermes 不得直接写入公开内容目录。
- 私人对话原文只保存到受保护的 inbox，不作为公开文章来源自动发布。
- 任何发布、撤回、批处理和失败重试都应留下 audit/job 记录。
