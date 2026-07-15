# Git / GitHub 版本控制与协作边界规则

> 用途：给你、朋友协作者、Hermes、Codex 作为代码撰写和文件管理的强约束。  
> 核心原则：GitHub 只保存可协作、可审查、可复现的项目资产；不得保存真实私密数据、照片原图、数据库、密钥、个人对话原始记录或本地运行状态。

---

## 1. 总原则

本项目后续会多人协作开发，因此必须把“代码资产”和“个人数据资产”分开。

```text
Git / GitHub 管理：代码、架构文档、配置模板、迁移脚本、测试、示例数据
本地服务器管理：真实照片、真实对话、真实数据库、Hermes 运行数据、私密内容
ECS 管理：部署产物、运行数据库、公开缩略图、日志、运行配置
移动硬盘/冷存储管理：原图归档、数据库备份、长期备份
```

任何 Agent 在写代码前都必须判断当前文件属于哪一类。无法判断时，默认不要加入 Git，并向 owner 提出确认。

---

## 2. 必须纳入 Git 版本控制的内容

以下内容必须纳入 Git，并上传 GitHub，便于多人协作、审查和回滚。

### 2.1 应用源代码

```text
app.vue
nuxt.config.ts
tsconfig.json
content.config.ts
package.json
pnpm-lock.yaml
pnpm-workspace.yaml

assets/
components/
composables/
layouts/
middleware/
pages/
plugins/
server/
utils/
types/
```

要求：

- 所有业务逻辑必须可通过 Git 审查。
- 权限判断、API 路由、中间件、数据访问函数必须提交。
- 不允许把本地临时代码、调试硬编码密钥提交。

---

### 2.2 数据库结构与迁移

```text
prisma/schema.prisma
prisma/migrations/
prisma/seed.ts        # 如果只包含示例数据
```

允许提交：

- Prisma schema。
- migration SQL。
- 示例 seed。
- 用于开发环境的假数据生成脚本。

禁止提交：

```text
prod.db
*.db
*.sqlite
*.sqlite3
真实数据库 dump
真实用户数据导出
真实照片元数据导出
```

---

### 2.3 架构、规则、任务文档

```text
AGENTS.md
HERMES.md
CODEX.md
README.md
docs/
```

这些文档是 Hermes / Codex / 协作者的开发上下文，必须纳入 Git。

尤其必须提交：

```text
docs/00-index.md
docs/01-overall-architecture.md
docs/02-current-to-target-adjustments.md
docs/implementation/git-version-control-governance.md
docs/tasks/
docs/architecture/
docs/design/
docs/implementation/
docs/operations/
```

---

### 2.4 配置模板

允许提交模板，不允许提交真实配置。

允许：

```text
.env.example
config/nginx/*.example.conf
config/frp/*.example.toml
config/frp/*.example.ini
config/docker/*.example.yml
docker-compose.example.yml
```

不允许：

```text
.env
.env.local
.env.production
.env.*.local
真实 frp token
真实 JWT_SECRET
真实数据库路径和密码
真实 webhook token
真实对象存储 key
真实 SSH 私钥
```

---

### 2.5 部署、运维、同步脚本

允许提交脚本源代码：

```text
scripts/deploy.sh
scripts/backup.sh
scripts/restore.sh
scripts/rollback.sh
scripts/check-storage.sh
scripts/generate-thumbnails.sh
scripts/sync-thumbnails.sh
scripts/archive-photos.sh
scripts/restore-from-cold.sh
scripts/import-photos.sh
```

要求：

- 脚本中只能读取环境变量或配置文件模板。
- 不允许硬编码服务器密码、token、IP 白名单密钥、个人路径中的敏感信息。
- 真实路径可以通过 `.env` 或 `config/local.paths.example` 模板说明。

---

### 2.6 测试与示例数据

允许提交：

```text
tests/
__tests__/
fixtures/
examples/
```

但只能包含：

- 假用户；
- 假照片元数据；
- 小尺寸占位图；
- 示例 Markdown；
- 示例 Hermes 对话；
- 示例 Skill。

示例文件必须明确标注：

```text
example
sample
mock
fixture
```

---

## 3. 不得纳入 Git / GitHub 的内容

以下内容必须留在本地服务器、ECS 或备份介质中，不得提交 GitHub。

### 3.1 真实图片与媒体文件

禁止提交：

```text
public/uploads/photos/
public/uploads/originals/
public/uploads/private/
public/uploads/friends/
photos/
thumbnails/   # 如果是真实缩略图
*.jpg
*.jpeg
*.png
*.webp
*.gif
*.heic
*.mov
*.mp4
*.raw
*.dng
```

