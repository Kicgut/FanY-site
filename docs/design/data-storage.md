---
title: "数据管理与数据存储约定"
created: 2026-08-01
updated: 2026-08-01
status: current
purpose: "说明项目中数据库、用户上传文件、作品媒体、照片和前端静态素材的存储位置，以及哪些内容可以提交或上传。"
scope: "全项目"
related:
  - ../architecture/photo-system.md
  - ../operations/storage-sync-archive.md
  - ./directory-structure.md
  - ./frontend-ui-guidelines.md
tags:
  - docs\\design
---

# 数据管理与数据存储约定

本文以当前代码、Prisma schema 和 Docker Compose 为准，区分三种“上传”：

1. **提交到 Git 仓库**：源代码、文档和前端静态素材。
2. **通过后台/API 上传到运行环境**：照片、作品媒体等运行时用户数据。
3. **生产主机之间的同步**：照片缩略图同步、原图回流和备份，不是 Git 上传。

## 1. 先说结论

- 生产数据库位于容器内 `/app/data/prod.db`，由 Compose 将宿主机部署目录下的 `../data` 挂载到 `/app/data`。按当前生产目录约定，宿主机位置是 `/opt/personal-website/data/prod.db`。
- `nuxt-app/.data` **不是当前生产数据库挂载点**。它是被忽略的本地运行时目录，发布前检查脚本也会在这里放本地数据库快照和备份；不能把它当作生产持久化目录。
- 照片上传先写入 ECS 容器的 `/app/public/uploads/photos/`，该目录通过宿主机 `../uploads` 持久化。原图临时放在 `photos/ecs-originals/`，缩略图和中图放在 `photos/thumbnails/`。
- 用户照片的长期原图通常保存在 Ubuntu 本地服务器 `/mnt/data/personal-website/photos/`，按 `incoming/`、`public/`、`friends/`、`private/` 等可见性目录管理；ECS 主要保存展示用缩略图，并通过受控 API 提供原图访问或执行回流。
- 作品记录、作品文本、资源链接、内容区块和提示词条目都在 SQLite 数据库文件中：生产环境是宿主机 `/opt/personal-website/data/prod.db`（容器内 `/app/data/prod.db`）。其中分别对应 `Portfolio`、`PortfolioMedia`、`PortfolioResource`、`PortfolioBlock`、`PortfolioPromptEntry` 和 `PortfolioPromptTag` 表；作品图片、GIF、视频等媒体文件则由后台上传到挂载目录 `uploads/portfolio/`。
- 前端固定设计素材（背景图、地球/月球、角色、sprite、组件装饰图等）属于源代码资源，统一放在 `nuxt-app/public/images/`（首页专属素材放 `nuxt-app/public/images/home/`），需要提交到 Git。
- 运行时上传文件和生产数据不能提交到 Git；生产环境也不应依赖镜像内的文件来保存数据。

## 2. 存储位置总表

| 数据类型 | 数据内容 | 生产/运行时位置 | Git/发布规则 |
| --- | --- | --- | --- |
| 业务数据库 | 用户、会话、文章、照片元数据、相册、作品、审核记录、任务、审计日志等 | SQLite：容器 `/app/data/prod.db`；宿主机 `/opt/personal-website/data/prod.db` | 不提交；必须备份，数据库文件被忽略 |
| 本地运行数据库/快照 | 开发数据库、发布前检查快照、临时备份 | `nuxt-app/.data/` | 不提交；`.data` 被忽略 |
| 照片原图 | 用户上传或导入的 JPEG/PNG/WebP 等原始照片 | Ubuntu：`/mnt/data/personal-website/photos/{visibility}/{YYYY-MM}/`；ECS 上传初始暂存于 `/app/public/uploads/photos/ecs-originals/{YYYY-MM}/` | 不提交；通过后台/API或同步脚本处理 |
| 照片缩略图/中图 | 列表、相册和详情页展示图 | Ubuntu：`/mnt/data/personal-website/thumbnails/`；ECS：`/app/public/uploads/photos/thumbnails/{YYYY-MM}/` | 不提交；可重建，但生产仍需持久化/备份 |
| 作品媒体 | 作品封面、图片、GIF、视频及其 poster | ECS 容器 `/app/public/uploads/portfolio/`，宿主机 `../uploads/portfolio/`；数据库记录在 `PortfolioMedia` | 不提交；通过后台作品媒体上传接口上传 |
| 通用登录用户上传 | 兼容上传接口产生的图片 | 容器 `/app/public/uploads/`，宿主机 `../uploads/` | 不提交；使用场景应逐步收敛到具体业务目录 |
| 文章/内容流水线运行数据 | 导入文件、草稿、生成内容、发布前候选等 | `content/inbox/`、`content/raw/`、`content/generated/`、`content/drafts/`、`data/blog-md/`、`data/content-pipeline/` 等挂载/运行时目录 | 不提交 |
| 前端静态设计素材 | 背景图、首页场景、组件元素、角色图、sprite、固定图标等 | `nuxt-app/public/images/`，首页素材优先 `nuxt-app/public/images/home/` | **需要提交到 Git**；构建后随 Nuxt 静态资源发布 |
| 文档配图 | 架构图、UI 参考图、流程图等 | `docs/**` 或 `docs/design/assets/` | 需要提交到 Git；根 `.gitignore` 已对 `docs` 下常见图片放行 |
| 备份与归档 | 数据库备份、媒体备份、冷存储 | 生产备份目录、外部磁盘或 `cold-storage` | 不提交；按备份/恢复手册管理 |

