# 权限与身份模型

## 1. 目标

权限系统必须支持：

- 你本人优先。
- 家人和普通朋友区分。
- 指定用户可见。
- `/ai` 按用户授权。
- 远程 owner 受限。
- 本地最高权限。
- 高危操作二次确认。

## 2. 核心维度

权限判断不能只看 role，必须同时看：

```text
user identity
+ user groups
+ access source
+ operation type
+ resource visibility
+ resource review status
```

## 3. 用户字段

```prisma
model User {
  id              Int      @id @default(autoincrement())
  username        String   @unique
  password        String
  name            String
  role            String   @default("friend") // owner/admin/friend/viewer
  groups          String?  // JSON: ["family", "close-friends"]
  status          String   @default("active") // active/disabled
  aiAccess        Boolean  @default(false)
  aiAccessLevel   String   @default("none") // none/chat/limited/owner
  uploadQuotaMb   Int      @default(500)
  usedQuotaMb     Int      @default(0)
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 4. 访问来源

```text
public          未登录
remote_user     登录普通用户
remote_owner    owner 远程登录
local_trusted   本地可信访问
```

`local_trusted` 的判定可以来自：

- localhost。
- 局域网白名单。
- VPN/Tailscale/WireGuard 标记。
- 本地专用 admin token。

## 5. 操作等级

### safe

- 查看公开页面。
- 查看公开缩略图。

### normal

- 查看授权照片。
- 下载授权原图。
- 上传照片。
- 编辑自己上传内容的补充信息。

### sensitive

- 修改照片可见范围。
- 批准待审核内容。
- 管理用户权限。
- 查看私人照片。

### critical

- 永久删除照片。
- 修改 Hermes stable skill。
- 执行 shell。
- 修改系统配置。
- 删除冷存储文件。

## 6. 权限函数建议

```ts
canViewPhoto(user, photo, context): boolean
canDownloadOriginal(user, photo, context): boolean
canUploadPhoto(user, context): boolean
canReviewPhoto(user, photo, context): boolean
canChangeVisibility(user, photo, context): boolean
canDeletePhoto(user, photo, context): boolean
canAccessAI(user, context): boolean
canUseHermesProfile(user, profile, context): boolean
canManageSkill(user, skill, context): boolean
```

## 7. 关键规则

- `critical` 操作必须 `local_trusted`。
- `private` 照片远程查看必须 owner + 二次认证。
- `pending` 内容只 owner 可见。
- `friends` 内容必须登录且匹配 `visibleTo`。
- `/ai` 必须登录且 `aiAccess=true`。
- 普通用户不能改变最终 visibility。