例外：

```text
public/demo/
fixtures/images/
docs/assets/
```

但必须是低风险示例图、占位图或自己明确允许公开的图片。

---

### 3.2 真实数据库与备份

禁止提交：

```text
data/
backups/
db-backups/
prod.db
*.db
*.sqlite
*.sqlite3
*.dump
*.backup
```

数据库备份只能存放在：

```text
ECS /opt/personal-website/data/
本地 /mnt/data/personal-website/db-backups/
移动硬盘 /mnt/backup/databases/
```

---

### 3.3 Hermes 真实运行数据

禁止提交：

```text
~/.hermes/
hermes/logs/
hermes/sessions/
hermes/workspaces/
hermes/conversations/
content-pipeline/01_raw/
content-pipeline/02_processed/private/
```

原因：

- 可能包含私人对话；
- 可能包含系统路径；
- 可能包含本地设备信息；
- 可能包含未公开想法；
- 可能包含可被 prompt injection 利用的上下文。

允许提交：

```text
docs/architecture/hermes-ai-gateway.md
docs/architecture/content-pipeline.md
docs/architecture/hermes-skill-registry.md
examples/hermes/
```

---

### 3.4 Hermes Skill 的真实工作目录

Hermes 实际运行 Skill 目录不得直接提交，尤其是自动生成、未审核、实验性、高风险 Skill。

禁止直接提交：

```text
~/.hermes/skills/
/mnt/data/hermes-skills/00_inbox/
/mnt/data/hermes-skills/01_review/
/mnt/data/hermes-skills/03_experimental/
```

允许提交：

```text
skills-public/
examples/skills/
docs/skills/
```

前提：

- 已审核；
- 不包含私人路径；
- 不包含密钥；
- 不包含高危自动执行逻辑；
- 不包含对本地文件系统的破坏性操作。

---

### 3.5 真实密钥与环境变量

禁止提交：

```text
.env
.env.local
.env.production
*.pem
*.key
id_rsa
id_ed25519
*.p12
*.crt   # 私有证书或含敏感部署信息时
*.token
secrets.*
```

必须提交的是：

```text
.env.example
```

`.env.example` 中只能写变量名和安全占位值。

---

### 3.6 运行日志、缓存、构建产物

禁止提交：

```text
.output/
.nuxt/
node_modules/
.cache/
logs/
*.log
coverage/
dist/
build/
.tmp/
tmp/
```

---

## 4. 建议的仓库结构

推荐 GitHub 仓库只保存以下结构：

```text
personal-website/
├── AGENTS.md
├── HERMES.md
├── CODEX.md
├── README.md
├── .gitignore
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── nuxt.config.ts
├── app.vue
├── assets/
├── components/
├── composables/
├── layouts/
├── middleware/
├── pages/
├── server/
├── prisma/
├── content/
│   └── blog/                 # 只放可公开或草稿示例内容
├── scripts/
├── config/
│   ├── nginx/
│   ├── frp/
│   └── examples/
├── docs/
├── tests/
├── fixtures/
└── examples/
```

真实数据放在仓库外：

```text
/mnt/data/personal-website/photos/
/mnt/data/personal-website/thumbnails/
/mnt/data/personal-website/content-pipeline/
/mnt/data/hermes-skills/
/opt/personal-website/data/prod.db
/mnt/backup/
```

---

## 5. 推荐 .gitignore

项目根目录必须维护 `.gitignore`，至少包含：

```gitignore
# dependencies
node_modules/
.pnpm-store/

# nuxt / build
.nuxt/
.output/
dist/
build/
.cache/

# environment
.env
.env.*
!.env.example

# databases
*.db
*.sqlite
*.sqlite3
*.dump
*.backup
data/
backups/
db-backups/

# logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# uploads and media
public/uploads/
uploads/
photos/
thumbnails/
originals/
*.jpg
*.jpeg
*.png
*.webp
*.gif
*.heic
*.raw
*.dng
*.mov
*.mp4

# allow selected docs/demo assets if needed
!docs/assets/**
!fixtures/**
!examples/**

# hermes runtime/private data
.hermes/
hermes/logs/
hermes/sessions/
hermes/workspaces/
hermes/conversations/
content-pipeline/00_inbox/
content-pipeline/01_raw/
content-pipeline/02_processed/
content-pipeline/03_candidates/private/
content-pipeline/04_review/

# secrets and keys
*.pem
*.key
id_rsa
id_ed25519
*.token
secrets.*

# OS/editor
.DS_Store
Thumbs.db
.vscode/settings.json
.idea/
```

