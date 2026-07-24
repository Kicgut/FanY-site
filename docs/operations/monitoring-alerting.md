---
title: "监控与告警"
created: 2026-07-15 23:29
updated: 2026-07-24
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\operations
---
# 监控与告警

## 1. ECS 存储告警

- >70%：警告。
- >85%：停止缩略图同步。

## 2. 本地存储告警

- >80%：警告。
- >90%：建议归档。

## 3. 服务状态

监控：

- Nuxt。
- Nginx。
- frps。
- frpc。
- photo-server。
- hermes-gateway。
- Hermes。

## 4. 后台展示

`/admin/storage` 显示：

- ECS 空间。
- 本地空间。
- 冷存储挂载状态。
- 最近备份时间。
- frp 状态。
- photo-server 状态。
- Hermes 状态。

## 5. 告警渠道

第一版可先写日志和后台提示。

后续可接入：

- 微信通知。
- 邮件。
- Telegram。
- Hermes daily report。
