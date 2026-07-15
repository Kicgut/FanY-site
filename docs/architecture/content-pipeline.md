---
title: "Content Pipeline — 设计文档与实现状态"
created: 2026-07-05
updated: 2026-07-05
status: final
purpose: "> 最后更新：2026-07-05"
scope: "全阶段"
tags:
  - architecture
---

# Content Pipeline — 设计文档与实现状态

> 最后更新：2026-07-05

---

## 1. Content Pipeline 是什么？

**内容流水线**是 AI 生成内容的「审核发布系统」。它解决的核心问题是：

> AI 可以生成内容，但不能自动发布。所有 AI 生成的内容必须经过人工审核才能上架。

```
AI 聊天 / 手动创建 / 外部导入
         ↓
    ┌─────────────┐
    │  candidates/ │  ← 待审核草稿（.md 文件 + YAML frontmatter）
    └──────┬──────┘
           ↓
    ┌─────────────┐
    │   审核界面   │  ← 管理员查看、预览、决定
    └──────┬──────┘
           ↓
    ┌──────┴──────┐
    │             │
    ▼             ▼
 approved      rejected
    │             │
    ▼             ▼
 published/    archived/
    │
    ▼
 创建 Article / Portfolio 记录
    │
    ▼
 上架 Blog / 作品集
```

---

## 2. 文件存储位置

### 目录结构

```
/app/data/content-pipeline/        ← 容器内路径
  ├── candidates/                  ← 待审核
  │   ├── a1b2c3d4.md
  │   └── e5f6g7h8.md
  ├── published/                   ← 已通过
  │   └── x9y8z7w6.md
  └── archived/                    ← 已拒绝
      └── m3n4o5p6.md
```

### 挂载关系（ECS）

```
ECS 宿主机:  /opt/personal-website/data/content-pipeline/
容器内:      /app/data/content-pipeline/

（因为 /opt/personal-website/data/ 已挂载到 /app/data/）
```

### 每个 .md 文件格式

```markdown
---
id: a1b2c3d4
title: "如何学习 Vue 3"
source: ai_chat
status: draft
tags: [vue, frontend]
description: "AI 生成的 Vue 3 学习指南"
createdAt: 2026-07-05T10:00:00.000Z
updatedAt: 2026-07-05T10:00:00.000Z
---

这里是文章正文内容...

支持 Markdown 格式。
```

---

## 3. 当前已实现的功能

### ✅ 已完成

| 功能 | 文件 | 状态 |
|------|------|------|
| 创建候选内容 | `server/services/content-pipeline.ts` → `createCandidate()` | ✅ |
| 列出候选内容 | `listCandidates()` — 读取 candidates/ 目录 | ✅ |
| 获取单个内容 | `getCandidateContent()` — 读取 + 解析 frontmatter | ✅ |
| 审核通过 | `approveCandidate()` — 移到 published/ | ✅ 文件移动 |
| 审核拒绝 | `rejectCandidate()` — 移到 archived/ | ✅ 文件移动 |
| 前端审核页面 | `pages/admin/content-pipeline/index.vue` | ✅ |
| API 端点 | `server/api/content/candidates/` (GET/POST/Approve/Reject) | ✅ |
| 权限控制 | `requireAdmin` — 需要管理员登录 | ✅ |

### ⚠️ 部分完成

| 功能 | 状态 | 说明 |
|------|------|------|
| Approve → 创建 Article | ⚠️ | `approveCandidate()` 只移动文件，没有创建 Article 数据库记录 |
| 前端预览 | ⚠️ | 预览按钮存在，但只显示 meta，不渲染 Markdown 正文 |

### ❌ 未实现

| 功能 | 说明 |
|------|------|
| AI 聊天 → 保存为草稿 | AI 对话页面没有「保存到 Pipeline」按钮 |
| Approve → 创建 Portfolio | 通过后只支持 Blog，不支持作品集 |
| 批量审核 | 只能逐个审核 |
| 版本对比 | 无法对比修改前后的差异 |
| 自动标签 | AI 不自动提取标签 |
| 内容编辑 | 审核前无法编辑草稿内容 |

---

## 4. 数据流详解

### 4.1 内容进入 Pipeline 的路径

```
路径 A: AI 聊天（未实现）
  用户在 /ai 页面和 AI 对话
  → 点击「保存为草稿」
  → POST /api/content/candidates { title, content, source: 'ai_chat' }
  → 保存到 candidates/{uuid}.md

路径 B: 手动创建（已实现）
  管理员通过 API 直接调用
  → POST /api/content/candidates { title, content, source: 'manual' }
  → 保存到 candidates/{uuid}.md

路径 C: 外部导入（未实现）
  从其他平台导入内容
  → 解析 → 保存到 candidates/{uuid}.md
```

### 4.2 审核流程

```
管理员打开 /admin/content-pipeline
  → 看到所有 candidates，按状态分 Tab（Draft/Pending/Approved/Rejected）
  → 点击某条 → 预览内容
  → 点击 Approve → 选择目标（Blog / Portfolio）
  → 服务端：
      1. 更新 .md 的 status = 'approved'
      2. 移动文件到 published/
      3. ❌（待实现）创建 Article 记录到数据库
      4. ❌（待实现）自动发布到前端可见
```

### 4.3 发布后的内容去向

```
published/{uuid}.md
  ↓
创建 Article 数据库记录：
  - title: 从 frontmatter 读取
  - content: 从 .md body 读取
  - slug: 自动生成
  - status: 'published'
  ↓
Blog 页面 /blog 自动展示（通过 Prisma 查询 Article 表）
```

---

## 5. 待实现计划（需用户确认）

### P0: 补完核心流程

1. **AI 聊天 → 保存草稿**
   - 在 `/ai` 页面添加「保存为草稿」按钮
   - 调用 `POST /api/content/candidates`
   - 保存成功后提示「已保存到内容流水线」

2. **Approve → 创建 Article**
   - 修改 `approveCandidate()` 函数
   - 审核通过后自动创建 Article 记录
   - 设置 status = 'published'，自动生成 slug

3. **前端预览 Markdown**
   - 在审核页面渲染 Markdown 正文（用 @nuxt/content 或 markdown-it）

### P1: 增强功能

4. **内容编辑** — 审核前可以修改草稿
5. **批量审核** — 选择多条一起通过/拒绝
6. **Approve → Portfolio** — 支持发布到作品集

### P2: 高级功能

7. **AI 自动标签** — 生成内容时自动提取 tags
8. **版本对比** — 编辑前后 diff
9. **定时发布** — 设置发布时间

---

## 6. 安全考量

- 所有 Pipeline 操作需要 admin 权限
- AI 不能自动发布（必须人工 Approve）
- 拒绝的内容归档但不删除（可追溯）
- 每次操作记录 AuditLog
