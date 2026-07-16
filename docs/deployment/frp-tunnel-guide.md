---
title: "frp 隧道配置详解"
created: 2026-07-16 00:00
updated: 2026-07-15 23:29
status: final
purpose: "详细说明 frp 隧道的工作原理、配置方式和使用场景"
scope: "部署与运维"
related: []
tags:
  - frp
  - 隧道
  - 内网穿透
  - 部署
---

# frp 隧道配置详解

## 概述

frp (Fast Reverse Proxy) 是内网穿透工具，让外网能访问内网服务。本项目使用 frp 实现 ECS 访问本地服务器的服务。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      ECS (公网服务器)                        │
│                                                             │
│  ┌─────────────┐                                            │
│  │   frps      │ ← 监听 7000 端口，等待本地连接              │
│  │ (frp server)│                                            │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────▼──────┐                                            │
│  │ Nginx       │ ← 反向代理                                 │
│  │ :80/:443    │                                            │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────▼──────┐      ┌─────────────┐                      │
│  │ skills.local│ ────→│ frpc 隧道   │ ────→ 本地:9800      │
│  │ (域名解析)  │      │ (反向代理)  │                      │
│  └─────────────┘      └─────────────┘                      │
│                                                             │
│  ┌─────────────┐      ┌─────────────┐                      │
│  │local.localhost│ ───→│ frpc 隧道   │ ────→ 本地:3000      │
│  │ (域名解析)  │      │ (反向代理)  │                      │
│  └─────────────┘      └─────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ frp 隧道 (token 认证)
                            │
┌─────────────────────────────────────────────────────────────┐
│                    本地服务器 (内网)                          │
│                                                             │
│  ┌─────────────┐                                            │
│  │   frpc      │ ← 连接到 ECS:7000，建立隧道                │
│  │(frp client) │                                            │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────▼──────┐      ┌─────────────┐                      │
│  │ Skills API  │ ←────│ 端口 9800   │                      │
│  │ (Python)    │      └─────────────┘                      │
│  └─────────────┘                                            │
│                                                             │
│  ┌─────────────┐                                            │
│  │ Nuxt Dev    │ ←──── 端口 3000                           │
│  │ Server      │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## 认证方式

- **frp 认证**：使用 token（配置在 `/etc/frp/frpc.toml`）
- **SSH 认证**：使用 ed25519 密钥对（`~/.ssh/id_ed25519`）

## 隧道配置详解

### 1. skills-api 隧道

**作用**：让 ECS 能访问本地的 Skills API 服务

**配置**（`/etc/frp/frpc.toml`）：
```toml
[[proxies]]
name = "skills-api"
type = "http"
localIP = "127.0.0.1"
localPort = 9800
customDomains = ["skills.local"]
```

**工作流程**：
1. 本地运行 Skills API 服务（Python，端口 9800）
2. frpc 连接到 ECS 的 frps（端口 7000）
3. ECS 上配置 `skills.local` 域名解析到 frps
4. 当 ECS 访问 `skills.local:7080` 时：
   - Nginx 反向代理到 frps
   - frps 通过隧道转发到本地 frpc
   - frpc 转发到本地 `127.0.0.1:9800`

**使用场景**：
- ECS 上的 Nuxt 应用需要调用本地 Skills API
- 本地 Skills 数据库更新后，ECS 能实时获取

### 2. local-web 隧道

**作用**：让 ECS 能访问本地的 Web 开发服务器

**配置**（`/etc/frp/frpc.toml`）：
```toml
[[proxies]]
name = "local-web"
type = "http"
localIP = "127.0.0.1"
localPort = 3000
customDomains = ["local.localhost"]
```

**工作流程**：
1. 本地运行 Nuxt 开发服务器（端口 3000）
2. frpc 连接到 ECS 的 frps（端口 7000）
3. ECS 上配置 `local.localhost` 域名解析到 frps
4. 当 ECS 访问 `local.localhost:80` 时：
   - Nginx 反向代理到 frps
   - frps 通过隧道转发到本地 frpc
   - frpc 转发到本地 `127.0.0.1:3000`

**使用场景**：
- 在本地开发，但想通过 ECS 的公网 IP 访问
- 测试本地代码在公网环境的表现

## 端口说明

| 端口 | 位置 | 服务 |
|------|------|------|
| 7000 | ECS | frps (frp server) |
| 7080 | ECS | skills.local (Nginx) |
| 80 | ECS | local.localhost (Nginx) |
| 9800 | 本地 | Skills API |
| 3000 | 本地 | Nuxt Dev Server |

## 数据流向示例

### 访问 skills.local

```
ECS Nginx (:7080)
    ↓
frps (ECS:7000)
    ↓ (frp 隧道)
frpc (本地)
    ↓
Skills API (本地:9800)
```

### 访问 local.localhost

```
ECS Nginx (:80)
    ↓
frps (ECS:7000)
    ↓ (frp 隧道)
frpc (本地)
    ↓
Nuxt Dev (本地:3000)
```

## 常用命令

### 查看 frpc 状态
```bash
sudo systemctl status frpc
```

### 重启 frpc
```bash
sudo systemctl restart frpc
```

### 查看 frpc 日志
```bash
sudo journalctl -u frpc -f
```

### 测试隧道连通性
```bash
# 测试 skills.local
curl http://skills.local:7080

# 测试 local.localhost
curl http://local.localhost
```

## 故障排查

### 1. 隧道无法连接

**症状**：访问 `skills.local` 或 `local.localhost` 超时

**排查步骤**：
1. 检查 frpc 是否运行：`sudo systemctl status frpc`
2. 检查 frpc 日志：`sudo journalctl -u frpc -f`
3. 检查本地服务是否运行：`lsof -i:9800` 或 `lsof -i:3000`
4. 检查 ECS 的 frps 是否运行：`sudo systemctl status frps`

### 2. 认证失败

**症状**：frpc 日志显示 "authentication failed"

**排查步骤**：
1. 检查 `/etc/frp/frpc.toml` 中的 token 是否正确
2. 检查 ECS 的 frps 配置中的 token 是否匹配
3. 重启 frpc 和 frps

### 3. 域名解析失败

**症状**：访问 `skills.local` 返回 404 或无法解析

**排查步骤**：
1. 检查 ECS 的 Nginx 配置是否正确
2. 检查 `/etc/hosts` 或 DNS 配置
3. 检查 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`

## 安全注意事项

1. **token 安全**：不要将 frp token 提交到 Git 仓库
2. **端口暴露**：只暴露必要的端口，避免暴露敏感服务
3. **访问控制**：在 Nginx 配置中添加访问控制（IP 白名单等）
4. **日志监控**：定期检查 frpc 和 Nginx 日志，发现异常访问

## 相关文档

- [部署进度](deployment-progress.md)
- [Docker 部署学习笔记](../learning-notes/deployment/learning-docker-deployment.md)
- [照片回流架构](../architecture/photo-backflow-architecture.md)
