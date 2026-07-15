---
title: "个人网站项目文档"
created: 2026-07-08
updated: 2026-07-08
status: final
purpose: "```"
scope: "全阶段"
tags:
  - general
---

# 个人网站项目文档

## 目录结构

```
docs/
├── README.md                          ← 本文件
└── architecture/
    ├── sync-architecture.md           ← ECS ↔ 本地服务器整体同步架构
    ├── photo-system.md                ← 照片导入/导出/回流/展示完整流程
    └── skills-sync.md                 ← Hermes Skills 通过 frp 隧道同步
```

## 快速参考

| 场景 | 文档 |
|------|------|
| ECS 和本地服务器怎么通信？ | [sync-architecture.md](architecture/sync-architecture.md) |
| 照片怎么导入、展示、回流？ | [photo-system.md](architecture/photo-system.md) |
| Admin 后台的 Skills 数据从哪来？ | [skills-sync.md](architecture/skills-sync.md) |

## 关键地址

| 服务 | 地址 | 说明 |
|------|------|------|
| ECS 网站 | `http://120.26.231.150:3000` | Nuxt App (Docker) |
| 本地 Skills API | `http://localhost:9800` | Python HTTP 服务 |
| frp 隧道 | `skills.local:7080` → `localhost:9800` | ECS 通过 frps 访问本地 |
| frps 管理 | `120.26.231.150:7000` | frp server |