## 3. `.data`、`data`、`uploads` 的区别

这三个名字不能混用：

### `nuxt-app/.data`

这是项目内的本地运行时目录。根 `.gitignore` 和 `nuxt-app/.gitignore` 都忽略它，生产镜像构建时还会删除 `/app/.data`。当前代码中，`portfolio-release-preflight.mjs` 使用它保存本地生产样数据库和发布前备份快照。

它不是生产持久化数据的正式位置，也不是照片原图目录。

### 宿主机 `data/` 与容器 `/app/data/`

`nuxt-app/docker-compose.yml` 当前配置为：

```yaml
volumes:
  - ../data:/app/data
  - ../uploads:/app/public/uploads
  - ../uploads:/app/.output/public/uploads
  - ../backups:/app/backups
```

因此生产中真正需要持久化的是部署目录旁的 `data/`、`uploads/` 和 `backups/`。数据库连接串是 `file:/app/data/prod.db`。

### `uploads/`

这是运行时上传媒体的持久化根目录，不是源代码资源目录。它包含照片展示文件、作品媒体以及兼容上传接口产生的文件，不能通过 Git 管理。

当前生产 Compose 将宿主机 `../uploads` 同时挂载到容器的 `/app/public/uploads` 和 `/app/.output/public/uploads`。前者是上传代码写文件的位置，后者是 Nuxt/Nitro 生产构建产物实际提供静态文件的位置；两个容器路径对应**同一份宿主机数据**。

因此，`uploads/` 虽然在容器内看起来位于 `/app/public/`，但它不是 build 时打进镜像的 `nuxt-app/public/uploads/` 内容，而是启动容器后由绑定挂载覆盖出来的外部持久化目录。只要部署时保留 `/opt/personal-website/uploads/`，重新 build、拉取新镜像或重建容器都不会覆盖其中的运行时文件。

## 4. ECS 宿主机、容器与仓库的对应关系

当前部署关系可按下面理解（`→` 表示 Docker bind mount）：

```text
代码仓库（开发机）
E:\FanY-site\
└── nuxt-app\
    └── public\images\                 固定设计素材，提交 Git，build 进镜像
        ├── about-background.webp
        └── home\...

ECS 宿主机
/opt/personal-website/
├── nuxt-app/                            部署用源码与 docker-compose.yml
│   └── public/images/                   固定素材的源码副本，参与 Docker build
├── data/
│   └── prod.db                          → 容器 /app/data/prod.db
├── uploads/                             运行时数据，不参与 Docker build
│   ├── photos/
│   │   ├── ecs-originals/
│   │   └── thumbnails/
│   └── portfolio/
│       └── <随机文件名>.<扩展名>
│                                      → 容器 /app/public/uploads/
│                                      → 容器 /app/.output/public/uploads/
└── backups/                             → 容器 /app/backups/

运行中的 app 容器
/app/
├── data/
│   └── prod.db                          SQLite：用户、文章、照片元数据、作品等
├── public/
│   ├── images/                          镜像内固定素材，只读看待
│   └── uploads/                         ECS 宿主机 uploads 的挂载视图，可写
└── .output/public/
    ├── images/                          构建后的固定静态资源
    └── uploads/                         同一份 ECS 宿主机 uploads 的挂载视图
```

