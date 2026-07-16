---
title: "Docker 部署原理与实践教学"
created: 2026-07-04 00:00
updated: 2026-07-15 23:29
status: final
purpose: "> 📅 写于：2026-07-04"
scope: "全阶段"
related: []
tags:
  - learning-notes
  - deployment
---

# Docker 部署原理与实践教学

> 📅 写于：2026-07-04
> 🎯 阶段：5.1 Docker 基础与应用容器化
> 💡 核心问题：如何通过 Docker 将本地代码快速部署到 ECS？

---

## 一、Docker 是什么？为什么需要它？

### 1.1 传统部署的痛点

想象你要把一个 Node.js 项目部署到服务器，传统做法是：

```
1. SSH 登录服务器
2. 安装 Node.js（版本要对）
3. 安装 pnpm（版本要对）
4. 复制代码到服务器
5. pnpm install（依赖要编译的还要装 gcc、python3）
6. nuxt build（构建）
7. 配置环境变量
8. 启动服务
```

**问题**：
- 每次部署都要重复这些步骤
- 服务器环境和本地不一样时会出各种奇怪的错误
- 换一台服务器又要从头来
- 团队协作时"在我机器上能跑"是经典借口

### 1.2 Docker 的解决方案

Docker 的核心思想是 **"打包一次，到处运行"**：

```
本地开发 → 写 Dockerfile → docker build → 得到镜像（Image）
                                    ↓
                              传到任何服务器
                                    ↓
                              docker run → 容器启动，环境一致
```

**镜像（Image）** = 一个只读的文件系统快照，包含：
- 操作系统（Alpine Linux，只有 5MB）
- 运行时（Node.js 22）
- 依赖库（pnpm、gcc、python3）
- 你的代码
- 启动命令

**容器（Container）** = 镜像的运行实例，就像一个轻量级虚拟机（但不是 VM）。

---

## 二、Docker 的核心特性

### 2.1 环境一致性（最重要！）

| 特性 | 传统部署 | Docker 部署 |
|------|---------|------------|
| 系统依赖 | 手动安装，版本可能不同 | 镜像里固定版本 |
| Node.js 版本 | 服务器可能没有/版本不对 | 镜像里指定 node:22-alpine |
| 原生模块编译 | 需要手动装 gcc/python3 | 镜像里预装 |
| 环境变量 | 手动配置 .env | docker-compose.yml 统一管理 |
| 迁移成本 | 重新配置所有依赖 | docker pull + docker run |

### 2.2 分层存储（Layer Caching）

Dockerfile 的每一行指令都会生成一个 **层（Layer）**：

```dockerfile
FROM node:22-alpine          # 第1层：基础镜像（5MB）
RUN apk add python3 make g++ # 第2层：编译工具（100MB）
COPY package.json ./         # 第3层：依赖清单
RUN pnpm install             # 第4层：安装依赖（200MB）
COPY . .                     # 第5层：你的代码
RUN nuxt build               # 第6层：构建产物
```

**关键点**：如果某一层没变，Docker 会用缓存，不重新执行。

比如你只改了代码（第5层变了），但 package.json 没变（第3层没变），那第4层（pnpm install）会用缓存，**节省 2-3 分钟**！

### 2.3 多阶段构建（Multi-stage Build）

我们的 Dockerfile 用了 **两阶段构建**：

```dockerfile
# 阶段 1：Builder（构建环境，包含 gcc、python3 等编译工具）
FROM node:22-alpine AS builder
RUN apk add python3 make g++  # 编译工具，生产环境不需要
RUN pnpm install              # 安装所有依赖
RUN nuxt build                # 构建

# 阶段 2：Production（生产环境，只有运行时）
FROM node:22-alpine AS production
RUN apk add tini sqlite       # 只装运行需要的
COPY --from=builder /app/.output ./  # 只复制构建产物
```

**好处**：
- 最终镜像只包含运行时需要的东西（~150MB）
- 不包含 gcc、python3 等编译工具（~500MB）
- 更安全（攻击面小）、更小（传输快）

