---
title: 外部集成当前架构
version: 3.0.0
status: current
updated: 2026-07-24
---

# 外部集成当前架构

## Ubuntu 与 FRP

ECS 通过 FRP 调用 Ubuntu 内部服务：Photo Original API 提供受控原图读取，Skills API 提供 `SKILL.md` 只读来源。服务不可直接作为公网任意读写接口暴露；连接、端口和恢复操作见运维手册。

## Skills

Skills 从 Ubuntu 目录读取并在站点侧以受控 API 展示或同步。原始 `SKILL.md` 是只读输入，站点数据库仅保存其所需的索引或展示数据。

## AI Provider

AI 页面通过 Nitro 服务端调用 mock 或 OpenAI-compatible Provider。会话记录持久化并按用户归属控制，支持列表、详情、删除与归档；客户端不直接持有 Provider 密钥。

## 版本记录

当前随总体架构 `v3.0.0` 维护。涉及 Provider、FRP 网络边界或 Skills 数据模型的变更，必须更新本文件和 `current-architecture.md`。
