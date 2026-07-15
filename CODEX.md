# CODEX.md - Codex / 代码生成上下文

## 1. 代码任务目标

Codex 在本项目中主要负责：

- Nuxt/Vue 页面实现。
- Server API 实现。
- Prisma schema/migration。
- 脚本和服务实现。
- 测试与验证。

Codex 不负责决定产品权限边界。权限边界以 `AGENTS.md`、`HERMES.md`、`docs/architecture/*` 为准。

## 2. 推荐代码组织

```text
server/
├── api/
├── services/
│   ├── auth.service.ts
│   ├── permission.service.ts
│   ├── photo.service.ts
│   ├── review.service.ts
│   ├── hermes.service.ts
│   ├── content-pipeline.service.ts
│   └── skill-registry.service.ts
├── utils/
│   ├── response.ts
│   ├── path-guard.ts
│   ├── audit-log.ts
│   └── errors.ts
└── middleware/
```

## 3. Server API 实现约束

每个 handler 应当遵循：

```text
read request
→ auth
→ permission check
→ validate input
→ call service
→ write audit log if needed
→ return unified response
```

禁止：

- 在 API handler 中直接拼接文件路径。
- 在 API handler 中写复杂权限判断。
- 在公开 API 中返回本地真实路径。
- 在非 admin API 中返回 private metadata。

## 4. 文件路径安全

所有文件操作必须经过 `path-guard.ts`：

- 输入只能是 photoId/contentId/skillId，不直接接受任意 path。
- 路径必须 resolve 后确认位于允许根目录。
- 禁止 `..` 逃逸。
- 禁止 symlink 绕过。

## 5. 测试最低要求

- 权限单元测试。
- API 越权测试。
- 文件路径 escape 测试。
- 待审核不展示测试。
- friends visibleTo 测试。
- 本地最高权限判断测试。

## Git / GitHub 文件边界

Codex 在增删改文件时必须遵守 `docs/implementation/git-version-control-governance.md`。不得添加真实图片、数据库、`.env`、Hermes 运行时数据、日志、备份或本地私密内容。新增 `.gitignore` 或修改忽略规则时，应优先保护真实数据。
