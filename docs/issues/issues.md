---
title: "踩坑日志（问题记录）"
created: 2026-07-07 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 每个小阶段遇到的问题增量追加，通用性高的问题写详细，后续阶段可按需查阅。"
scope: "全阶段"
related: []
tags:
  - issues
---

# 踩坑日志（问题记录）

> 每个小阶段遇到的问题增量追加，通用性高的问题写详细，后续阶段可按需查阅。

---

## 阶段 1.1 — 项目初始化与 Nuxt 3 核心概念

### 问题 1：Codex sandbox bwrap 网络错误
- **现象：** `codex exec --full-auto` 所有 shell 命令报 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`
- **原因：** Codex 默认 sandbox 模式（bubblewrap）在当前环境下无法创建 loopback 网络接口
- **解决：** 使用 `--dangerously-bypass-approvals-and-sandbox` 参数绕过 sandbox
- **通用性：** ⭐ 高 — 后续所有 Codex 调用都需要用此参数

### 问题 2：npx/npm 在 Node v24.18.0 上报错
- **现象：** `npx nuxi init` 报 `Class extends value undefined is not a constructor or null`
- **原因：** Hermes 自带的 npm 11.16.0 与 Node v24 存在兼容性问题
- **解决：** 使用 pnpm 代替 npm/npx（通过 `curl | sh` 安装 pnpm）
- **通用性：** ⭐ 高 — 所有包管理操作都用 pnpm，不要用 npm/npx

### 问题 3：nuxi init 模板下载失败
- **现象：** `pnpm dlx nuxi init . --template minimal` 报 `Failed to download template from registry: fetch failed`
- **原因：** GitHub rawusercontent 在当前网络环境下不可达（需要代理）
- **解决：** 手动创建了等效的项目文件（package.json、nuxt.config.ts、app.vue、pages/index.vue）
- **通用性：** ⭐ 中 — 涉及 GitHub 的操作可能需要代理，但 pnpm registry 正常

### 问题 4：pnpm postinstall 构建脚本被阻止
- **现象：** `pnpm install` 后提示 `ERR_PNPM_IGNORED_BUILDS`，@parcel/watcher 和 esbuild 的 postinstall 未执行
- **原因：** pnpm 新版本默认阻止第三方包的构建脚本（安全策略）
- **解决：** 运行 `pnpm approve-builds @parcel/watcher esbuild` 后重新 install
- **通用性：** ⭐ 高 — 后续安装新依赖时可能再次遇到，记得 approve-builds

### 问题 5：Git 未配置用户信息
- **现象：** `git commit` 报 `Author identity unknown`
- **原因：** 该环境未设置 git user.name 和 user.email
- **解决：** `git config user.email "user@example.com" && git config user.name "User"`
- **通用性：** ⭐ 中 — 已全局配置，后续不会再遇到


## 阶段 1.2 — Vue 3 基础与首页设计

### 问题 1：Codex apply_patch 参数解析错误
- **现象：** `failed to parse function arguments: invalid type: string "92a113", expected i32`
- **原因：** Codex 内部 apply_patch 工具的参数类型错误（可能是 mimo 模型输出格式问题）
- **解决：** Codex 自动回退到 shell `cat > file << 'EOF'` 方式写文件，功能未受影响
- **通用性：** ⭐ 中 — mimo 模型偶尔输出格式不标准，但 Codex 有自动降级机制


---

## 🐳 Docker 部署踩坑记录（2026-07-04）

### 问题：Dockerfile 与本地环境不一致导致构建失败

**时间**：2026-07-04 16:00-16:30
**阶段**：5.1 Docker 基础与应用容器化
**影响**：ECS 上 `docker build` 连续失败 4 次

### 错误日志

| 次数 | 错误信息 | 根本原因 |
|------|---------|---------|
| 1 | `error: pnpm@9.15.4: pnpm@9.15.4 cannot be found` | corepack prepare 指定了不存在的 pnpm 版本 |
| 2 | `sh: playwright: not found` | COPY . . 把 devDependencies 的 postinstall 脚本也复制进去了 |
| 3 | `ERR_PNPM_FROZEN_LOCKFILE_INSTALLED_MISMATCH` | Dockerfile 指定 pnpm@9.6.0，但 lockfile 是 pnpm@11 生成的 |
| 4 | `gyp: python3: No such file or directory` | Dockerfile 没装 python3、make、g++（better-sqlite3 编译需要） |

### 根本原因分析

**核心问题：写 Dockerfile 时"凭记忆"而不是"逐行对照本地环境"。**

具体错误：
1. **版本号瞎编**：pnpm@9.15.4 不存在，应该查 `pnpm --version` 确认实际是 11.9.0
2. **依赖分析不彻底**：better-sqlite3 是原生 C++ 模块，需要 python3 + make + g++ 编译，但我没检查它的编译依赖
3. **COPY . . 太粗暴**：把所有文件都复制进去，包括 devDependencies 的 postinstall 脚本
4. **lockfile 不匹配**：Dockerfile 指定的 pnpm 版本和生成 lockfile 的版本不一致

### 修复过程

| 次数 | 修复内容 | 结果 |
|------|---------|------|
| 1 | `pnpm@9.15.4` → `pnpm@11.9.0` | ✅ 版本正确 |
| 2 | 移除 `@playwright/test`，添加 `pnpm-workspace.yaml` COPY | ✅ 依赖正确 |
| 3 | `pnpm@9.6.0` → `pnpm@11.9.0` | ✅ lockfile 匹配 |
| 4 | 添加 `apk add python3 make g++` | ✅ 编译工具就绪 |

### 教训与改进

**原则：写 Dockerfile 前，先完整记录本地环境。**

```bash
# 1. 记录本地版本
node --version          # v24.18.0
pnpm --version          # 11.9.0
head -5 pnpm-lock.yaml  # 检查 lockfile 版本

