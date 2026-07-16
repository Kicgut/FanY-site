# AGENTS.md — 项目通用代理规则

> 适用于 Codex、Hermes、Claude Code、Cursor Agent 及其他代码代理。先读本文件，再按任务读取 `CODEX.md`、`HERMES.md` 和 `docs/README.md`。

## 项目定位

本项目由四部分组成：公开网站、照片资产管理、Hermes 内容生产中枢、私密内容安全网关。

核心原则：

1. 公开、朋友、私人内容必须分层隔离。
2. 本地服务器保存原图、私密内容、Hermes 主实例和最高权限操作；ECS 只承担入口和公开展示。
3. AI/Hermes 只能生成候选内容，不能绕过人工审核自动公开。
4. 远程 owner 不是最高权限；删除、shell、Skill 修改等破坏性操作必须要求 `local_trusted`。

## 权威文档与阅读顺序

- 文档入口和目录：`docs/README.md`
- 当前架构：`docs/architecture/`
- 设计、实现、运维规范：`docs/design/`、`docs/implementation/`、`docs/operations/`
- 任务和未完成计划：`docs/project-management/tasks/`、`docs/project-management/plans/`
- Codex 专用约束：`CODEX.md`
- Hermes 专用约束：`HERMES.md`

任务开始前先确认当前实现，再区分“已实现”“计划中”“历史记录”；不要把计划文档当作代码事实。

## 安全边界

代理不得实现以下行为，除非明确标注为仅本地最高权限并获得人工确认：

- 公网暴露 Hermes WebUI 完整能力或远程执行 shell。
- 远程永久删除照片、冷存储文件或数据库。
- 自动修改稳定 Skill、系统配置或 frp/nginx/docker 配置。
- AI 生成后自动公开发布，或让用户上传后直接公开展示。
- 绕过 Nuxt API 权限校验暴露 friends/private 原图或元数据。
- 将真实 `.env`、JWT_SECRET、frp token、API key、数据库、照片、对话、日志或备份写入 Git。

## 实现规则

- 新 API 必须执行认证、权限校验、输入校验，并通过 service 层访问数据库或文件系统。
- 文件路径只能由数据库 ID 或白名单根目录解析，必须防止 `..` 逃逸和 symlink 绕过。
- 批量操作要支持 dry-run 或返回影响范围，并记录 audit log。
- 照片、内容和 Skill 的状态流转必须显式，禁止隐式发布。
- 新 Prisma 字段必须有 migration、验证方式和回滚说明。
- 统一响应：成功为 `{ success: true, data }`，失败为 `{ success: false, code, message }`。

## 修改后的最低验证

根据风险选择并记录验证结果，至少覆盖：权限拒绝、越权隔离、待审核不公开、路径边界、批量审计日志；数据库修改还需执行 Prisma 校验和迁移验证，前端/服务修改还需执行类型检查与构建。

## Git 边界

代码、文档、配置模板、migration 和测试进入 Git；真实数据、密钥、运行时目录和备份不得进入 Git。提交前参考 `docs/implementation/git-version-control-governance.md`。
