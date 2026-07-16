# ECS 部署进度

> 更新时间：2026-07-04 15:xx

## 服务器信息

| 项目 | 值 |
|------|-----|
| ECS 主机别名 | `yyh-ecs` |
| 系统 | Ubuntu 22.04 (x86_64) |
| CPU | 2 核 |
| RAM | 1.6GB |
| Swap | 4GB（阿里云 acs-plugin-manager 自动配置） |
| 磁盘 | 40GB /dev/vda3 (ext4)，已用 7.2GB |
| 项目路径 | /opt/personal-website |

## 已完成步骤

| # | 步骤 | 状态 | 说明 |
|---|------|------|------|
| 1 | SSH key 授权 | ✅ | 本机 ed25519 公钥已加入 ECS authorized_keys |
| 2 | GitHub SSH key | ✅ | 已添加到 GitHub 账号 Kicgut |
| 3 | 代码克隆 | ✅ | 通过 SSH 反向隧道代理，git clone 到 /opt/personal-website |
| 4 | Docker 安装 | ✅ | v29.6.1，使用阿里云镜像源（download.docker.com 国内不可达） |
| 5 | Docker Compose | ✅ | v5.3.0 |
| 6 | Swap 配置 | ✅ | 4GB，使用 acs-plugin-manager 自动配置 + fstab + swappiness=20 |

## 已运行的服务（未被影响）

| 服务 | 端口 | 状态 |
|------|------|------|
| RustDesk hbbs | 21115, 21116, 21118 | ✅ 正常运行 |
| RustDesk hbbr | 21117, 21119 | ✅ 正常运行 |
| gohttpserver | 8000 | ✅ 正常运行 |
| SSH | 22 | ✅ 正常运行 |

## 未完成步骤

| # | 步骤 | 说明 |
|---|------|------|
| 7 | 创建 .env 文件 | 命令超时，需重试 |
| 8 | Docker 构建镜像 | docker compose build，可能需要 5-10 分钟 |
| 9 | 启动服务 | docker compose up -d |
| 10 | Nginx 反向代理 | 可选，当前可通过 3000 端口直接访问 |
| 11 | HTTPS 配置 | 需要域名，可选 |

## 踩坑记录

### 1. GitHub 访问超时
- **现象：** ECS 上 git clone 超时
- **原因：** 国内服务器无法直接访问 GitHub
- **解决：** SSH 反向隧道 `ssh -R 17897:127.0.0.1:7897 root@ECS -N -f`，ECS 通过本地代理访问
- **⚠️ 注意：** 隧道依赖本地电脑，电脑关机/断网则断开。后续建议在 ECS 上装代理客户端

### 2. Docker 安装源不可达
- **现象：** curl download.docker.com 超时
- **原因：** 国内无法访问 Docker 官方源
- **解决：** 使用阿里云镜像 mirrors.aliyun.com/docker-ce

### 3. Swap 配置超时
- **现象：** fallocate 2GB 和 dd 2GB 都超时
- **原因：** SSH 命令 60 秒超时，大文件操作来不及完成
- **解决：** 使用阿里云官方工具 `acs-plugin-manager --exec --plugin ACS-ECS-SwapConfig --params '--enable'`，自动配 4GB + fstab + swappiness

### 4. SSH 命令超时问题
- **现象：** 部分 SSH 命令（写 fstab、dd）反复超时
- **原因：** SSH 连接不稳定 + 命令执行时间长
- **临时解决：** 拆成小命令逐个执行
- **待优化：** 考虑使用 screen/tmux 在 ECS 上直接跑长时间命令

## 阿里云安全组配置

已开放端口：
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 21114-21119 (RustDesk)
- 8000 (gohttpserver)

待开放：
- 3000 (Nuxt 应用，如果不用 Nginx 的话)
