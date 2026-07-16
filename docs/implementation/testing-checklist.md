---
title: "Testing Checklist"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\implementation
---
# Testing Checklist

## 单元测试

- permission.service
- path-guard
- review.service
- photo visibility filter
- ai access filter

## 集成测试

- 上传照片到 pending。
- 审核 public 后 gallery 可见。
- 审核 friends 后仅授权用户可见。
- private 原图 owner 二次认证可见。
- 远程 owner 删除被拒绝。

## E2E 测试

- 普通访客浏览首页、博客、摄影公开页。
- 登录朋友上传照片。
- Owner 审核照片。
- 授权朋友查看照片。
- Owner 使用 /ai。
- Owner 审核 Hermes 候选博客。

## 回归测试

- 博客现有功能不破坏。
- 文章 CRUD 不破坏。
- 相册基础功能不破坏。
- Docker 部署不破坏。