# 2. 检查原生模块
ls node_modules/ | grep -E "sqlite|bcrypt|sharp"  # 这些需要编译

# 3. 检查编译依赖
# better-sqlite3 需要 python3 + make + g++
# bcryptjs 是纯 JS，不需要编译

# 4. 对照写 Dockerfile
# FROM node:22-alpine  （不是 node:24！）
# RUN corepack prepare pnpm@11.9.0  （和本地一致！）
```

### 改进后的 Dockerfile 编写流程

```
1. 记录本地环境 → node/pnpm 版本、依赖列表
2. 分析依赖 → 运行时/编译时/开发依赖
3. 编写 Dockerfile → 对照本地版本
4. 本地测试 → docker build + docker run
5. 推送 GitHub → git add/commit/push
6. ECS 部署 → git pull + docker build + docker run
```

---

### 问题：ECS 内存不足（1.6GB RAM）

**时间**：2026-07-04 16:20
**影响**：Docker build 过程中 OOM（内存溢出）

**解决方案**：
```bash
# 创建 Swap 文件（虚拟内存）
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**原理**：Swap 是磁盘上的虚拟内存，当 RAM 不足时，系统会把不活跃的内存数据写到 Swap。ECS 只有 1.6GB RAM，Docker build 需要 ~2GB，所以必须开 Swap。

---

### 问题：ECS 无法访问 GitHub

**时间**：2026-07-04 15:50
**影响**：`git clone/pull` 超时

**解决方案**：SSH 反向隧道
```bash
# 本地执行（让 ECS 通过本地代理访问 GitHub）
ssh -R 17897:127.0.0.1:7897 root@120.26.231.150 -N -f

# ECS 上配置 git 代理
git config --global http.proxy http://127.0.0.1:17897
```

**原理**：ECS 无法直接访问 GitHub，但可以通过 SSH 隧道把请求转发到本地，本地再通过代理访问。

---

### 问题：Docker Hub 镜像拉取失败

**时间**：2026-07-04 16:10
**影响**：`docker pull node:22-alpine` 超时

**解决方案**：配置阿里云 Docker 镜像加速
```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF
systemctl daemon-reload
systemctl restart docker
```

**原理**：Docker Hub 在国外，ECS 访问慢。阿里云镜像加速器是国内 CDN，拉取速度快 10 倍以上。

---

### 总结：Docker 部署的关键检查清单

```
✅ 本地环境版本记录（node、pnpm）
✅ 原生模块编译依赖（python3、make、g++）
✅ lockfile 版本匹配
✅ COPY 精确（先 package.json，再源码）
✅ 本地测试（docker build + docker run）
✅ ECS Swap 配置（内存不足时）
✅ Docker 镜像加速（国内服务器）
✅ Git 代理配置（无法访问 GitHub 时）
```


---

### 问题：Nginx 配置修改后仍显示默认页面

- **时间**：2026-07-04 19:30
- **现象**：配置好反向代理后，访问 80 端口显示 "Welcome to nginx!" 默认页
- **原因**：
  1. 最初 `/etc/nginx/sites-enabled/` 里有 `default` 文件和 `personal-website` 冲突
  2. 删除 `default` 后执行了 `systemctl reload nginx`，但主进程仍用旧配置
  3. `killall nginx` 后手动执行 `nginx` 启动，但 systemd 无法管理手动启动的进程
- **解决**：
  ```bash
  killall nginx                          # 杀掉手动启动的进程
  systemctl start nginx                  # 用 systemd 启动（会加载最新配置）
  systemctl enable nginx                 # 开机自启
  ```
- **教训**：
  - 修改 Nginx 配置后，用 `systemctl restart nginx` 而不是 `reload`
  - 如果 reload 不生效，需要完全杀掉进程重启
  - 始终用 systemd 管理 Nginx，不要手动 `nginx` 命令启动
- **通用性**：⭐ 中 — Nginx 配置变更后需注意


