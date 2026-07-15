# AGENTS.md - 项目通用代码代理规则

> 本文件放在项目根目录，供 Hermes、Codex、Claude Code、Cursor Agent 等代码代理优先读取。

## 1. 项目定位

本项目不是普通个人网站，而是：

```text
个人公开网站 + 照片资产管理系统 + Hermes 内容生产中枢 + 私密内容安全网关
```

核心原则：

1. 你本人优先，其次家人朋友，最后普通访客。
2. ECS 只做轻量入口和公开展示，不长期保存大量原图。
3. 本地服务器保存原图、私密内容、Hermes 主实例和最高权限操作。
4. 公开内容、朋友内容、私人内容必须分层隔离。
5. AI/Hermes 只能生成候选内容，不能默认直接公开发布。
6. 远程 owner 登录也不是最高权限；本地可信访问才有最高破坏性权限。

## 2. 当前技术栈

- Nuxt 3
- Vue 3
- TypeScript
- Element Plus
- Nuxt Content
- Prisma
- SQLite
- JWT
- Docker
- Nginx
- frp
- Node.js

## 3. 必须遵守的安全边界

任何代码代理不得实现以下行为，除非明确标注为“仅本地最高权限”并经过人工确认：

- 从公网直接暴露 Hermes WebUI 的完整能力。
- 允许远程执行 shell 命令。
- 允许远程永久删除照片、冷存储文件或数据库。
- 让 Hermes 自动修改已固化 skill 源文件。
- 让 AI 生成内容后自动公开发布。
- 让朋友上传内容后直接公开展示。
- 绕过 Nuxt API 权限校验直接暴露 friends/private 原图路径。
- 把真实 `.env`、JWT_SECRET、frp token、API key 写进仓库或文档。

## 4. 权限模型原则

所有敏感操作必须同时考虑：

```text
身份权限：user.role / user.groups
访问来源：local_trusted / remote_owner / remote_user / public
操作类型：view / upload / edit / publish / delete / execute
```

高危操作必须要求 `local_trusted`。

## 5. 代码生成规则

- 所有新 API 必须有权限校验。
- 所有文件路径必须从数据库或白名单根目录解析，禁止直接拼接用户输入。
- 所有批量操作必须支持 dry-run 或至少返回影响范围。
- 所有批量操作必须写 audit log。
- 照片、内容、skill 的状态流转必须显式，不允许隐式发布。
- 新增 Prisma 字段必须提供 migration 和回滚说明。
- 新增后台页面必须说明用户能看到什么、能操作什么、不能操作什么。
- 公开页面不得引用 private/friends 永久 URL。
- Hermes 相关实现必须经过 gateway，不得直接从公网访问 Hermes 主进程。

## 6. 代码风格

- TypeScript 优先使用显式类型。
- Server API 中抽出 service 层，不要把权限、数据库、文件操作全部写在 handler 中。
- 统一错误格式：`{ success: false, code, message }`。
- 统一成功格式：`{ success: true, data }`。
- 状态字符串集中定义常量，避免散落硬编码。

## 7. 验证要求

每次修改至少检查：

1. 未登录访问是否被拒绝。
2. 普通用户是否不能越权访问 private/friends 内容。
3. 远程 owner 是否不能执行本地最高权限操作。
4. 待审核内容是否不会出现在公开页面。
5. 公开照片是否只展示 `visibility=public && status=active && reviewStatus=approved`。
6. friends 照片是否校验 `visibleTo`。
7. 文件操作是否限制在允许目录下。
8. 批量操作是否记录日志。

## Git / GitHub 文件边界

所有 Agent 在创建或修改文件后，必须参考 `docs/implementation/git-version-control-governance.md` 判断文件是否允许进入 Git。代码、文档、配置模板、迁移和测试应进入 Git；真实照片、真实数据库、真实 Hermes 对话、运行日志、密钥、`.env`、上传文件和冷存储内容不得进入 GitHub。