### 2.4 容器 vs 虚拟机

```
┌─────────────────────────────────────┐
│           虚拟机 (VM)                │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ App1 │  │ App2 │  │ App3 │      │
│  │ Libs │  │ Libs │  │ Libs │      │
│  │ OS   │  │ OS   │  │ OS   │      │
│  └──────┘  └──────┘  └──────┘      │
│        Hypervisor (VMware/VBox)      │
│           Host OS (Ubuntu)           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           容器 (Container)           │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ App1 │  │ App2 │  │ App3 │      │
│  │ Libs │  │ Libs │  │ Libs │      │
│  └──────┘  └──────┘  └──────┘      │
│        Docker Engine                 │
│           Host OS (Ubuntu)           │
└─────────────────────────────────────┘
```

- **VM**：每个应用都有完整 OS（~1GB），启动慢（分钟级）
- **容器**：共享 Host OS 内核（~100MB），启动快（秒级）

---

## 三、我们执行的完整命令流程

### 3.1 本地：编写 Dockerfile

```bash
# 在本地项目目录
cd /mnt/data/personal-website/nuxt-app/

# 创建 Dockerfile（多阶段构建）
# 创建 .dockerignore（排除 node_modules、.git 等）
# 创建 docker-compose.yml（编排配置）
```

### 3.2 本地：推送到 GitHub

```bash
git add Dockerfile .dockerignore docker-compose.yml
git commit -m "添加 Docker 部署配置"
git push origin master
```

### 3.3 ECS：拉取代码

```bash
ssh root@120.26.231.150
cd /opt/personal-website
git pull origin master
```

### 3.4 ECS：配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
JWT_SECRET=15bd628e002081781f9fd4d0a48be2f281387813c79ed704
DATABASE_URL=file:/app/data/prod.db
EOF
```

### 3.5 ECS：构建镜像

```bash
cd /opt/personal-website/nuxt-app/

# 构建镜像（这一步最耗时，5-10 分钟）
docker build -t personal-website:latest .

# 解释：
# -t personal-website:latest  → 给镜像起名叫 personal-website，标签 latest
# .                            → 用当前目录的 Dockerfile
```

### 3.6 ECS：启动容器

```bash
docker run -d   --name personal-website   --restart unless-stopped   -p 3000:3000   -v personal-website-data:/app/data   -v personal-website-uploads:/app/public/uploads   --env-file .env   personal-website:latest

# 解释：
# -d                          → 后台运行
# --name personal-website     → 容器名字
# --restart unless-stopped    → 崩溃自动重启
# -p 3000:3000                → 映射端口（宿主机:容器）
# -v personal-website-data:... → 持久化数据卷
# --env-file .env             → 加载环境变量
```

### 3.7 ECS：验证运行

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs personal-website

# 访问测试
curl http://localhost:3000
```

---

## 四、Dockerfile 与本地环境不一致的问题分析

### 4.1 问题现象

我们在 ECS 上执行 `docker build` 时遇到了多次失败：

| 次数 | 错误 | 原因 |
|------|------|------|
| 第1次 | `pnpm: unknown version` | corepack prepare 指定了不存在的版本 9.15.4 |
| 第2次 | `playwright: not found` | COPY . . 把 devDependencies 的脚本也复制进去了 |
| 第3次 | `lockfile mismatch` | Dockerfile 指定 pnpm@9.6.0，但 lockfile 是 pnpm@11 生成的 |
| 第4次 | `better-sqlite3: missing python3` | Dockerfile 没装编译工具（python3、make、g++） |

### 4.2 根本原因

**Dockerfile 是"凭记忆"写的，没有严格对照本地环境。**

本地环境：
- Node.js v24.18.0
- pnpm 11.9.0（通过 corepack）
- better-sqlite3 需要 python3 + gcc + make 编译（原生 C++ 模块）
- Prisma 6.19.3

Dockerfile 初始版本：
- 用了 pnpm@9.15.4（不存在的版本！）
- 没装 python3、make、g++（better-sqlite3 编译失败）
- COPY . . 把 devDependencies 的 postinstall 脚本也复制进去了

