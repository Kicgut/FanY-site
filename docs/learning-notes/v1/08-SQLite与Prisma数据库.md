---
title: "阶段 3.1 — SQLite + Prisma 数据库基础"
created: 2026-07-04
updated: 2026-07-04
status: archived
purpose: "- ✅ Prisma 7 + SQLite 安装配置"
scope: "v1 阶段"
tags:
  - learning-notes
---

# 阶段 3.1 — SQLite + Prisma 数据库基础

## 完成情况
- ✅ Prisma 7 + SQLite 安装配置
- ✅ User/Article/Tag 三表模型（多对多关系）
- ✅ prisma migrate dev 创建数据库
- ✅ lib/prisma.ts 单例客户端
- ✅ server/utils/db.ts 自动导入

## 核心概念：数据库 & ORM

**类比：** 数据库 = Excel 表格集合。ORM = 把表格变成代码对象的翻译器。

```
SQLite 文件(dev.db)  →  Prisma Schema(模型定义)  →  TypeScript 代码
   ↑ Excel 表格            ↑ 表头定义                 ↑ 代码对象
   prisma.user.findMany()  →  SELECT * FROM User
```

**Prisma Schema 的三个模型：**
- **User** — 用户（登录后台用）
- **Article** — 文章（标题、内容、状态、标签）
- **Tag** — 标签（和 Article 多对多关系）

## 对比：数据库方案

| 方案 | 类型 | 优点 | 缺点 | 适合场景 |
|------|------|------|------|---------|
| **SQLite** | 文件数据库 | 零配置、单文件、备份简单 | 不支持高并发 | 个人项目✅ |
| PostgreSQL | 服务端数据库 | 功能最强、并发好 | 需要安装维护 | 企业级 |
| MySQL | 服务端数据库 | 生态最大 | 配置复杂 | Web 应用 |
| MongoDB | 文档数据库 | 灵活 schema | 查询不如 SQL | 内容管理 |

## 对比：Node.js ORM

| ORM | 优点 | 缺点 |
|------|------|------|
| **Prisma** | 类型安全、迁移好用、Schema 即文档 | 生成代码体积大 |
| Drizzle | 轻量、SQL-like API | 生态较新 |
| TypeORM | 装饰器语法、成熟 | 配置复杂 |
| Knex | 底层控制强 | 不是真正 ORM |

## 人格标签
> 数据管理员 — 理解了后端最核心的能力：数据存储和查询
