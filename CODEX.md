# CODEX.md — Codex 开发与验证规则

Codex 负责 Nuxt/Vue 页面、Server API、Prisma schema/migration、服务与脚本、测试和验证；产品权限边界以 `AGENTS.md`、`HERMES.md` 和 `docs/architecture/` 为准。

## 服务器名称与职责

- **ECS 服务器**：运行公网网站、Nuxt/API、Docker、Nginx 和 frps，承担网站前台、管理后台、API 及 AI 网关。AI 配置写入 ECS 的 `nuxt-app/.env`。
- **Ubuntu 服务器（服务器 A）**：提供本地后台服务，保存照片原图、私密内容和本地备份，运行 Immich、本地 Skills API、Skill 同步、frpc 及照片回流等服务。

两台服务器不得混称：公网网站、API 和 AI 配置默认指 ECS；原图、Skill 同步、Immich 和本地高信任操作默认指 Ubuntu 服务器（服务器 A）。详细约定见 `docs/operations/server-roles.md`。

远程操作和照片存储边界以项目 skill [`.codex/skills/server-infrastructure/SKILL.md`](.codex/skills/server-infrastructure/SKILL.md) 为准。连接使用本机 SSH 别名 `yyh-ecs` 与 `yyh-ubuntu-a`；后者通过 ECS 的 ProxyCommand/FRP 隧道访问。默认先做只读检查，涉及部署、服务重启、数据库迁移、照片同步、回流或删除时，必须明确目标机器、影响范围和验证步骤。

本项目是双服务器共享 monorepo：ECS 与 Ubuntu 都从同一仓库获取代码，但各自只运行所需服务，允许保留对方服务的冗余代码。生产服务器原则上不直接开发或大规模改代码；ECS 因资源紧张，必须优先在开发机构建 Docker 镜像并传输部署，Ubuntu 才允许通过 `git pull` 后只安装/重载所需的原图服务、`frpc` 或本地服务。真实 `.env`、密钥、数据库、照片和日志不得进入仓库。

禁止在 ECS 上直接进行源码开发或大规模修改；紧急简单修改也必须立即 `git diff`、提交并 push。ECS 的运行目录必须保持仓库的 `nuxt-app/` 布局，不得再把应用代码平铺到仓库根目录，避免生产工作区与 monorepo 分叉。

## 开始工作前

1. 读取 `AGENTS.md`。
2. 从 `docs/README.md` 找到对应的当前架构、设计和运维文档；未完成事项只查看 `docs/planning/backlog.md`。
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
- 使用 Conda 环境时遵循根目录 `environment.yml` 和 `docs/operations/development-environment.md`。

验证失败要说明原因、影响范围和是否为环境问题，不得把未验证写成已完成。

## Git 边界

遵守 `docs/governance/git-version-control-governance.md`。代码、文档、模板、migration 和测试可以提交；真实照片、数据库、`.env`、Hermes 运行时数据、日志、备份和密钥不得提交。
