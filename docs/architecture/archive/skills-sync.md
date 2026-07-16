---
title: "Hermes Skills 同步架构"
created: 2026-07-08 00:00
updated: 2026-07-15 23:29
status: archived
purpose: "Skills 通过 frp 隧道从本地同步到 ECS 的架构说明（已被 hermes-skills-architecture.md 替代）"
scope: "全阶段"
related:
  - path: "../hermes-skills-architecture.md"
    relation: "superseded-by"
tags:
  - architecture
  - archived
---

# Hermes Skills 同步架构

## 背景

Hermes Agent 的 skills 存储在本地服务器 `~/.hermes/skills/` 目录下（89 个 SKILL.md 文件）。
Admin 后台需要展示这些 skills，但 ECS 上没有这些文件。

**解决方案**: 通过 frp 隧道，让 ECS 上的 Nuxt App 实时从本地 Skills API 获取数据并写入 SQLite。

## 数据流

```
本地服务器                                    ECS Docker 容器
┌─────────────────────────┐                ┌─────────────────────────────┐
│                         │                │                             │
│ ~/.hermes/skills/       │                │  Admin 后台                  │
│ ├── apikey-image-gen/   │                │  pages/admin/skills.vue     │
│ │   └── SKILL.md        │                │         │                   │
│ ├── apple/              │                │         ▼                   │
│ │   ├── apple-notes/    │                │  GET /api/admin/skills      │
│ │   └── ...             │                │  GET /api/admin/skills/sync │
│ ├── creative/           │                │         │                   │
│ │   ├── ascii-art/      │                │         ▼                   │
│ │   └── ...             │                │  syncSkillsToDb()           │
│ └── ... (89 个)         │                │  (skill-registry.ts)        │
│                         │                │         │                   │
│ Skills API (:9800)      │    frp 隧道     │         ▼                   │
│ Python HTTP 服务        │←──────────────→│  fetch(skills.local:7080)   │
│ 返回 JSON skills 列表    │                │         │                   │
│                         │                │         ▼                   │
│ frpc                    │                │  Prisma upsert              │
│ → skills.local:7080     │                │  → HermesSkill 表           │
└─────────────────────────┘                └─────────────────────────────┘
```

## 组件详解

### 1. Skills API (本地 Python 服务)

**位置**: 本地服务器端口 9800
**功能**: 扫描 `~/.hermes/skills/` 目录，返回 JSON 格式的 skills 列表

**启动方式**:
```bash
# 在本地服务器运行
python3 ~/.hermes/scripts/skills-api.py  # 或等效服务
# 监听 http://localhost:9800
```

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "name": "ascii-art",
      "category": "creative",
      "path": "/home/aloof/.hermes/skills/creative/ascii-art/SKILL.md",
      "description": "ASCII art: pyfiglet, cowsay, boxes, image-to-ascii.",
      "status": "active",
      "riskLevel": "low",
      "usageCount": 0
    }
    // ... 共 89 个
  ]
}
```

### 2. frp 隧道

**frpc (本地)** → **frps (ECS)**

| 配置项 | 值 |
|--------|-----|
| 本地端口 | 9800 |
| 域名 | `skills.local` |
| vhost 端口 | 7080 |
| 协议 | HTTP (vhost 路由) |

**关键**: frps 根据 HTTP `Host: skills.local` 头进行路由，因此请求必须包含正确的 Host header。

### 3. Docker 网络配置

```yaml
# docker-compose.yml
services:
  app:
    extra_hosts:
      - "skills.local:host-gateway"
```

`extra_hosts` 将 `skills.local` 解析到宿主机网关 IP（通常是 `172.17.0.1`）。
这样容器内的 `fetch("http://skills.local:7080")` 会：
1. DNS 解析 `skills.local` → 宿主机 IP
2. TCP 连接到宿主机的 7080 端口（即 frps vhost 端口）
3. HTTP 请求头 `Host: skills.local` 触发 frps vhost 路由
4. frps 通过隧道转发到本地 9800 端口

### 4. Nuxt 后端同步逻辑

**文件**: `server/services/skill-registry.ts`

```typescript
function getSkillsApiUrl(): string {
  return process.env.SKILLS_API_URL || http://skills.local:7080
}

async function fetchRemoteSkills(): Promise<RemoteSkill[]> {
  const url = getSkillsApiUrl()
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json()
  return data.data
}

