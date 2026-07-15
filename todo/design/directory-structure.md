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
