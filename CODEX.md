# CODEX.md — Codex 开发与验证规则

Codex 负责 Nuxt/Vue 页面、Server API、Prisma schema/migration、服务与脚本、测试和验证；产品权限边界以 `AGENTS.md`、`HERMES.md` 和 `docs/architecture/` 为准。

## 开始工作前

1. 读取 `AGENTS.md`。
2. 从 `docs/README.md` 找到对应的当前架构、设计和任务文档。
3. 检查 `git status`，保留用户已有改动，不覆盖无关文件。
4. 先确认当前代码，再修改计划文档或实现。

## API 实现顺序

```text
读取请求 → 认证 → 权限 → 输入校验 → service → audit log → 统一响应
```

handler 不应直接拼接文件路径、实现复杂权限逻辑、访问 Hermes 主进程或返回本地真实路径。文件操作必须经过路径保护；公开 API 不得返回 private 元数据。

## 数据与状态

- 数据库字段变更必须同时提交 migration、验证命令和回滚说明。
- 照片、候选内容、发布记录和 Job 必须使用显式状态机。
- `approved` 不等于公开；内容流水线发布首先生成 draft，公开发布仍需单独人工确认。
- AI/Hermes 永远只能创建或修改候选，不得自动公开。

## 验证清单

按改动范围执行：

- `npx prisma validate`、`npx prisma migrate deploy`（数据库变更）。
- `pnpm exec tsc --noEmit`（TypeScript 变更）。
- `pnpm build`（页面、服务、路由或生产配置变更）。
- 权限拒绝、越权隔离、待审核不展示、路径 escape、`visibleTo` 和审计日志测试。
- 使用 Conda 环境时遵循根目录 `environment.yml` 和 `docs/deployment/development-environment.md`。

验证失败要说明原因、影响范围和是否为环境问题，不得把未验证写成已完成。

## Git 边界

遵守 `docs/implementation/git-version-control-governance.md`。代码、文档、模板、migration 和测试可以提交；真实照片、数据库、`.env`、Hermes 运行时数据、日志、备份和密钥不得提交。