### 4.3 为什么会出现这个问题？

**根本原因：写 Dockerfile 时没有逐行对照本地环境。**

我犯的错误：
1. **版本号瞎编**：pnpm@9.15.4 不存在，应该查 `pnpm --version` 确认
2. **依赖分析不彻底**：better-sqlite3 是原生模块，需要编译工具，但我没检查它的编译依赖
3. **COPY . . 太粗暴**：把所有文件都复制进去，包括 devDependencies 的脚本
4. **lockfile 不匹配**：Dockerfile 指定的 pnpm 版本和生成 lockfile 的版本不一致

### 4.4 如何避免这个问题？

**原则：写 Dockerfile 前，先完整记录本地环境。**

```bash
# 1. 记录本地版本
node --version          # v24.18.0
pnpm --version          # 11.9.0
cat package.json | grep -A5 dependencies  # 查看所有依赖

# 2. 检查原生模块
ls node_modules/ | grep -E "sqlite|bcrypt|sharp"  # 这些需要编译

# 3. 检查编译依赖
# better-sqlite3 需要 python3 + make + g++
# bcryptjs 是纯 JS，不需要编译

# 4. 检查 lockfile 版本
head -5 pnpm-lock.yaml  # 会显示 pnpm 版本

# 5. 对照写 Dockerfile
# FROM node:22-alpine  （不是 node:24！）
# RUN corepack prepare pnpm@11.9.0  （和本地一致！）
```

---

## 五、Docker 的替代方案对比

### 5.1 方案对比

| 方案 | 原理 | 优点 | 缺点 | 适合场景 |
|------|------|------|------|---------|
| **Docker** | 容器化，打包镜像 | 环境一致、部署快、可移植 | 学习成本、镜像大 | 生产部署、团队协作 |
| **PM2** | Node.js 进程管理 | 简单、轻量、不需要学 Docker | 环境不一致、迁移麻烦 | 个人项目、快速上线 |
| **Systemd** | Linux 服务管理 | 系统原生、稳定 | 配置复杂、不够灵活 | 系统级服务 |
| **Vercel/Netlify** | Serverless 托管 | 零配置、自动部署 | 有限制、可能收费 | 静态站点、前端项目 |

### 5.2 为什么选择 Docker？

我们的项目特点：
- 有原生模块（better-sqlite3），需要编译环境
- 有数据库（SQLite），需要持久化
- 需要反向代理（Nginx）
- 需要自动重启、日志管理
- 未来可能扩展（加 Redis、加队列）

Docker 能一站式解决这些问题，而且迁移成本最低（换服务器只要 docker pull）。

---

## 六、关键概念速查

### 6.1 Dockerfile 指令速查

```dockerfile
FROM node:22-alpine    # 基础镜像
WORKDIR /app           # 工作目录
COPY package.json ./   # 复制文件（会缓存）
RUN pnpm install      # 执行命令（会缓存）
ENV NODE_ENV=production # 环境变量
EXPOSE 3000           # 声明端口（不实际映射）
CMD ["node", "app.js"] # 启动命令
ENTRYPOINT ["/sbin/tini"] # 入口点（和 CMD 配合）
```

### 6.2 Docker 命令速查

```bash
# 镜像
docker build -t name:tag .  # 构建镜像
docker images               # 列出镜像
docker rmi name:tag         # 删除镜像

# 容器
docker run -d --name app -p 3000:3000 image  # 启动容器
docker ps                   # 列出运行中的容器
docker ps -a                # 列出所有容器
docker logs app             # 查看日志
docker exec -it app sh      # 进入容器
docker stop app             # 停止容器
docker rm app               # 删除容器

# 数据卷
docker volume create data   # 创建卷
docker volume ls            # 列出卷
docker volume inspect data  # 查看卷详情
```

### 6.3 Docker Compose 命令速查

```bash
docker compose up -d        # 启动所有服务（后台）
docker compose down         # 停止并删除所有服务
docker compose logs -f      # 查看日志（实时）
docker compose ps           # 列出服务状态
docker compose build        # 重新构建
```

