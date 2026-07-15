---
title: "阶段 3.2 — API 路由与 CRUD 接口"
created: 2026-07-04
updated: 2026-07-04
status: archived
purpose: "- ✅ GET /api/articles（列表+筛选+分页）"
scope: "v1 阶段"
tags:
  - learning-notes
---

# 阶段 3.2 — API 路由与 CRUD 接口

## 完成情况
- ✅ GET /api/articles（列表+筛选+分页）
- ✅ GET /api/articles/:id（详情+tags关联）
- ✅ POST /api/articles（创建+自动生成slug+自动创建tag）
- ✅ PUT /api/articles/:id（部分更新+替换tag）
- ✅ DELETE /api/articles/:id（删除）
- ✅ GET /api/tags（标签列表+文章计数）

## 踩坑记录
1. **Prisma 7 与 Nuxt 3 不兼容** — `prisma-client` 生成器在 Nitro 构建时路径解析失败，降级到 Prisma 6
2. **Prisma 7 的 `prisma.config.ts`** — 新版把数据库 URL 从 schema 移到配置文件，和 Prisma 6 冲突
3. **`server/utils/db.ts` 路径问题** — Nitro 构建器无法解析 `../../generated/prisma` 相对路径

## 核心概念：RESTful API

**类比：** API 就像餐厅的服务窗口。你（前端）通过窗口告诉厨师（后端）你要什么：
- GET → "给我看看菜单"（查）
- POST → "我要点一份炒饭"（增）
- PUT → "炒饭改成少油"（改）
- DELETE → "取消订单"（删）

```
GET    /api/articles      → 查列表
GET    /api/articles/1    → 查单个
POST   /api/articles      → 新增
PUT    /api/articles/1    → 修改
DELETE /api/articles/1    → 删除
```

## 对比：API 设计方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **RESTful** | 简单直观、HTTP 原生 | 复杂查询需多个端点 |
| GraphQL | 按需查询、无冗余 | 学习曲线、缓存复杂 |
| tRPC | 端到端类型安全 | 需 TypeScript 全栈 |
| gRPC | 高性能、强类型 | 浏览器不原生支持 |

## 人格标签
> 接口工程师 — 连接前端页面和后端数据，理解了 RESTful API 的设计规范
