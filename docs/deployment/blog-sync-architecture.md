---
title: "博客内容同步架构与操作指南"
created: 2026-07-07
updated: 2026-07-07
status: final
purpose: "> 📅 创建日期：2026-07-07"
scope: "全阶段"
tags:
  - deployment
---

# 博客内容同步架构与操作指南

> 📅 创建日期：2026-07-07
> 🎯 用途：记录博客系统的内容导入、导出、同步方案

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        博客内容流向全景图                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  场景 1：本地 MD → ECS 数据库（批量导入）                            │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │ 本地 MD 文件    │ ──import-blogs.sh─→│ ECS 数据库     │          │
│  └────────────────┘                    │ + blog-md/备份  │          │
│                                        └────────────────┘          │
│                                                                     │
│  场景 2：ECS 数据库 → 本地 MD（冷存储导出）                          │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │ ECS 数据库     │ ──export-blogs.sh─→│ 本地 MD 文件    │          │
│  └────────────────┘                    └────────────────┘          │
│                                                                     │
│  场景 3：ECS blog-md/ → 本地备份（同步备份）                         │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │ ECS blog-md/   │ ──sync-blogs.sh──→│ 本地备份目录    │          │
│  └────────────────┘                    └────────────────┘          │
│                                                                     │
│  场景 4：后台创建博客                                                │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │ 浏览器（任意）  │ ──POST /api──────→│ ECS 数据库     │          │
│  │ 本地/手机      │                    │ + blog-md/备份  │          │
│  └────────────────┘                    └────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、存储位置说明

### ECS 容器内

```
/app/
├── data/
│   ├── prod.db              ← 数据库（所有文章）
│   └── blog-md/             ← MD 备份目录
│       ├── article-1.md
│       ├── article-2.md
│       └── ...
└── public/
    └── uploads/
        └── article-images/  ← 文章配图
```

### 本地服务器

```
/mnt/data/personal-website/
├── docs/                    ← 原始 MD 文档（待导入）
├── nuxt-app/
│   └── scripts/             ← 同步脚本
│       ├── import-blogs.sh
│       ├── export-blogs.sh
│       └── sync-blogs-from-ecs.sh
└── blog-backup/             ← 从 ECS 同步的备份（可选）
```

---

## 三、API 接口

### 3.1 批量导入 API

**接口**：`POST /api/articles/import-content`

**请求体**：
```json
{
  "title": "文章标题",
  "content": "文章正文（Markdown）",
  "slug": "custom-slug",           // 可选，不传则自动生成
  "description": "文章摘要",       // 可选
  "tags": ["tag1", "tag2"],        // 可选
  "status": "published"            // 可选，默认 published
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "slug": "article-slug",
    "content": "...",
    "status": "published",
    "tags": [{ "id": 1, "name": "tag1" }]
  }
}
```

**副作用**：
- 写入数据库 Article 表
- 生成 MD 备份文件到 `/app/data/blog-md/<slug>.md`

---

### 3.2 批量导出 API

**接口**：`GET /api/articles?export=md`

**查询参数**：
- `export=md` — 必须，触发导出模式
- `status=published` — 可选，按状态筛选
- `tag=vue` — 可选，按标签筛选

**响应**：
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "slug": "article-slug",
      "title": "文章标题",
      "status": "published",
      "tags": ["tag1", "tag2"],
      "createdAt": "2026-07-06T12:00:00.000Z",
      "publishedAt": "2026-07-06T12:00:00.000Z",
      "md": "---\ntitle: \"文章标题\"\nslug: \"article-slug\"\n...\n---\n\n正文内容..."
    }
  ]
}
```

**注意**：
- 通过 Nginx 80 端口访问：`http://120.26.231.150/api/articles?export=md`
- 不要直接访问 frp 端口 7080

---

### 3.3 后台创建博客

**接口**：`POST /api/articles`

**请求体**：
```json
{
  "title": "文章标题",
  "content": "文章正文",
  "description": "摘要",
  "tags": ["tag1"],
  "status": "draft"
}
```

**副作用**：
- 写入数据库
- 生成 MD 备份（所有状态都写，不只是 published）

**访问方式**：
- 后台管理：`http://120.26.231.150/admin/blog/new`
- 本地浏览器和手机浏览器完全相同，无区别

---

## 四、脚本使用指南

### 4.1 批量导入脚本

**路径**：`nuxt-app/scripts/import-blogs.sh`

**用法**：
```bash
cd /mnt/data/personal-website

# 导入目录下所有 MD 文件
./scripts/import-blogs.sh /path/to/md-files

# 指定状态
./scripts/import-blogs.sh /path/to/md-files draft

# 示例：导入 docs/architecture 目录
./scripts/import-blogs.sh ./docs/architecture
```

**脚本功能**：
1. 扫描指定目录下的所有 `.md` 文件
2. 解析 frontmatter（如果有）提取 title、tags 等
3. 读取文件内容
4. 调用 `POST /api/articles/import-content` 导入
5. 跳过已存在的文章（按 slug 判断）

**Frontmatter 格式**（可选）：
```markdown
---
title: 文章标题
tags: [tag1, tag2]
status: published
---

正文内容...
```

如果没有 frontmatter，脚本会从文件名提取标题。

---

### 4.2 批量导出脚本

**路径**：`nuxt-app/scripts/export-blogs.sh`

**用法**：
```bash
cd /mnt/data/personal-website

# 导出所有文章
./scripts/export-blogs.sh ./blog-cold-storage

# 只导出已发布文章
./scripts/export-blogs.sh ./blog-cold-storage published
```