也就是说，`/app/public/uploads/photos/` 在 ECS 上对应 `/opt/personal-website/uploads/photos/`；`/app/data/prod.db` 对应 `/opt/personal-website/data/prod.db`；`/app/nuxt-app` 不是当前容器的业务目录，应用镜像内的工作目录是 `/app`，其内容由 ECS 的 `/opt/personal-website/nuxt-app` 执行 Docker build 产生。

## 5. 当前哪些目录是挂载目录

以下清单以 `nuxt-app/docker-compose.yml` 的 `volumes` 为准。它们都位于 ECS 宿主机，不随镜像 build 或容器重建而改变；前提是部署过程不手工删除或替换宿主机源目录。

| ECS 宿主机目录 | 容器内目录 | 用途 | build/重建容器后的结果 |
| --- | --- | --- | --- |
| `/opt/personal-website/data/` | `/app/data/` | SQLite 数据库 `prod.db`、运行时数据库相关数据 | 保留，不被新镜像覆盖 |
| `/opt/personal-website/uploads/` | `/app/public/uploads/` | API 写入照片、作品媒体和通用上传文件 | 保留，不被新镜像覆盖 |
| `/opt/personal-website/uploads/` | `/app/.output/public/uploads/` | 让生产 Nuxt/Nitro 静态服务读取同一批上传文件 | 保留，不被新镜像覆盖 |
| `/opt/personal-website/backups/` | `/app/backups/` | 运行时备份文件 | 保留，不被新镜像覆盖 |

`uploads/` 出现两次不是两份数据：它是同一个宿主机目录，被映射到两个容器路径。不要把这两个目标目录分别清理或分别备份；只需备份宿主机的 `/opt/personal-website/uploads/`。

当前应用 Compose **没有**把 `/opt/personal-website/nuxt-app/`（代码目录）整体挂入容器；代码、依赖、`public/images` 和 `.output` 都来自新建的镜像。因此代码目录与下节列出的镜像内静态资源会随版本更新替换。

## 6. 哪些目录会随 build/版本更新替换

下列内容是代码仓库的一部分，由 Dockerfile `COPY . .` 和 `nuxt build` 生成或复制进镜像。每次构建并切换到新镜像时，容器中对应的非挂载区域都会替换为新版本内容：

| 仓库位置 | 容器中的典型位置 | 是否应放运行时数据 | 原因 |
| --- | --- | --- | --- |
| `nuxt-app/public/images/` | `/app/public/images/` 及 `/app/.output/public/images/` | 否 | 固定背景图、组件图等设计素材，应该随代码版本发布 |
| `nuxt-app/public/` 中除 `uploads/` 外的内容 | `/app/public/` 及构建后的 `.output/public/` | 否 | 属于源代码静态资源，会由 build 重新生成/复制 |
| `nuxt-app/pages/`、`components/`、`server/`、`assets/`、`prisma/` 等 | `/app/` 与 `.output/` 的应用代码 | 否 | 属于应用版本，更新时替换 |
| `.output/` | `/app/.output/` | 否 | Nuxt 的生产构建产物，每次 build 重建 |

唯一的例外是 `/app/public/uploads/` 和 `/app/.output/public/uploads/`：它们虽然名字位于 `public` 下，但运行时被挂载覆盖，因此不是镜像内 `public` 的一部分。

### `nuxt-app/prisma/` 保存什么

`nuxt-app/prisma/` 保存的是数据库的**蓝图和升级脚本**，不是生产业务数据：

- `schema.prisma`：表、字段、关联和索引定义，例如 `User`、`Photo`、`Portfolio` 和 `PortfolioMedia`；
- `migrations/`：每次数据库结构或数据迁移对应的 SQL 记录，生产启动时通过 `prisma migrate deploy` 应用到数据库；
- `dev.db`（如本地出现）：仅用于开发/测试的 SQLite 文件，被 Git 忽略，不是生产数据库。

实际的生产用户、照片、作品和其他业务记录仍存于 `/opt/personal-website/data/prod.db`（容器内 `/app/data/prod.db`）。

## 7. `nuxt-app/public/uploads` 在开发与生产中为什么都能读取