---

## 七、我们的部署架构

```
┌─────────────────────────────────────────────┐
│                ECS 服务器                     │
│  120.26.231.150 (2C/1.6GB)                   │
│                                              │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │    Nginx     │    │    Docker 容器       │ │
│  │  (端口 80)   │───→│  personal-website   │ │
│  │  反向代理    │    │  (端口 3000)        │ │
│  └─────────────┘    │                     │ │
│                      │  ┌───────────────┐ │ │
│  ┌─────────────┐    │  │   Nuxt 3 SSR   │ │ │
│  │   RustDesk   │    │  │   + Prisma    │ │ │
│  │  (21114-19) │    │  │   + SQLite    │ │ │
│  └─────────────┘    │  └───────────────┘ │ │
│                      │                     │ │
│  ┌─────────────┐    │  ┌───────────────┐ │ │
│  │ GoHTTPServer│    │  │  数据卷        │ │ │
│  │  (端口 8000)│    │  │  /app/data    │ │ │
│  └─────────────┘    │  │  /app/uploads │ │ │
│                      │  └───────────────┘ │ │
│                      └─────────────────────┘ │
└─────────────────────────────────────────────┘
```

**请求流程**：
1. 用户访问 `http://120.26.231.150`
2. Nginx（端口 80）接收请求
3. Nginx 转发到 `localhost:3000`
4. Docker 容器里的 Nuxt 3 处理请求
5. Nuxt 3 查询 SQLite 数据库
6. 返回 HTML 给用户

---

## 八、反思与改进

### 8.1 这次踩坑的教训

1. **版本号要精确**：不能凭记忆写，必须查本地实际版本
2. **依赖要分析**：原生模块（better-sqlite3、sharp）需要编译工具
3. **lockfile 要匹配**：pnpm 版本必须和生成 lockfile 的版本一致
4. **COPY 要精确**：不要 COPY . .，先 COPY package.json，再 COPY 源码
5. **本地先测试**：写完 Dockerfile 先在本地 `docker build` 测试，不要直接推到 ECS

### 8.2 改进后的 Dockerfile 编写流程

```
1. 记录本地环境
   ├── node --version
   ├── pnpm --version
   ├── head pnpm-lock.yaml
   └── ls node_modules/ | grep -E "sqlite|bcrypt|sharp"

2. 分析依赖
   ├── 运行时依赖（dependencies）
   ├── 编译时依赖（python3、make、g++）
   └── 开发依赖（devDependencies，不需要）

3. 编写 Dockerfile
   ├── 对照本地版本写 FROM、RUN corepack
   ├── 先 COPY package.json（利用缓存）
   ├── RUN pnpm install（安装依赖）
   ├── 再 COPY . .（复制源码）
   └── RUN nuxt build（构建）

4. 本地测试
   ├── docker build -t test .
   ├── docker run -p 3000:3000 test
   └── curl http://localhost:3000

5. 推送到 GitHub
   └── git add Dockerfile && git commit && git push

6. ECS 部署
   ├── git pull
   ├── docker build -t personal-website:latest .
   └── docker run -d ...
```

---

## 九、总结

### Docker 的核心价值

1. **环境一致性**：本地和服务器环境完全一样，不会出现"在我机器上能跑"
2. **部署自动化**：写一次 Dockerfile，以后只要 `docker build && docker run`
3. **可移植性**：镜像可以在任何安装了 Docker 的机器上运行
4. **版本控制**：镜像有标签（tag），可以回滚到任意版本

### 我们学到的

- Docker 镜像 = 操作系统 + 运行时 + 依赖 + 代码
- Dockerfile = 构建镜像的"菜谱"
- 多阶段构建 = 最终镜像只包含运行时需要的东西
- 层缓存 = 改了代码不用重新安装依赖
- 原生模块需要编译工具（python3、make、g++）

### 下一步

- 修复 Dockerfile（安装编译工具）
- 重新构建镜像
- 配置 Nginx 反向代理
- 测试完整部署流程
