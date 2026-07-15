---
title: "Hermes Skills 系统架构"
created: 2026-07-08
updated: 2026-07-08
status: final
purpose: "Hermes Skills 完整架构文档：数据流、存储、API、前端页面、踩坑记录"
scope: "全阶段"
related:
  - path: "architecture/skills-sync.md"
    relation: "supersedes"
tags:
  - architecture
---

# Hermes Skills 系统架构

> 最后更新：2026-07-08

## 概述

Hermes Skills 是 Hermes Agent 的可复用技能库。每个 Skill 是一个 `SKILL.md` 文件，包含 YAML frontmatter（元数据）和 Markdown 正文（使用指南）。本项目将这些 Skills 通过 frp 隧道同步到 ECS 网站数据库，并提供公开/管理两个维度的展示页面。

---

## 整体架构

```
本地服务器 (ASUS TUF, Ubuntu)                    ECS (阿里云, 120.26.231.150)
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│                                      │        │                                      │
│  ~/.hermes/skills/                   │        │  Docker: personal-website            │
│  ├── apikey-image-gen/SKILL.md       │        │  ├── Nuxt 3 App (:3000)              │
│  ├── dogfood/SKILL.md                │        │  ├── SQLite: /app/data/prod.db       │
│  ├── remotion/SKILL.md               │        │  │   ├── HermesSkill (90 rows)       │
│  ├── ... (7 base skills)             │        │  │   └── HermesSkillTag              │
│  ├── apple/                          │        │  └── start.sh (prisma migrate + run) │
│  │   ├── imessage/SKILL.md           │        │                                      │
│  │   ├── findmy/SKILL.md             │        │  frps (:7000) ← frpc                 │
│  │   └── ... (5 skills)              │        │  vhostHTTPPort: 7080                 │
│  ├── creative/                       │        │                                      │
│  │   └── ... (19 skills)             │        │  Nginx → :3000                       │
│  ├── devops/                         │        │                                      │
│  │   ├── ecs-deploy/SKILL.md         │        │  公开页面:                           │
│  │   └── ... (6 skills)              │        │  ├── /skills (default 布局)          │
│  ├── github/                         │        │  └── /admin/hermes/skills (admin)    │
│  │   └── ... (6 skills)              │        │                                      │
│  ├── software-development/           │        │  API:                                │
│  │   └── ... (13 skills)             │        │  ├── GET /api/skills (公开)          │
│  └── ... (19 categories total)       │        │  ├── GET /api/skills/:name (公开)    │
│                                      │        │  ├── GET /api/admin/skills (需认证)  │
│  Skills API (:9800)                  │        │  ├── GET /api/admin/skills/tree      │
│  └── hermes-web-ui 内置              │        │  ├── GET /api/admin/skills/tags      │
│                                      │        │  └── POST /api/admin/skills/sync     │
│  frpc → frps(ECS:7000)               │        │                                      │
│  skills-api → skills.local:7080      │        │                                      │
│                                      │        │                                      │
└──────────────────────────────────────┘        └──────────────────────────────────────┘
         │                                              │
         │              frp 隧道 (HTTP)                  │
         └──────────────────────────────────────────────┘
                   skills.local:7080 → localhost:9800
```

---

## 数据流

### 同步流程（触发：管理后台点击 Sync 或 API 调用）

```
1. ECS Nuxt App 调用 syncSkillsToDb()
     │
2.   ├─ GET http://skills.local:7080/  (通过 frp 隧道)
     │  └─ 返回本地 Skills API 的 JSON 列表 (name, category, path, description, status, riskLevel)
     │
3.   ├─ 对每个 skill，并发 GET http://skills.local:7080/skills/{name}
     │  └─ 返回 SKILL.md 完整内容 (含 YAML frontmatter)
     │
4.   ├─ 解析 frontmatter，提取 author, project, tags 等字段
     │
5.   ├─ 计算 category（基于路径结构）:
     │  ├── ~/.hermes/skills/{name}/SKILL.md → category = 'base'
     │  └── ~/.hermes/skills/{cat}/{name}/SKILL.md → category = {cat}
     │
6.   └─ Prisma upsert 到 HermesSkill 表（create/update）
```

### 前端展示流程

```
公开页面 /skills:
  └─ GET /api/skills → listSkills() → Prisma 查询 HermesSkill (include tags) → 返回 JSON

管理后台 /admin/hermes/skills:
  └─ GET /api/admin/skills → listSkills(filters) → 同上，支持 author/project/tag 筛选

查看 Skill 详情:
  └─ GET /api/skills/{name} → getSkillDetails()
       ├─ Prisma 查询 HermesSkill 元数据
       └─ GET http://skills.local:7080/skills/{name} → SKILL.md 完整内容（通过 frp）
```

