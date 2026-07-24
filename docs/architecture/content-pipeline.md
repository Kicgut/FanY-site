---
title: 内容流水线当前架构
version: 3.0.0
status: current
updated: 2026-07-24
---

# 内容流水线当前架构

## 数据流

```text
Markdown source → content pipeline Job → validation / transform
                → persisted article data → public and admin APIs
```

文章源文件与流水线工作目录位于 ECS 持久化卷。管理员通过 API 或 Jobs 面板创建和执行任务；任务状态、错误与结果持久化，可重试或取消。

## 边界与不变量

- 只接受受控目录中的内容源；路径必须经过服务端校验。
- 导入、更新和发布均经过授权与审计边界，不由浏览器直接写入服务器文件系统。
- Job 失败保留原因，不把半完成状态伪装成成功。
- 当前 API、数据模型与操作步骤分别以设计、代码和 Jobs 面板为准。

## 运维

- 在后台 Jobs 页面查看、执行、取消或重试流水线任务。
- 发布和恢复操作遵循 [`../operations/deploy-backup-restore.md`](../operations/deploy-backup-restore.md)。
- 生产验证使用 [`../operations/production-smoke.md`](../operations/production-smoke.md)。

## 版本记录

当前随总体架构 `v3.0.0` 维护；模块级小改动同步写入 `current-architecture.md` 的更新记录。
