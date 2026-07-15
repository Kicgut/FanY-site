# Phase 2：数据库与权限模型迁移

## 1. 任务目标

在不破坏现有博客、照片、相册功能的基础上，升级 Prisma 数据模型，为照片权限、审核、同步、Hermes 内容流水线和 Skill Registry 留出字段。

## 2. 前置条件

- 已完成 Phase 1。
- 已备份 SQLite 数据库。
- 已阅读：
  - `docs/design/data-models-prisma.md`
  - `docs/architecture/auth-permission-model.md`
  - `docs/architecture/photo-asset-system.md`
  - `docs/architecture/content-pipeline.md`
  - `docs/architecture/hermes-skill-registry.md`

## 3. 改动范围

### 允许改动

- `prisma/schema.prisma`
- `prisma/migrations/**`
- 数据库 seed 脚本，如存在。
- TypeScript 类型定义，如存在。

### 禁止改动

- 不改前端 UI。
- 不改 API 行为，除非为了兼容新增字段。
- 不删除旧字段，除非已有兼容迁移。

## 4. 目标模型变更

### User 新增字段

```prisma
role           String   @default("admin")
groups         String?
status         String   @default("active")
aiAccess       Boolean  @default(false)
aiAccessLevel  String   @default("none")
lastLoginAt    DateTime?
uploadQuotaMb  Int      @default(500)
```

### Photo 新增字段

```prisma
originalPath      String?
thumbPath         String?
ecsThumbPath      String?
visibility        String   @default("private")
visibleTo         String?
reviewStatus      String   @default("approved")
reviewNote        String?
reviewedBy        Int?
reviewedAt        DateTime?
uploadedBy        Int?
storageLocation   String   @default("ecs")
syncStatus        String   @default("synced")
checksum          String?
archivedAt        DateTime?
allowOriginalDownload Boolean @default(false)
```

兼容原则：现有已发布照片迁移后应默认仍可展示。

建议迁移映射：

```text
旧 status=published → visibility=public, reviewStatus=approved, status=active
旧 status=archived  → status=archived, storageLocation=cold 或 ecs，按现状保守设 ecs
无 status 或其他 → status=hidden, visibility=private
```

### Album 新增字段

```prisma
visibility   String @default("public")
visibleTo    String?
reviewStatus String @default("approved")
```

### 新增 Portfolio

用于项目作品和摄影精选，避免继续混用照片画廊。

### 新增 Job

记录缩略图生成、同步、Hermes 整理、Skill 扫描等任务。

### 新增 AccessLog

记录照片原图访问、AI 访问、权限拒绝、高危操作尝试。

### 新增 ContentItem，可选

如果第一版内容流水线先走文件系统，可暂不建表。但建议预留，方便后台索引。

### 新增 HermesSkill，可选但建议

用于 Skill 只读展示、状态、风险等级和调用次数。

## 5. 执行步骤

1. 创建数据库备份。
2. 修改 Prisma schema。
3. 创建 migration。
4. 编写迁移兼容脚本，填充旧数据默认值。
5. 运行 Prisma generate。
6. 运行现有 API smoke test。
7. 手动检查旧照片、旧相册、旧文章仍可访问。

## 6. 验收标准

- 现有博客不受影响。
- 现有照片列表仍能展示。
- 现有相册仍能展示。
- 所有旧照片都有合法 `visibility`、`reviewStatus`、`storageLocation`、`syncStatus`。
- `User.aiAccess` 默认 false，除 owner 外无人自动获得 AI 权限。
- 无迁移脚本直接删除用户数据。

## 7. 验证 SQL 示例

```sql
SELECT visibility, reviewStatus, status, storageLocation, COUNT(*) FROM Photo GROUP BY visibility, reviewStatus, status, storageLocation;
SELECT aiAccess, aiAccessLevel, COUNT(*) FROM User GROUP BY aiAccess, aiAccessLevel;
```

## 8. 回滚方案

- 使用迁移前 SQLite 备份恢复。
- 回滚代码到迁移前。
- 不允许只回滚代码不回滚 DB。

## 9. Agent 注意事项

- 不允许把所有用户默认设为 `aiAccess=true`。
- 不允许把所有照片默认设为 public，除非它们原来已 published。
- 不允许删除旧字段造成现有页面立刻崩溃。