---

## 存储位置

### 本地服务器

| 内容 | 路径 | 说明 |
|------|------|------|
| Skill 源文件 | `~/.hermes/skills/{category?}/{name}/SKILL.md` | YAML frontmatter + Markdown 正文 |
| Skills API | `:9800` (hermes-web-ui 内置) | 提供 JSON 列表和单个 skill 内容 |
| frpc 配置 | `/etc/frp/frpc.toml` | skills-api → skills.local:7080 |

### ECS 服务器

| 内容 | 路径 | 说明 |
|------|------|------|
| SQLite 数据库 | `/opt/personal-website/data/prod.db` (容器内 `/app/data/prod.db`) | HermesSkill + HermesSkillTag 表 |
| Nuxt 应用 | Docker 容器 `personal-website` | 镜像内 `/app/.output/` |
| frps 配置 | `/etc/frp/frps.toml` | bindPort=7000, vhostHTTPPort=7080 |
| docker-compose | `/opt/personal-website/docker-compose.yml` | `extra_hosts: skills.local:host-gateway` |

---

## 数据库 Schema

### HermesSkill 表

```prisma
model HermesSkill {
  id          Int       @id @default(autoincrement())
  name        String    @unique           // skill 名称，如 "ecs-deploy"
  category    String?                     // 分类：base / devops / creative / ...
  description String?                     // 来自 SKILL.md frontmatter 或远程 API
  path        String                      // 源文件绝对路径，如 /home/aloof/.hermes/skills/devops/ecs-deploy/SKILL.md
  author      String?                     // frontmatter author 字段，如 "YYH"
  project     String?                     // frontmatter project 字段，如 "personal-website"
  status      String    @default("new")   // active / new / experimental / deprecated
  riskLevel   String    @default("low")   // low / medium / high
  usageCount  Int       @default(0)
  lastUsedAt  DateTime?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  tags        HermesSkillTag[]            // 关联标签
}
```

### HermesSkillTag 表

```prisma
model HermesSkillTag {
  id        Int       @id @default(autoincrement())
  skillName String                        // 外键 → HermesSkill.name
  tag       String                        // 标签文本，如 "优质", "项目专用"
  tagType   String    @default("custom")  // preset / custom
  createdAt DateTime  @default(now())
  skill     HermesSkill @relation(fields: [skillName], references: [name], onDelete: Cascade)

  @@unique([skillName, tag])              // 同一 skill 下标签不重复
  @@index([tag])                          // 按标签查询加速
}
```

---

## Category 分类规则

Category 基于 Skill 源文件在 `~/.hermes/skills/` 下的**目录层级**自动判定：

```
~/.hermes/skills/
├── apikey-image-gen/SKILL.md    → 路径 2 层 → category = "base"
├── dogfood/SKILL.md             → 路径 2 层 → category = "base"
├── remotion/SKILL.md            → 路径 2 层 → category = "base"
├── apple/
│   ├── imessage/SKILL.md        → 路径 3 层 → category = "apple"
│   └── findmy/SKILL.md          → 路径 3 层 → category = "apple"
├── creative/
│   ├── ascii-art/SKILL.md       → 路径 3 层 → category = "creative"
│   └── ...
└── devops/
    ├── ecs-deploy/SKILL.md      → 路径 3 层 → category = "devops"
    └── ...
```

**判定逻辑**（`server/services/skill-registry.ts`）：

```typescript
const parts = path.match(/\/\.hermes\/skills\/(.+)$/)[1].split('/')
if (parts.length >= 3) {
  category = parts[0]   // cat/name/SKILL.md → cat
} else {
  category = 'base'     // name/SKILL.md → base
}
```

---

## frp 隧道配置

### 本地 frpc（客户端）

```toml
# /etc/frp/frpc.toml
[[proxies]]
name = "skills-api"
type = "http"
localIP = "127.0.0.1"
localPort = 9800
customDomains = ["skills.local"]
```

### ECS frps（服务端）

```toml
# /etc/frp/frps.toml
bindPort = 7000
vhostHTTPPort = 7080
```

### Docker 容器访问

```yaml
# docker-compose.yml
extra_hosts:
  - "skills.local:host-gateway"
```

容器内 `skills.local:7080` → 宿主机 frps → frpc → 本地 `:9800`

---

## API 端点

### 公开 API（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | 所有 skills 列表（支持 ?category=&author=&project=&tag= 筛选） |
| GET | `/api/skills/:name` | 单个 skill 详情 + SKILL.md 内容 |

