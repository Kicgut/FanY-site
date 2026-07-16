---
title: "目录结构设计"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\design
---
# 目录结构设计

## 1. 项目仓库

```text
nuxt-app/
├── AGENTS.md
├── HERMES.md
├── CODEX.md
├── docs/
├── pages/
├── components/
├── layouts/
├── middleware/
├── server/
├── prisma/
├── content/
├── public/
├── scripts/
└── config/
```

## 2. ECS

```text
/opt/personal-website/
├── app/nuxt-app/
├── data/prod.db
├── public/uploads/
│   ├── photos/
│   ├── portfolio/
│   └── blog/
├── nginx/
├── frp/
├── scripts/
└── logs/
```

## 3. 本地服务器

```text
/mnt/data/personal-website/
├── photos/
│   ├── incoming/
│   ├── public/
│   ├── friends/
│   └── private/
├── thumbnails/
├── content-pipeline/
├── services/
│   ├── photo-server/
│   └── hermes-gateway/
├── db-backups/
├── cold-storage/
├── scripts/
└── logs/
```

## 4. Hermes skills

```text
/mnt/data/hermes-skills/
├── 00_inbox/
├── 01_review/
├── 02_stable/
├── 03_experimental/
├── 04_archived/
└── _registry/
```
