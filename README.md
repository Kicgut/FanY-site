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

所有设计文档、任务拆分和执行规则位于 `todo/` 目录：

- **阅读起点**：`todo/00-index.md`
- **总体架构**：`todo/01-overall-architecture.md`
- **任务拆分**：`todo/tasks/00-task-index.md`（12 个可执行阶段）
- **Agent 规则**：`AGENTS.md`（通用）、`HERMES.md`（Hermes）、`CODEX.md`（Codex）

### 文档目录

```
todo/
├── 00-index.md                    # 文档索引（从这里开始）
├── 01-overall-architecture.md     # 总体架构设计
├── 02-current-to-target-adjustments.md  # 现状→目标调整
├── agent-context/                 # Agent 上下文
├── architecture/                  # 架构文档（8 篇）
├── design/                        # 设计文档（5 篇）
├── implementation/                # 实施文档（5 篇）
├── operations/                    # 运维文档（3 篇）
└── tasks/                         # 可执行任务（12 阶段）
    ├── 00-task-index.md           # 任务总索引
    ├── 01 ~ 12                    # 各阶段任务文档
    └── README.md                  # 任务目录说明
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
todo/              # V2 架构设计与任务
config/            # 配置文件模板
scripts/           # 运维脚本
AGENTS.md          # Agent 通用规则
HERMES.md          # Hermes 专用规则
CODEX.md           # Codex 专用规则
```
