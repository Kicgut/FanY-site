---
title: "照片回流架构与操作指南"
created: 2026-07-07 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 📅 创建日期：2026-07-07"
scope: "全阶段"
related: []
tags:
  - architecture
  - photo-system
---

# 照片回流架构与操作指南

> 📅 创建日期：2026-07-07
> 🎯 用途：记录照片从 ECS 回流到本地服务器的方案

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        照片回流架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  场景 1：远程上传（手机/电脑浏览器）                                  │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │ 用户浏览器      │ ──POST /api──────→│ ECS 容器       │          │
│  │ (手机/电脑)     │    photos/upload   │                │          │
│  └────────────────┘                    │ 1. 接收原图    │          │
│                                        │ 2. 生成缩略图  │          │
│                                        │ 3. 保存到临时  │          │
│                                        │ 4. 返回 photoId│          │
│                                        └───────┬────────┘          │
│                                                │                   │
│                                                ▼                   │
│                                        ┌────────────────┐          │
│                                        │ 照片回流脚本   │          │
│                                        │ photo-backflow │          │
│                                        │                │          │
│                                        │ 1. 原图→本地   │          │
│                                        │ 2. 缩略图留ECS │          │
│                                        │ 3. 更新DB状态  │          │
│                                        └────────────────┘          │
│                                                                     │
│  场景 2：本地上传（直接写入本地存储）                                │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │ 本地服务器      │ ─────────────────→│ 本地存储       │          │
│  │                │    直接写入        │ photos/        │          │
│  └────────────────┘                    └────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、存储位置说明

### 存储位置类型

| 位置 | 说明 | 存储内容 |
|------|------|---------|
| `ecs_only` | 只在 ECS | 刚上传，待回流 |
| `local_only` | 只在本地 | 本地上传的照片 |
| `ecs_and_local` | ECS + 本地 | ECS 有缩略图，本地有原图 |
| `archived` | 已归档 | 冷存储 |

### 同步状态

| 状态 | 说明 |
|------|------|
| `pending` | 待同步 |
| `syncing` | 正在同步 |
| `synced` | 已同步 |
| `failed` | 同步失败 |
| `skipped` | 跳过 |

### 文件路径结构

```
ECS 容器内:
/app/data/
├── photos/
│   ├── private/
│   │   └── 2026-07/
│   │       ├── uuid1_original.jpg
│   │       └── uuid2_original.jpg
│   └── public/
│       └── 2026-07/
│           └── uuid3_original.jpg
└── thumbnails/
    ├── private/
    │   └── 2026-07/
    │       ├── uuid1_thumb.jpg
    │       └── uuid1_medium.jpg
    └── public/
        └── 2026-07/
            ├── uuid3_thumb.jpg
            └── uuid3_medium.jpg

本地服务器:
/mnt/data/personal-website/
├── photos/
│   ├── private/
│   │   └── 2026-07/
│   │       ├── uuid1_original.jpg
│   │       └── uuid2_original.jpg
│   └── public/
│       └── 2026-07/
│           └── uuid3_original.jpg
└── thumbnails/
    ├── private/
    │   └── 2026-07/
    │       ├── uuid1_thumb.jpg
    │       └── uuid1_medium.jpg
    └── public/
        └── 2026-07/
            ├── uuid3_thumb.jpg
            └── uuid3_medium.jpg
```

---

## 三、API 接口

### 3.1 获取回流统计

**接口**：`GET /api/photos/backflow?action=stats`

**响应**：
```json
{
  "success": true,
  "data": {
    "pending": 10,
    "syncing": 0,
    "synced": 50,
    "failed": 2,
    "total": 62
  }
}
```

### 3.2 获取待回流照片列表

**接口**：`GET /api/photos/backflow?limit=50`

**响应**：
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": 1,
        "filename": "uuid1.jpg",
        "originalPath": "/app/data/photos/private/2026-07/uuid1_original.jpg",
        "visibility": "private",
        "storageLocation": "ecs_only",
        "syncStatus": "pending",
        "createdAt": "2026-07-07T12:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

### 3.3 触发回流操作

**接口**：`POST /api/photos/backflow`

**请求体**：
```json
{
  "action": "backflow-batch",
  "limit": 10
}
```

**可选 action**：
- `backflow-single` — 单个照片回流（需 photoId）
- `backflow-batch` — 批量回流（需 limit）
- `reset-failed` — 重置失败的照片

### 3.4 标记回流完成

**接口**：`POST /api/photos/backflow/complete`

**请求体**：
```json
{
  "photoId": 1,
  "localPath": "/mnt/data/personal-website/photos/private/2026-07/uuid1_original.jpg"
}
```

### 3.5 标记回流失败

**接口**：`POST /api/photos/backflow/fail`

**请求体**：
```json
{
  "photoId": 1,
  "error": "File copy failed"
}
```

---

## 四、脚本使用指南

### 4.1 照片回流脚本

**路径**：`nuxt-app/scripts/photo-backflow.sh`

**用法**：
```bash
cd /mnt/data/personal-website

# 查看统计
./scripts/photo-backflow.sh --stats

# 处理所有待回流照片
./scripts/photo-backflow.sh

# 处理指定数量
./scripts/photo-backflow.sh --limit 10

# 重置失败的照片
./scripts/photo-backflow.sh --reset-failed
```