**脚本功能**：
1. 调用 `GET /api/articles?export=md` 获取所有文章
2. 逐个保存为 MD 文件
3. 生成导出报告 `export-report.md`
4. 跳过已存在的文件

**输出示例**：
```
./blog-cold-storage/
├── article-1.md
├── article-2.md
├── article-3.md
└── export-report.md
```

---

### 4.3 同步 ECS 备份脚本

**路径**：`nuxt-app/scripts/sync-blogs-from-ecs.sh`

**用法**：
```bash
cd /mnt/data/personal-website

# 同步到默认目录
./scripts/sync-blogs-from-ecs.sh

# 同步到指定目录
./scripts/sync-blogs-from-ecs.sh ./blog-backup
```

**脚本功能**：
1. 通过 SSH 连接 ECS
2. 从 Docker 容器复制 `/app/data/blog-md/` 到 ECS 宿主机
3. 通过 SCP 复制到本地
4. 清理 ECS 临时文件

**前提条件**：
- SSH 免密登录已配置
- ECS 上的 blog-md 目录已存在

---

## 五、部署流程

### 5.1 代码更新部署

```bash
# 1. 本地修改代码
cd /mnt/data/personal-website/nuxt-app

# 2. 提交并推送
git add -A
git commit -m "feat: 描述"
git push

# 3. 本地构建 Docker 镜像
sudo docker build -t personal-website:latest .

# 4. 保存为 tar 文件
sudo docker save personal-website:latest | gzip > /tmp/personal-website-latest.tar.gz

# 5. 上传到 ECS
scp /tmp/personal-website-latest.tar.gz root@120.26.231.150:/tmp/

# 6. ECS 上加载并重启
ssh root@120.26.231.150 "docker load < /tmp/personal-website-latest.tar.gz && \
  docker tag personal-website:latest personal-website:v3 && \
  docker rm -f personal-website && \
  cd /opt/personal-website && docker compose up -d"
```

### 5.2 为什么本地构建？

ECS 只有 1.6GB 内存，无法运行 `docker build`。必须在本地构建后上传。

### 5.3 Docker Compose 配置

ECS 上的 `docker-compose.yml` 使用预构建镜像：
```yaml
services:
  app:
    image: personal-website:latest   # 使用预构建镜像
    # build:
    #   context: .                   # 不要用 build
    container_name: personal-website
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/public/uploads
```

---

## 六、网络架构

```
用户浏览器
    │
    ▼
ECS:80 (Nginx)
    │
    ├── /api/*        → Docker:3000 (Nuxt API)
    ├── /blog/*       → Docker:3000 (博客页面)
    ├── /admin/*      → Docker:3000 (后台管理)
    ├── /skills-api/* → frp:7080 → 本地:9800 (Skills API)
    └── /*            → Docker:3000 (其他页面)
```

**重要**：
- 所有 API 通过 Nginx 80 端口访问
- frp 端口 7080 是内部端口，不对外暴露
- 测试 URL：`http://120.26.231.150/api/articles`

---

## 七、常见操作

### 7.1 导入新的 MD 文件夹

```bash
# 1. 确认 MD 文件位置
ls /mnt/data/personal-website/docs/new-folder/

# 2. 执行导入
./scripts/import-blogs.sh ./docs/new-folder

# 3. 验证
curl -s "http://120.26.231.150/api/articles" | jq '.total'
```

### 7.2 导出所有博客为冷存储

```bash
# 1. 创建冷存储目录
mkdir -p ./blog-cold-storage/$(date +%Y-%m)

# 2. 执行导出
./scripts/export-blogs.sh ./blog-cold-storage/$(date +%Y-%m)

# 3. 查看报告
cat ./blog-cold-storage/$(date +%Y-%m)/export-report.md
```

### 7.3 从后台创建博客

1. 访问 `http://120.26.231.150/admin/blog/new`
2. 填写标题、内容、标签
3. 选择状态（draft/published）
4. 点击"创建文章"

创建后会自动：
- 写入数据库
- 生成 MD 备份到 ECS 的 `/app/data/blog-md/`

### 7.4 同步 ECS 备份到本地

```bash
./scripts/sync-blogs-from-ecs.sh ./blog-backup
```

---

## 八、故障排查

### 问题：导出脚本报错 "Connection refused"

**原因**：ECS 服务未启动或 Nginx 未运行

**解决**：
```bash
# 检查 ECS 服务状态
ssh root@120.26.231.150 "docker ps | grep personal"
ssh root@120.26.231.150 "systemctl status nginx"
```

### 问题：导入时提示 "Article already exists"

**原因**：slug 已存在

**解决**：
- 跳过该文章（脚本会自动跳过）
- 或者手动删除后重新导入

### 问题：ECS 容器启动失败

**原因**：可能是端口占用或镜像问题

**解决**：
```bash
# 查看日志
ssh root@120.26.231.150 "docker logs personal-website"

# 强制重建
ssh root@120.26.231.150 "docker rm -f personal-website && cd /opt/personal-website && docker compose up -d"
```

---

## 九、文件清单

| 文件 | 位置 | 用途 |
|------|------|------|
| `import-content.post.ts` | `server/api/articles/` | 导入 API |
| `index.get.ts` | `server/api/articles/` | 导出 API（?export=md） |
| `index.post.ts` | `server/api/articles/` | 创建 API |
| `import-blogs.sh` | `scripts/` | 批量导入脚本 |
| `export-blogs.sh` | `scripts/` | 批量导出脚本 |
| `sync-blogs-from-ecs.sh` | `scripts/` | 同步 ECS 备份脚本 |

---

*最后更新：2026-07-07*