export async function syncSkillsToDb() {
  const remoteSkills = await fetchRemoteSkills()
  // Prisma upsert: 有则更新，无则创建
  for (const skill of remoteSkills) {
    await prisma.hermesSkill.upsert({
      where: { name: skill.name },
      update: { description: skill.description, category: skill.category, ... },
      create: { name: skill.name, description: skill.description, ... },
    })
  }
}
```

### 5. Admin API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/skills` | 查询 skills 列表（分页、筛选） |
| POST | `/api/admin/skills/sync` | 触发同步（从本地拉取 → 写入 DB） |
| GET | `/api/admin/skills/stats` | 统计信息（总数、分类分布） |

### 6. 数据库模型

```prisma
model HermesSkill {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  category    String
  description String?
  path        String
  status      String   @default("active")
  riskLevel   String   @default("low")
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 同步流程图

```
用户打开 Admin → Skills 页面
         │
         ▼
前端 GET /api/admin/skills?page=1&pageSize=20
         │
         ▼
后端查询 SQLite HermesSkill 表 → 返回列表
         │
    ┌────┴────┐
    │ 有数据   │ 无数据
    ▼         ▼
  展示列表   提示「请点击同步」
                │
                ▼
         前端 POST /api/admin/skills/sync
                │
                ▼
         syncSkillsToDb()
                │
                ▼
         fetch("http://skills.local:7080")
                │
         ┌──────┴──────┐
         │ 成功         │ 失败
         ▼              ▼
    返回 89 个 skills  返回错误信息
         │              (隧道断开/API 未启动)
         ▼
    Prisma upsert × 89
         │
         ▼
    返回 { synced: 89, total: 89 }
         │
         ▼
    前端刷新列表展示
```

## 踩坑记录

### 1. Docker 容器内 DNS 无法解析 `skills.local`

**症状**: sync API 返回 `{ synced: 0, total: 0 }`
**原因**: Docker 容器使用独立 DNS，无法解析 frp 的自定义域名
**解决**: `docker-compose.yml` 添加 `extra_hosts: ["skills.local:host-gateway"]`

### 2. frp vhost 路由需要正确的 Host header

**症状**: 使用 `host.docker.internal:7080` 能连通但返回 404
**原因**: frps 根据 `Host` header 路由，`host.docker.internal` 不匹配 `skills.local`
**解决**: 使用 `extra_hosts` 让 `skills.local` 直接解析到宿主机，保持 Host header 一致

### 3. Prisma migrate 在生产环境冲突

**症状**: `prisma migrate deploy` 报 migration 冲突
**原因**: 手动执行 SQL migration 与 Prisma 内部记录不一致
**解决**: `scripts/start.sh` 使用 fallback: `prisma migrate deploy || prisma db push`

### 4. 本地 Skills API 未启动

**症状**: sync 返回 `{ synced: 0, total: 0 }` 但无报错
**原因**: `fetchRemoteSkills()` 静默捕获错误返回空数组
**解决**: 检查本地 `ss -tlnp | grep 9800` 确认 API 运行中

## 运维检查清单

Skills 不显示时，按以下顺序排查：

```bash
# 1. 本地 Skills API 是否运行？
curl http://localhost:9800/

# 2. frp 隧道是否连通？（从 ECS 测试）
ssh root@120.26.231.150 "curl -s http://skills.local:7080/ | head -1"

# 3. 容器内能否访问？（需要 Host header）
ssh root@120.26.231.150 "docker exec personal-website wget -q -O- http://skills.local:7080/ | head -1"

# 4. 数据库有多少条？
ssh root@120.26.231.150 "docker exec personal-website node -e \"
  const p = new (require(@prisma/client).PrismaClient)();
  p.hermesSkill.count().then(c => { console.log(c); p.\\\$disconnect(); });
\""

# 5. 手动触发同步
curl -X POST http://120.26.231.150:3000/api/admin/skills/sync \
  -H "Authorization: Bearer <token>"
```

## 更新日志

### 2026-07-07: Details 获取完整内容

**问题**: 点击 Details 只显示占位文本（"Full SKILL.md content is on the local server"）
**原因**: `getSkillDetails()` 没有调用 frp 隧道，只拼了元数据摘要
**修复**: 改为请求 `http://skills.local:7080/skills/{name}` 获取完整 SKILL.md 原文
**本地 API**: 已有 `/skills/{name}` 端点，返回 `{ success, data: { skill, content } }`
