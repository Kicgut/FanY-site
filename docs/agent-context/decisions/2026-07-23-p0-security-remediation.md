---
title: "P0 安全与迁移修复决策"
created: 2026-07-23 00:00
updated: 2026-07-23 00:00
status: active
purpose: "记录用户确认后的 P0 修复范围、数据库备份处理和生产只读核对边界。"
scope: "全项目"
related: []
tags:
  - security
  - migration
  - decision
---

# P0 安全与迁移修复决策

用户确认按推荐方案执行：先处理安全和迁移一致性，再处理架构收敛与缺失功能；允许对 ECS 和 Ubuntu 做只读生产核对。

## 已确认范围

- 文章写入、导入、导出和草稿读取必须经过服务端权限控制。
- 文件路径导入仅允许本地可信来源，并限制在受控 `data/` 目录。
- `local_trusted` 不得由公网客户端伪造转发头获得。
- 生产缺少 `JWT_SECRET` 时拒绝启动。
- migration 失败不得 fallback 到 `prisma db push --accept-data-loss`。
- 补齐 Hermes Registry migration，并将 schema 索引与 migration 对齐。
- 已跟踪的数据库备份从当前版本移除；凭据轮换和 Git 历史清理作为后续独立动作记录。

## 尚未执行的外部动作

- 生产数据库 migration 部署。
- ECS/Ubuntu 服务重启或配置修改。
- Git 历史重写。
- 真实账号、JWT、FRP token 轮换。

## 生产只读核对结果

- ECS 容器 `personal-website:latest` 健康运行，主机仓库工作区干净。
- ECS `prod.db` 仍记录 7 个 migration，但实际 SQLite 已经存在 `HermesSkill.author/description/project` 和 `HermesSkillTag`；这证明历史上曾用 `db push` 形成 schema 漂移。
- 本次补充 migration 面向干净数据库；生产部署前必须先备份并执行 schema 证据核对，再使用 `prisma migrate resolve --applied` 或受控修复流程，不能直接盲目 `migrate deploy`。
- `yyh-ubuntu-a` 当前因本机缺少该隧道端口的 known-hosts 指纹而未执行连接；没有绕过主机密钥校验。