**脚本功能**：
1. 从 API 获取待回流照片列表
2. 通过 SSH 从 ECS 容器复制原图到本地
3. 调用 API 标记完成/失败
4. 显示处理结果和统计

---

## 五、完整工作流程

### 5.1 远程上传流程

```
1. 用户通过浏览器上传照片
   └─→ POST /api/photos/upload

2. ECS 处理上传
   ├─→ 保存原图到 /app/data/photos/{visibility}/{YYYY-MM}/
   ├─→ 生成缩略图到 /app/data/thumbnails/{visibility}/{YYYY-MM}/
   ├─→ 创建数据库记录
   │   ├─ storageLocation = "ecs_only"
   │   └─ syncStatus = "pending"
   └─→ 返回 photoId

3. 照片回流（定时或手动）
   └─→ ./scripts/photo-backflow.sh
       ├─→ 获取待回流照片
       ├─→ 从 ECS 复制原图到本地
       ├─→ 标记完成
       │   ├─ storageLocation = "ecs_and_local"
       │   └─ syncStatus = "synced"
       └─→ ECS 保留缩略图用于展示

4. 后续访问
   ├─→ 缩略图：ECS 直接提供（快）
   └─→ 原图：通过 frp 从本地提供（需要时）
```

### 5.2 本地上传流程

```
1. 本地脚本或工具上传照片
   └─→ 直接写入 /mnt/data/personal-website/photos/

2. 生成缩略图
   └─→ 使用 sharp 生成到 /mnt/data/personal-website/thumbnails/

3. 同步缩略图到 ECS（可选）
   └─→ rsync thumbnails/ root@ecs:/opt/personal-website/uploads/

4. 更新数据库
   └─→ storageLocation = "local_only" 或 "ecs_and_local"
```

---

## 六、数据库字段说明

### Photo 模型相关字段

```prisma
model Photo {
  // ... 其他字段 ...
  
  storageLocation  String    @default("local")    // 存储位置
  syncStatus       String    @default("pending")  // 同步状态
  syncedAt         DateTime?                       // 同步完成时间
  syncError        String?                         // 同步错误信息
  originalPath     String?                         // 原图路径
  thumbPath        String?                         // 缩略图路径
  ecsThumbPath     String?                         // ECS 缩略图路径
}
```

### 存储位置枚举

```typescript
export const PHOTO_STORAGE_LOCATION = {
  ECS_ONLY: 'ecs_only',           // 只在 ECS
  LOCAL_ONLY: 'local_only',       // 只在本地
  ECS_AND_LOCAL: 'ecs_and_local', // ECS + 本地
  ARCHIVED: 'archived',           // 已归档
} as const
```

### 同步状态枚举

```typescript
export const PHOTO_SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const
```

---

## 七、常见操作

### 7.1 查看回流状态

```bash
./scripts/photo-backflow.sh --stats
```

输出示例：
```
照片回流状态统计
================
待回流: 10
正在同步: 0
已同步: 50
失败: 2
总计: 62
```

### 7.2 执行回流

```bash
# 处理所有待回流照片
./scripts/photo-backflow.sh

# 处理 10 张
./scripts/photo-backflow.sh --limit 10
```

### 7.3 重置失败的照片

```bash
./scripts/photo-backflow.sh --reset-failed
```

### 7.4 手动触发单个回流

```bash
# 1. 标记为正在同步
curl -X POST http://<ECS_HOST>/api/photos/backflow \
  -H "Content-Type: application/json" \
  -d '{"action": "backflow-single", "photoId": 1}'

# 2. 手动复制文件
ssh yyh-ecs "docker cp personal-website:/app/data/photos/private/2026-07/uuid1_original.jpg /tmp/"
scp yyh-ecs:/tmp/uuid1_original.jpg /mnt/data/personal-website/photos/private/2026-07/

# 3. 标记完成
curl -X POST http://<ECS_HOST>/api/photos/backflow/complete \
  -H "Content-Type: application/json" \
  -d '{"photoId": 1, "localPath": "/mnt/data/personal-website/photos/private/2026-07/uuid1_original.jpg"}'
```

---

## 八、故障排查

### 问题：回流脚本报错 "Connection refused"

**原因**：ECS 服务未启动或网络问题

**解决**：
```bash
# 检查 ECS 服务
ssh yyh-ecs "docker ps | grep personal"

# 检查 API
curl http://<ECS_HOST>/api/photos/backflow?action=stats
```

### 问题：照片状态一直是 "syncing"

**原因**：回流过程中断

**解决**：
```bash
# 重置失败的照片
./scripts/photo-backflow.sh --reset-failed
```

### 问题：本地路径不存在

**原因**：目录结构未创建

**解决**：
```bash
# 创建目录
mkdir -p /mnt/data/personal-website/photos/{private,public,friends}
```

---

## 九、文件清单

| 文件 | 位置 | 用途 |
|------|------|------|
| `photo-backflow.ts` | `server/services/` | 回流服务逻辑 |
| `backflow.get.ts` | `server/api/photos/` | 获取回流状态 |
| `backflow.post.ts` | `server/api/photos/` | 触发回流操作 |
| `backflow/complete.post.ts` | `server/api/photos/` | 标记完成 |
| `backflow/fail.post.ts` | `server/api/photos/` | 标记失败 |
| `photo-backflow.sh` | `scripts/` | 回流脚本 |
| `schema.prisma` | `prisma/` | 数据库模型 |

---

*最后更新：2026-07-07*
