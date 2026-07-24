---
title: 当前系统架构
version: 3.0.0
status: current
updated: 2026-07-24
source_of_truth: code-and-production
---

# 当前系统架构

本文件描述已在代码与生产环境中核对的架构事实。它优先于历史版本和任何已完成计划；具体模块的细节见同目录的照片系统、内容流水线与集成说明。

## 1. 系统边界

```text
Browser → Nginx (HTTPS) → Nuxt 3 / Nitro → SQLite + Prisma
                                  ├→ ECS persistent volumes
                                  ├→ OpenAI-compatible provider
                                  └→ FRP → Ubuntu photo / skills services
```

生产运行在 ECS 的 Docker 容器中。Nginx 终止 HTTPS 并转发到 Nuxt/Nitro 单体；SQLite 数据库、内容、上传文件、缩略图和备份均使用持久化卷。Ubuntu 仅向 ECS 暴露受控的内部照片与 Skills 服务，链路通过 FRP。

## 2. 应用层

- Vue 页面覆盖公开站点、登录用户区、AI、后台、2FA 安全中心、Jobs 与存储运维。
- Nitro API 承载认证、文章、照片、相册、AI、内容流水线、Skills、Jobs 和存储管理接口。
- 领域服务统一处理授权、审计、配额、同步策略与文件路径边界。

## 3. 身份与安全

- 访问令牌配合 HttpOnly Refresh Session；会话与令牌撤销状态持久化。
- 管理员可启用 TOTP 二次验证，安全中心生成可扫码的 `otpauth` 二维码，并支持恢复码重新生成。
- 管理接口按用户身份、角色和资源归属校验；高风险操作写入审计或 Job 结果。
- 生产冒烟脚本验证公开页、后台页及未认证 API 的拒绝行为。

## 4. 数据与异步任务

- Prisma 管理 SQLite；当前生产库已有 14 次迁移。
- 核心数据包括用户、Refresh Session、文章、照片、相册、AI 会话、Jobs 与审计记录。
- 内容流水线与缩略图重建都以 Job 运行，支持查看、执行、取消与重试。
- 存储一致性接口报告缺失原图、缺失缩略图和孤儿文件；缩略图修复通过受审计 Job 执行。

## 5. 部署与可靠性

- 发布采用 Docker 镜像与数据库迁移；发布前保留 rollback 镜像和备份。
- 生产运行健康检查、冒烟检查和可选 Webhook 告警；发布产物按保留策略清理。
- 可执行步骤以 [`../operations/`](../operations/) 为准，不在本文件复制命令。

## 6. 详细当前架构

- [照片系统](photo-system.md)：照片生命周期、同步、回流与访问边界。
- [内容流水线](content-pipeline.md)：文章导入、工作流与安全不变量。
- [外部集成](integrations.md)：FRP、Ubuntu Skills 和 AI Provider 边界。

## 架构更新记录

### v3.0.0 · 2026-07-24

- 完成 TOTP 二维码、恢复码生命周期、AI 会话管理、Jobs 面板、存储一致性与缩略图重建。
- 完成生产备份、迁移、镜像回滚、健康检查与冒烟门禁。
- 将代码、生产部署和文档进行三方核对，作为当前架构基线。

### 下一个版本

下一个小版本为 `v3.0.1`。发生不改变系统边界的修复或能力补全时，在本节追加记录并更新版本号；没有已批准的架构变更计划。
