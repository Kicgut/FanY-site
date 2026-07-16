---
title: "阶段 2.3 — 文章详情页与 Markdown 渲染"
created: 2026-07-04 00:00
updated: 2026-07-15 23:29
status: archived
purpose: "- ✅ pages/blog/[...slug].vue 动态路由"
scope: "v1 阶段"
related: []
tags:
  - learning-notes
---

# 阶段 2.3 — 文章详情页与 Markdown 渲染

## 完成情况
- ✅ pages/blog/[...slug].vue 动态路由
- ✅ queryCollection('blog').path().first() 查询单篇文章
- ✅ ContentRenderer 渲染 Markdown 为 HTML
- ✅ .prose 样式（标题、代码块深色背景、blockquote、表格、图片）
- ✅ 404 页面（el-empty）
- ✅ 返回博客列表链接

## 核心概念：动态路由与 ContentRenderer

**动态路由 `[...slug].vue`：** 捕获所有子路径。`/blog/hello-world` → `slug = ['hello-world']`，`/blog/2026/07/post` 也能匹配。

**ContentRenderer：** 把 Markdown 的 AST（抽象语法树）转成 HTML。不需要手动解析，Nuxt Content 自动处理。

**`:deep()` 选择器：** Vue 的 scoped 样式默认不影响子组件。`:deep(h2)` 穿透 scoped 边界，给 ContentRenderer 内部的 h2 加样式。

## 对比：Markdown 渲染方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Nuxt Content** | 零配置、自动路由、Vue 集成 | 仅限 Nuxt |
| marked + highlight.js | 轻量、任何框架通用 | 需手动集成 |
| react-markdown | React 生态好 | 不适用于 Vue |
| MDX | Markdown + JSX 组件 | 复杂、学习成本高 |

## 人格标签
> 翻译官 — 把 Markdown 翻译成用户看到的页面，理解了内容到展示的转换链路
