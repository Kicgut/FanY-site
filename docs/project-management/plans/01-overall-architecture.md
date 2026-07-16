---
title: "01-overall-architecture - 新版整体架构设计"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: draft
purpose: "记录目标设计和待完成方案，不代表当前代码已经实现。"
scope: "全项目"
related: []
tags:
  - project-management
---
# 01-overall-architecture - 新版整体架构设计

## 1. 系统定位

新版系统是一个个人内容操作系统：

```text
公开个人网站
+ 照片资产管理系统
+ 家人朋友共享空间
+ Hermes 内容生产中枢
+ Skill 治理和远程只读管理
```

用户优先级：

1. Owner：你本人。
2. Family/Friends：家人朋友。
3. Visitors：普通访客。

## 2. 核心原则

1. ECS 轻量化：入口、公开页面、公开缩略图、数据库、API。
2. 本地重存储：原图、私密内容、Hermes 主实例、本地大模型、最高权限操作。
3. 私密默认安全：新上传、新生成内容默认不公开。
4. AI 默认只生成候选：Hermes 生成内容必须进入审核区。
5. 远程 owner 受限：远程可管理和审核，但不能永久删除和执行系统命令。
6. 本地最高权限：高危操作只允许本地可信环境。
7. 所有敏感访问走 API 权限校验，禁止裸露 private/friends 静态路径。

## 3. 逻辑架构

```text
用户浏览器
  │
  ▼
ECS Nginx
  │
  ├── Nuxt Web App
  │     ├── public pages
  │     ├── login/user pages
  │     ├── admin pages
  │     └── API routes
  │
  ├── Static public thumbnails
  │
  └── localhost-only frp tunnel endpoint
          │
          ▼
本地服务器
  ├── photo-server
  ├── Hermes main/profile services
  ├── content-pipeline
  ├── hermes-skills registry
  ├── local model adapters
  └── cold storage / backup disk
```

## 4. 子系统

### 4.1 公开网站

- 首页。
- 博客。
- 摄影作品。
- 作品集。
- 关于。

普通访客只能看到公开内容。

### 4.2 登录用户空间

- 登录用户可查看被授权照片。
- 可下载被授权原图。
- 可上传照片，但进入待审核。
- `/ai` 只对被授权登录用户开放。

### 4.3 Owner 后台

- 照片管理。
- 内容审核。
- 用户权限。
- Hermes 整理结果。
- Skill 状态查看。
- 存储和任务状态。

### 4.4 本地最高权限区

- 永久删除。
- 冷存储归档/恢复。
- Hermes skill 修改。
- shell 自动化。
- 系统配置修改。
- 本地大模型批处理。

## 5. 关键状态流

### 5.1 照片

```text
upload/import
→ pending review
→ approved/rejected/needs_edit/private_archive
→ active/hidden/archived
→ public/friends/private
```

### 5.2 内容

```text
raw conversation/text
→ processed summary
→ candidate article/project
→ review pending
→ approved
→ published
```

### 5.3 Skill

```text
new
→ reviewing
→ stable/experimental/rejected
→ archived/deprecated
```

## 6. 默认决策

- `/ai` 只给登录用户，并由 owner 按用户授权。
- 朋友上传照片默认待审核。
- 待审核内容不会对任何非 owner 用户展示。
- Owner 远程不能永久删除。
- 本地服务器离线时 friends/private 原图不可访问，可接受。
- 作品集包括项目和摄影精选。
- 对象存储暂不引入，后续作为可选灾备/CDN。
