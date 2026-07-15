---
title: "📚 个人网站项目 —— 文档索引"
created: 2026-07-04
updated: 2026-07-04
status: final
purpose: "基于 Nuxt 3 + Vue 3 的个人网站 + 照片服务，部署在阿里云 ECS（2核2G/30GB）+ 本地服务器。"
scope: "全阶段"
tags:
  - project-management
---

# 📚 个人网站项目 —— 文档索引

## 项目

基于 Nuxt 3 + Vue 3 的个人网站 + 照片服务，部署在阿里云 ECS（2核2G/30GB）+ 本地服务器。

## 文档导航

| 文档 | 说明 |
|------|------|
| [完整架构与计划](full-architecture.md) | ⭐ **从这里开始** —— 架构图、技术栈、全部计划 |
| [系统架构详解](architecture.md) | 混合部署方案、带宽分析、方案对比 |
| [存储与带宽方案](storage-bandwidth-plan.md) | 30GB 分配、分层存储、图片优化 |
| [Vue vs React](learning-notes/01-vue-vs-react.md) | 学习笔记 01 |

## 开发阶段

| 阶段 | 内容 | 时间 | 状态 |
|------|------|------|------|
| ① 环境搭建 + 首页 | Nuxt 3 项目 + Element Plus + 首页 | Day 1-2 | ⏳ 待开始 |
| ② 博客系统 | Nuxt Content + Markdown 博客 | Day 3-4 | ⏳ 待开始 |
| ③ 后台管理 | SQLite + Prisma + JWT + 管理页面 | Day 5-7 | ⏳ 待开始 |
| ④ 照片画廊 | 上传处理 + 画廊展示 + 筛选检索 | Day 8-10 | ⏳ 待开始 |
| ⑤ Docker 容器化 | Dockerfile + Compose | Day 11-12 | ⏳ 待开始 |
| ⑥ ECS 部署 | Docker + Nginx + 上线 | Day 13-15 | ⏳ 待开始 |
| ⑦ 本地服务 + 备份 | frp + Immich + rsync | Day 16-18 | ⏳ 待开始 |

## 技术栈速览

```
Nuxt 3 + Vue 3 + Element Plus + Tailwind CSS
Nuxt Content (博客) + SQLite + Prisma (数据库)
sharp (图片处理) + JWT (认证)
Docker + Nginx + frp + rsync + Immich
```

---

*创建时间：2026-07-04*