`nuxt-app/public/uploads` 不只是“测试专用目录”，而是当前代码约定的**逻辑上传路径**。同一套上传代码根据运行环境写到不同的实际存储介质：

```text
本地开发（pnpm dev）
process.cwd() = <仓库>/nuxt-app
写入：<仓库>/nuxt-app/public/uploads/
读取：Nuxt 开发服务器直接从 public/ 提供 /uploads/...
持久化：本机文件；被 .gitignore 忽略，不提交 Git

ECS 生产（Docker Compose）
process.cwd() = /app
代码写入：/app/public/uploads/
实际落盘：/opt/personal-website/uploads/（bind mount）
读取：Nitro 从 /app/.output/public/ 提供静态文件；
      Compose 将同一 uploads 目录也挂到 /app/.output/public/uploads/
```

后台作品媒体接口和通用上传接口均使用 `join(process.cwd(), 'public', 'uploads', ...)` 写入文件。因此本地开发时会自然写进 `nuxt-app/public/uploads`；生产时同一表达式得到 `/app/public/uploads`，而 Docker 挂载将写入转到 ECS 宿主机目录。不是 ECS “自动读取”项目源码的 `app/public`，而是 Compose 明确配置了两条挂载：一条保证写入位置持久化，另一条保证生产静态服务能读取同一文件。

本地 `nuxt-app/public/uploads/` 可以保留测试文件，但它们不会被 Git 提交，也被 `.dockerignore` 排除，不会被打进生产镜像。若需要把本地测试媒体带到生产，应通过后台上传、受控迁移或明确的文件同步完成，不能依赖 Docker build 复制它们。

## 8. 为什么运行时文件不应随 build 覆盖

Dockerfile 会把源码（包括 `nuxt-app/public/images/`）复制进镜像并构建 `.output`，所以固定背景图、组件图等应当随代码发布。相反，`.dockerignore` 已排除 `public/uploads`，Compose 也以宿主机绑定挂载替换两个 `uploads` 目录；这正是为了避免运行时上传文件被新镜像覆盖。

正常代码发布只需要保持 `data/`、`uploads/`、`backups/` 三个宿主机目录不被删除。需要额外处理的情况只有：首次部署创建目录/权限、迁移到新主机时复制这些持久化目录、或有人手工清理了宿主机目录。不能在部署脚本中删除、重建或用空目录替换 `/opt/personal-website/uploads`。

理论上，动态文件可以改放到 `/app/data/uploads/`，并对应宿主机 `data/uploads/`；这样语义上会把所有运行时数据归在一个根目录。不过当前实现已使用独立的 `uploads/` 挂载，功能上同样安全，并且上传文件还能通过 `/uploads/...` 静态 URL 高效提供。若迁移到 `/app/data/uploads`，必须同时修改上传写入路径、照片读取/同步/一致性检查、作品媒体 URL 服务方式、Compose 挂载和备份规则；不能只移动目录。

## 9. 照片数据的组成和流转

照片在数据库中不是只有一个 URL。`Photo` 记录同时保存：

- 文件标识与路径：`filename`、`originalPath`、`thumbPath`、`ecsThumbPath`；
- 展示 URL：`originalUrl`、`thumbnailUrl`、`mediumUrl`；
- 文件元数据：MIME、大小、宽高、拍摄时间、相机/镜头、GPS 等；
- 业务状态：`visibility`（`public`/`friends`/`private`）、`status`、`reviewStatus`；
- 存储同步状态：`storageLocation`、`syncStatus`、`ecsSyncPolicy`、`checksum`；
- 缩略图处理状态：`thumbnailStatus`、错误信息、重试次数和处理时间；
- 相册、标签、审核和原图下载权限等关联信息。

上传流程是：后台/API 接收图片 → 写入 ECS `photos/ecs-originals` → 生成约 400px 缩略图和约 1200px 中图 → 写入 `Photo` 元数据 → 根据可见性、审核状态和同步策略向 Ubuntu/展示侧同步。原图不能直接暴露文件系统路径，前端应使用受控照片 API 返回的 URL。

## 10. 作品数据放在哪里

作品的“内容数据”和“媒体文件”分开存储：

### 数据库中的作品内容

以下表都属于同一个 SQLite 文件，而不是独立文件：生产为 `/opt/personal-website/data/prod.db`，容器内为 `/app/data/prod.db`。