如果需要提交某些示例图片，必须放在 `fixtures/`、`examples/` 或 `docs/assets/`，并确认没有隐私风险。

---

## 6. 多人协作规则

### 6.1 分支规则

推荐分支：

```text
main              稳定分支
feat/*            新功能
fix/*             修复
docs/*            文档
chore/*           工程维护
security/*        安全修复
```

禁止直接向 `main` 推送，除非是 owner 本地紧急修复。

---

### 6.2 PR 规则

每个 PR 必须说明：

```text
改动目标
涉及模块
是否涉及权限
是否涉及数据库迁移
是否涉及文件上传/删除
是否涉及 Hermes 或 AI 能力
是否需要更新 docs/tasks
验证方式
回滚方式
```

涉及以下内容的 PR 必须由 owner 审核：

```text
权限系统
照片可见性
远程删除/归档
Hermes Gateway
Skill Registry
本地最高权限
环境变量
部署脚本
Nginx/frp 配置
```

---

### 6.3 Commit 规范

建议格式：

```text
feat(photo): add review workflow
fix(auth): prevent disabled users from login
docs(git): add version control governance
chore(prisma): add photo visibility migration
security(ai): restrict hermes gateway tool access
```

---

## 7. Hermes / Codex 写代码前检查清单

任何 Agent 在创建、修改、删除文件前必须检查：

```text
1. 这个文件是否属于代码、文档、测试、配置模板？如果是，可以进 Git。
2. 这个文件是否包含真实照片、真实对话、真实数据库、真实密钥？如果是，禁止进 Git。
3. 这个文件是否是 Hermes 运行时文件？如果是，默认禁止进 Git。
4. 这个文件是否是示例数据？必须确认没有隐私风险，并放到 examples/ 或 fixtures/。
5. 是否需要更新 .gitignore？
6. 是否需要更新 docs/ 或任务文档？
7. 是否需要 owner 审核？
```

---

## 8. 版本控制边界示例

### 示例 1：新增照片审核页面

提交：

```text
pages/admin/review/photos.vue
server/api/admin/review/photos.get.ts
server/api/admin/review/photos.post.ts
docs/tasks/04-photo-review-workflow.md
```

不提交：

```text
朋友上传的真实照片
审核过程产生的真实缩略图
prod.db
```

---

### 示例 2：新增 Hermes 内容流水线

提交：

```text
server/api/admin/content-pipeline/*.ts
scripts/content-pipeline/*.sh
docs/architecture/content-pipeline.md
docs/tasks/08-content-pipeline.md
```

不提交：

```text
真实对话 raw 文件
Hermes session
私人草稿
未审核候选博客
```

---

### 示例 3：新增 Skill Registry 后台

提交：

```text
pages/admin/hermes/skills.vue
server/api/admin/hermes/skills.get.ts
scripts/hermes/scan-skills.ts
docs/architecture/hermes-skill-registry.md
```

不提交：

```text
~/.hermes/skills/
真实 experimental skills
usage-log.jsonl
包含私人路径的 skills-index.json
```

---

## 9. Agent 强制规则

Hermes、Codex 或其他 Agent 必须遵守：

```text
不得主动 git add public/uploads/ photos/ thumbnails/ data/ backups/ .env ~/.hermes/。
不得主动把真实图片、真实数据库、真实对话、真实密钥写入仓库。
不得为了测试方便提交本地绝对路径、token、账号密码。
不得绕过 .gitignore 强行添加被忽略文件。
不得将 content-pipeline 的 raw/private/review 内容当作可发布内容。
```

如确需提交被忽略类型文件，必须满足：

```text
1. owner 明确批准；
2. 文件已脱敏；
3. 文件放入 examples/、fixtures/ 或 docs/assets/；
4. PR 中说明原因。
```

---

## 10. 待确认决策

以下内容需要 owner 后续确认：

```text
1. 是否使用 GitHub private repo 作为默认协作仓库。
2. 是否允许朋友协作者访问所有 docs/ 架构文档。
3. 是否需要把公开博客 Markdown 直接放在 Git 中。
4. Hermes 生成的候选博客是否进入 Git，还是只在本地审核通过后进入 Git。
5. 是否使用 Git LFS 保存少量公开示例图片或作品集素材。
```

默认建议：

```text
GitHub 仓库使用 private。
代码和架构文档进 Git。
公开博客 Markdown 可以进 Git。
Hermes 候选内容不进 Git，审核通过后再进入 content/blog。
真实图片不进 Git，不使用 Git LFS 存真实照片。
```
