# Personal Website V2

> 个人公开网站 + 照片资产管理系统 + Hermes 内容生产中枢 + 私密内容安全网关

## 快速开始

```bash
# 本地开发
cd nuxt-app && pnpm install && pnpm dev

# Docker 部署
docker compose up -d
```

## 架构与 Agent 文档入口

所有设计文档、任务拆分和执行规则位于 [`docs/README.md`](docs/README.md)：

- **阅读起点**：`docs/README.md`
- **当前架构**：`docs/architecture/`
- **任务拆分**：`docs/project-management/tasks/00-task-index.md`
- **Agent 规则**：`AGENTS.md`（通用）、`HERMES.md`（Hermes）、`CODEX.md`（Codex）

### 文档目录

```
docs/
├── architecture/                   # 当前架构
├── design/                         # 数据、API、页面与流程设计
├── implementation/                 # 编码、安全、测试与 Git 规范
├── operations/                     # 备份、监控、同步与恢复
├── deployment/                     # 环境和部署操作手册
├── project-management/tasks/       # 分阶段执行任务
├── project-management/plans/       # 目标方案与未完成计划
├── agent-context/                  # 决策、实现和验证记录
├── learning-notes/                 # 学习和阶段复盘
└── templates/                      # 文档模板
```

### 执行记录

- `docs/agent-context/decisions/` — 决策日志
- `docs/agent-context/implementation-notes/` — 实施笔记
- `docs/agent-context/verification/` — 验证记录

## 技术栈

- **前端**：Nuxt 3 + Vue 3 + Element Plus + TypeScript
- **后端**：Nuxt Server API + Prisma ORM + SQLite
- **认证**：JWT + bcrypt
- **部署**：Docker + Nginx + frp
- **内容**：Nuxt Content (Markdown)

## 项目结构

```
nuxt-app/          # Nuxt 3 主应用
docs/              # 文档（按子目录分类）
docs/              # 架构、设计、实现、运维和项目管理文档
config/            # 配置文件模板
scripts/           # 运维脚本
AGENTS.md          # Agent 通用规则
HERMES.md          # Hermes 专用规则
CODEX.md           # Codex 专用规则
```