- `Portfolio`：标题、slug、描述、类型（`project`/`visual`/`tool`）、标签、年份、状态、审核状态、排序等；
- `PortfolioMedia`：封面/图片/GIF/视频的类型、公开 URL、尺寸、MIME、处理状态、说明文字和排序；
- `PortfolioResource`：外部链接、演示地址、下载地址等；
- `PortfolioBlock`：富文本、时间线、代码、对比、图片画廊、嵌入等结构化内容区块；
- `PortfolioPromptEntry` 及其标签：工具类作品使用的提示词条目。

### 文件系统中的作品媒体

后台上传作品媒体时，文件写入：

```text
<运行容器>/app/public/uploads/portfolio/<随机文件名>.<扩展名>
```

对外记录为类似 `/uploads/portfolio/<文件名>` 的公开 URL；真实文件由宿主机 `/opt/personal-website/uploads/portfolio/` 持久化。支持的媒体包括 JPEG、PNG、GIF、WebP、MP4、WebM 和 QuickTime，单文件上限为 50 MB。视频上传后默认先处于待处理/草稿状态，未达到可发布状态的媒体不应出现在公开作品接口中。

作品的标题、描述、代码、时间线和资源链接不应做成静态 JSON 或散落在 `public/`；它们应通过后台写入数据库并由作品 API 读取。

## 11. 哪些内容需要上传或提交

### 需要提交到 Git 仓库

- `nuxt-app/public/images/` 中的前端固定素材：背景图、首页场景图、地球/月球、角色、sprite 拆帧、组件装饰图、固定图标等；
- `docs/` 中的架构图、UI 参考图和文档配图；
- 与素材配套的组件代码、CSS、静态资源引用和文档说明；
- 需要作为代码评审一部分的 SVG、字体或其他小型源文件（确认许可证后）。

背景图等设计素材必须放入 `nuxt-app/public/images/` 后提交。例如：

```text
nuxt-app/public/images/about-background.webp
nuxt-app/public/images/home/hero-moonland.webp
nuxt-app/public/images/home/earth-orb.webp
nuxt-app/public/images/home/cat-idle/frame-01.png
```

### 通过后台/API上传，不提交到 Git

- 用户照片原图；
- 照片生成的缩略图、中图和临时处理文件；
- 作品封面、作品图片、GIF、视频和视频 poster；
- 运行时通用上传文件；
- 文章导入文件、内容流水线的草稿/生成中间产物；
- 数据库、审计数据、会话数据和备份文件。

## 12. 明确禁止上传/提交的内容

以下内容不得提交 Git，也不能把它们误放进 `public/images/`：

- 生产数据库、开发数据库、SQLite journal、数据库快照和备份；
- 用户照片原图、私有照片、朋友可见照片及其未脱敏副本；
- `public/uploads/` 下的运行时上传媒体；
- `photos/`、`thumbnails/`、`originals/`、`backups/`、`releases/`、`cold-storage/` 等运行时目录；
- `.env`、JWT secret、AI/API token、照片服务 token、FRP 密钥和任何密码；
- 内容流水线的收件箱、草稿、生成结果和生产导出数据；
- 含 EXIF/GPS、个人信息或未确认版权的原始素材；
- 将真实作品媒体复制一份放到 `public/images/` 作为运行时数据的做法。

不要通过给文件改名、移动到其他目录或手工 `git add -f` 绕过忽略规则。若某个文件既是固定设计素材又包含用户私有数据，应先脱敏或重新导出为可公开的设计资源，再提交。

## 13. 新增素材和数据的判断规则

可以按下面的判断快速决定位置：

```text
页面始终固定使用、随代码版本发布？
  ├─ 是 → nuxt-app/public/images/，提交 Git
  └─ 否
      是用户/管理员上传的照片或作品媒体？
        ├─ 是 → 后台/API → 持久化 uploads/photos 或 uploads/portfolio，不提交
        └─ 否
            是数据库记录、草稿、任务、会话或备份？
              ├─ 是 → 数据库或挂载运行时目录，不提交
              └─ 否 → 先确认归属和公开范围，再决定放入 docs、源码或运行时存储
```

变更存储路径、挂载关系、照片同步策略或作品媒体规则时，应同步更新本文、`docs/architecture/` 和对应的 `docs/operations/` 手册，并执行一次生产备份与一致性检查。