### 管理 API（需 JWT 认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/skills` | 同公开 API，支持更多筛选参数 |
| GET | `/api/admin/skills/tree` | 目录树结构 + 分类/作者/项目统计 |
| GET | `/api/admin/skills/:name` | skill 详情 + SKILL.md 内容 |
| POST | `/api/admin/skills/sync` | 触发从本地同步到数据库 |
| GET | `/api/admin/skills/tags` | 预设标签 + 已有标签列表 |
| POST | `/api/admin/skills/tags` | 添加标签 |
| DELETE | `/api/admin/skills/tags` | 删除标签 |

---

## 前端页面

### 公开页面 `/skills`

- 布局：`default`（顶部导航栏，无后台侧边栏）
- 权限：**无需登录**，公开访问
- 功能：分类目录树、搜索、卡片/列表视图切换、详情抽屉（Markdown 渲染）
- API：调用公开 `/api/skills` 端点

### 管理后台 `/admin/hermes/skills`

- 布局：`admin`（左侧后台导航栏）
- 权限：需管理员登录
- 功能：多维筛选（Author/Project/Tag）、标签管理、Sync 按钮
- API：调用管理 `/api/admin/skills/*` 端点

---

## SKILL.md 文件格式

```yaml
---
name: ecs-deploy
description: 本地构建 Docker 镜像，打包为 tar，传输到 ECS 部署。
author: YYH
project: personal-website
triggers:
  - deploy to ecs
  - docker deploy
category: devops
---

# ECS 部署流程

## 核心原则
...
```

**字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 唯一标识，与文件夹名一致 |
| `description` | 否 | 简述，显示在卡片和列表中 |
| `author` | 否 | 作者标记，如 "YYH" |
| `project` | 否 | 所属项目，如 "personal-website" |
| `triggers` | 否 | 触发关键词列表 |
| `category` | 否 | **注意：此字段在 frontmatter 中存在但不使用**，category 由路径结构自动判定 |

---

## 已知 Skills 统计（2026-07-08）

| Category | 数量 | 说明 |
|----------|------|------|
| base | 7 | 直接在 skills/ 下，无子目录 |
| creative | 19 | 创意内容生成 |
| software-development | 13 | 软件开发流程 |
| productivity | 9 | 生产力工具 |
| devops | 6 | 部署运维（含 3 个 YYH 项目专用） |
| github | 6 | GitHub 工作流 |
| apple | 5 | macOS/iOS 工具 |
| autonomous-ai-agents | 5 | AI Agent 编排 |
| media | 5 | 媒体处理 |
| research | 5 | 学术研究 |
| 其他 | 13 | gaming, email, mcp, mlops, note-taking, red-teaming, remotion, smart-home, social-media, yuanbao |
| **总计** | **90** | |

### 项目专用 Skills（author=YYH, project=personal-website）

| Skill | Category | 说明 |
|-------|----------|------|
| ecs-deploy | devops | ECS 部署流程 |
| ecs-operations | devops | ECS 运维操作 |
| dockerfile-authoring | devops | Dockerfile 编写 |
| nuxt-3-fullstack | software-development | Nuxt 3 全栈模式 |
| phase-executor | software-development | 项目阶段执行 |

---

## 踩坑记录

### 1. HermesSkillTag 表结构错误（2026-07-08）

**现象**：Skills API 返回 500，管理后台点击 Hermes AI 跳转登录页

**原因**：手动在 ECS 创建 `HermesSkillTag` 表时用了错误的 schema（id/name/color/createdAt），而 Prisma 期望的是（id/skillName/tag/tagType/createdAt）关联表

**修复**：`DROP TABLE` + `CREATE TABLE` 重建正确 schema

**教训**：数据库 schema 变更必须以 `prisma/schema.prisma` 为准，手动 SQL 需对照 Prisma 模型

### 2. 磁盘满导致 Prisma 迁移失败（2026-07-08）

**现象**：ECS 容器启动但 API 静默崩溃

**原因**：Docker 旧镜像堆积（5个 × 3.5GB）→ 磁盘 100% → migration 失败 → 新 schema 未写入

**修复**：清理 Docker 镜像 + 手动 ALTER TABLE + 重启

**预防**：每次部署后清理旧镜像，部署前检查 `df -h /`

### 3. ecs-deploy 缺失（2026-07-08）

**现象**：5 个 YYH skill 中只有 4 个在数据库中

**原因**：`ecs-deploy` 在同步时因网络超时被跳过

**修复**：手动 INSERT 到数据库

**预防**：同步后检查数量是否一致，或增加重试机制
