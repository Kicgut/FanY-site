# AGENTS.md — 项目通用代理规则

> 适用于 Codex、Hermes、Claude Code、Cursor Agent 及其他代码代理。先读本文件，再按任务读取 `CODEX.md`、`HERMES.md` 和 `docs/README.md`。

## 项目定位

本项目由四部分组成：公开网站、照片资产管理、Hermes 内容生产中枢、私密内容安全网关。

## 服务器名称与职责

- **ECS 服务器**：运行公网网站、Nuxt/API、Docker、Nginx 和 frps，承担网站前台、管理后台、API 及 AI 网关。AI 配置写入 ECS 的 `nuxt-app/.env`。
- **Ubuntu 服务器（服务器 A）**：提供本地后台服务，保存照片原图、私密内容和本地备份，运行 Immich、本地 Skills API、Skill 同步、frpc 及照片回流等服务。

两台服务器不得混称：公网网站、API 和 AI 配置默认指 ECS；原图、Skill 同步、Immich 和本地高信任操作默认指 Ubuntu 服务器（服务器 A）。详细约定见 `docs/operations/server-roles.md`。

核心原则：

1. 公开、朋友、私人内容必须分层隔离。
2. 本地服务器保存原图、私密内容、Hermes 主实例和最高权限操作；ECS 只承担入口和公开展示。
3. AI/Hermes 只能生成候选内容，不能绕过人工审核自动公开。
4. 远程 owner 不是最高权限；删除、shell、Skill 修改等破坏性操作必须要求 `local_trusted`。

## 权威文档与阅读顺序

- 文档入口和目录：`docs/README.md`
- 当前架构：`docs/architecture/current-architecture.md` 及相关模块文档
- 设计、工程规范与运维手册：`docs/design/`、`docs/governance/`、`docs/operations/`
- 未完成计划：`docs/planning/backlog.md`
- Codex 专用约束：`CODEX.md`
- Hermes 专用约束：`HERMES.md`

任务开始前先确认当前实现，再区分“已实现”“计划中”“历史记录”；不要把计划文档当作代码事实。

## 文档编码与中文内容保护

- 根目录及 `docs/` 下的 Markdown 文档统一使用 UTF-8 保存；读取或写回文件时必须显式指定 UTF-8，禁止使用系统默认 ANSI/GBK 编码进行转换。
- 修改文档时应保留原有中文、Markdown 结构和换行；避免通过脚本或 shell 对整份文档重新编码或重写无关内容。
- 写入后必须用 UTF-8 重新读取检查，并查看 `git diff`；重点确认没有出现 `鈥`、`鍐`、`閫`、`锛`、`€?` 等典型转码乱码，也没有大段内容被合并到同一行。
- 一旦发现乱码，立即停止继续覆盖文件，优先从最近的正常 Git 版本恢复，再用明确的 UTF-8 编码重新编辑。

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

代码、文档、配置模板、migration 和测试进入 Git；真实数据、密钥、运行时目录和备份不得进入 Git。提交前参考 `docs/governance/git-version-control-governance.md`。

## 镜像构建目录与产物

- 所有 Docker 构建临时目录、Git 源码快照、源码快照压缩包、镜像导出包和 SHA-256 校验文件必须放在仓库外的 `E:\FanY-site-build\` 下，不要散落在 `E:\` 根目录。
- 建议按提交组织：`E:\FanY-site-build\<commit>\source\`、`E:\FanY-site-build\<commit>\artifacts\`。
- `FanY-site-build-<commit>` 目录是 Git 源码构建快照，不是 Docker 镜像；`FanY-site-build-<commit>.zip` 是源码快照压缩包。
- `personal-website-<commit>.tar.gz` 是 `docker save` 导出的镜像包，`.sha256` 是传输校验文件。镜像包传输到 ECS 并 `docker load` 后才成为 ECS 本地镜像。
- 构建完成并确认 ECS 部署成功后，可以清理旧的源码快照和本地镜像包，但必须保留正在运行版本对应的镜像包，或先确认已有远程/冷备份。
- ECS 禁止构建；构建机使用固定 Git commit 导出源码快照、构建镜像、保存镜像包，再通过校验后传输。
