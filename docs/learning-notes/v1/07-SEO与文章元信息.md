---
title: "阶段 2.4 — SEO 与文章元信息"
created: 2026-07-04
updated: 2026-07-04
status: archived
purpose: "- ✅ useHead() 动态设置页面标题"
scope: "v1 阶段"
tags:
  - learning-notes
---

# 阶段 2.4 — SEO 与文章元信息

## 完成情况
- ✅ useHead() 动态设置页面标题
- ✅ useSeoMeta() 设置 OG 标签（og:title, og:description, og:type）
- ✅ 阅读时间估算（字数/200 = 分钟数）
- ✅ 归档页（按年月分组，共 N 篇）
- ✅ 导航栏增加"归档"链接

## 核心概念：SEO 三大件

**类比：** SEO 就像给你的网站贴名片。搜索引擎和社交平台通过这些"名片"认识你。

```
<title>                    → 浏览器标签页标题、搜索结果标题
<meta name="description">  → 搜索结果下方的摘要
<meta property="og:title"> → 微信/Twitter 分享时的卡片标题
```

**useHead() vs useSeoMeta()：**
- `useHead()` — 设置 title、通用 meta、link
- `useSeoMeta()` — 专门设置 OG/Twitter 等社交分享标签，类型更安全

## 对比：SEO 方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **useHead/useSeoMeta** | Nuxt 原生、类型安全、SSR 友好 | 需手动设置每个页面 |
| @nuxtjs/seo | 自动化 OG、sitemap、robots | 额外依赖 |
| 手写 `<head>` | 简单直接 | 无类型检查、SSR 不友好 |

## 人格标签
> 网站推广员 — 让搜索引擎和社交平台认识你的内容，理解了 SEO 的核心三要素