---

## 🚀 博客系统部署踩坑记录（2026-07-06）

### 问题 1：Nuxt 3 动态路由优先级导致 API 冲突

**时间**：2026-07-06 22:50
**现象**：访问 `/api/articles/export-md` 返回 `"Invalid article ID"`
**原因**：
- Nuxt 3 文件路由中，`[id].get.ts`（动态路由）优先级高于 `export-md.get.ts`（静态路由）
- `export-md` 被当作 `id="export-md"` 传给 `[id].get.ts`

**尝试的修复**：
1. 重命名为 `export.get.ts` → 仍然冲突
2. 移到子目录 `export/index.get.ts` → 仍然冲突

**最终解决方案**：
- 删除独立的导出文件
- 把导出功能合并到 `index.get.ts`，使用查询参数 `?export=md`

```typescript
// server/api/articles/index.get.ts
const exportMode = query.export === 'md'

if (exportMode) {
  // 返回所有文章的 MD 格式
  const articles = await prisma.article.findMany({ ... })
  return { success: true, count: articles.length, data: mdArticles }
}
```

**教训**：
- Nuxt 3 的 `[param]` 动态路由会吃掉所有同级路径
- 需要"动词"类 API 时，用查询参数 `?action=xxx` 而不是路径 `/action`
- 或者放到子目录 `articles/export/index.get.ts`（但本次测试仍冲突，原因待查）

**通用性**：⭐ 高 — Nuxt 3 路由设计需注意

---

### 问题 2：Docker Compose 使用 build 而非预构建镜像

**时间**：2026-07-06 23:00
**现象**：本地构建的镜像上传到 ECS 后，容器仍使用旧代码
**原因**：
```yaml
# 原来的 docker-compose.yml
services:
  app:
    build:
      context: .        # ← 每次都从 Dockerfile 重新构建
      dockerfile: Dockerfile
```
ECS 内存不足无法构建，所以 `docker compose up -d` 失败或使用旧镜像。

**解决方案**：
```yaml
# 修改后的 docker-compose.yml
services:
  app:
    image: personal-website:latest   # ← 直接使用预构建镜像
    container_name: personal-website
```

**部署流程**：
```bash
# 本地构建
docker build -t personal-website:latest .
docker save personal-website:latest | gzip > /tmp/image.tar.gz

# 上传到 ECS
scp /tmp/image.tar.gz root@ecs:/tmp/

# ECS 上加载并启动
docker load < /tmp/image.tar.gz
docker compose up -d
```

**教训**：
- ECS 内存不足时，必须在本地构建后上传
- docker-compose.yml 应使用 `image:` 而不是 `build:`
- 或者准备两套 compose 文件：本地开发用 `build:`，ECS 部署用 `image:`

**通用性**：⭐ 高 — ECS 部署流程

---

### 问题 3：Prisma Schema 字段不匹配

**时间**：2026-07-06 22:10
**现象**：代码中使用 `article.category` 但数据库报错
**原因**：Article 表没有 `category` 字段，但代码中引用了

```prisma
# 实际的 Article 模型
model Article {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @unique
  content     String
  description String?
  coverImage  String?
  status      String    @default("draft")
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  tags        Tag[]
  # 没有 category 字段！
}
```

**解决方案**：删除所有 `category` 相关代码

**教训**：
- 写代码前先检查 `prisma/schema.prisma` 确认字段
- 不要假设字段存在

**通用性**：⭐ 中 — 数据库操作需对照 schema

---

### 问题 4：frp 端口访问方式误解

**时间**：2026-07-06 23:30
**现象**：直接访问 `http://120.26.231.150:7080/api/articles` 返回 404
**原因**：7080 是 frp 内部端口，不对外暴露

**正确的访问路径**：
```
✓ http://120.26.231.150/api/articles        (通过 Nginx:80)
✗ http://120.26.231.150:7080/api/articles   (frp 内部端口)
```

**架构理解**：
```
用户 → ECS:80 (Nginx)
         ├── /api/*        → Docker:3000 (Nuxt)
         ├── /skills-api/* → frp:7080 → 本地:9800
         └── /*            → Docker:3000 (Nuxt)
```

**教训**：
- frp 端口是内部隧道端口，只通过 Nginx 代理访问
- 测试 API 时使用 Nginx 的 80 端口，不要直接访问 frp 端口

**通用性**：⭐ 高 — 网络架构理解


---

### 总结：博客系统部署检查清单

```
✅ Nuxt 路由设计：避免动态路由冲突，用查询参数处理"动词"操作
✅ Docker Compose：ECS 用 image:，本地用 build:
✅ Prisma Schema：写代码前确认字段存在
✅ 网络架构：frp 端口只通过 Nginx 代理访问
✅ 本地构建：ECS 内存不足时，本地 build → save → upload → load
✅ 测试验证：每次部署后测试 API 是否正常
```
