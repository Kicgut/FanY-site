---
title: "阶段 2.1 — Nuxt Content 与 Markdown 基础"
created: 2026-07-04
updated: 2026-07-04
status: archived
purpose: "- ✅ @nuxt/content v3.15.0 安装配置"
scope: "v1 阶段"
tags:
  - learning-notes
---

# 阶段 2.1 — Nuxt Content 与 Markdown 基础

## 完成情况
- ✅ @nuxt/content v3.15.0 安装配置
- ✅ better-sqlite3 安装（v3 必需依赖）
- ✅ content.config.ts 集合定义（blog 集合）
- ✅ 2 篇示例 Markdown 文章（hello-world、nuxt3-intro）
- ✅ 博客列表页（queryCollection + el-card 卡片）

## 踩坑记录
1. **Nuxt Content v3 需要 better-sqlite3** — v2 不需要，v3 必须手动安装
2. **v3 需要 content.config.ts** — 不再自动扫描 content/ 目录，必须定义 collection
3. **API 变化** — `queryContent()` → `queryCollection()`, `ContentList` → `useAsyncData` + `queryCollection`
4. **pnpm approve-builds** — better-sqlite3 有 native 编译脚本，需要 approve

## 核心概念：Headless CMS

**类比：** 传统 CMS（如 WordPress）= 内容和展示绑在一起。Headless CMS = 内容和展示分离，Markdown 文件就是你的"数据库"。

```
传统 CMS:   WordPress 后台写文章 → WordPress 主题渲染 → HTML 页面
Headless:   Markdown 文件 → Nuxt Content 解析 → 你的 Vue 组件渲染
```

**Nuxt Content 的"文件即数据库"：**
- `content/blog/hello-world.md` → 一行 SQL: `SELECT * FROM blog WHERE path = '/blog/hello-world'`
- Front Matter（YAML 头部）→ 数据库字段
- Markdown 正文 → 字段内容

## 对比：内容管理方案

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **Nuxt Content** | 文件即数据库 | 零配置、Git 版本控制、Markdown | 仅限 Nuxt |
| WordPress | 传统 CMS | 生态最大、所见即所得 | 重、慢、安全风险 |
| Strapi | Headless CMS | REST/GraphQL API、管理后台 | 需要独立部署 |
| Notion API | 云文档即 CMS | 写作体验好 | API 限制、依赖云服务 |

## 人格标签
> 内容架构师 — 用文件管理一切内容，理解了 Headless CMS 的核心思想
