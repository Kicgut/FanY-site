# ECS / 本地服务器 / frp / 存储架构

## 1. ECS 职责

- Nginx 入口。
- Nuxt 应用。
- SQLite 主数据库。
- 公开缩略图。
- 作品集图片。
- 博客图片。
- frps 服务端。
- 备份和监控脚本。

## 2. 本地服务器职责

- 所有照片原图。
- friends/private 文件访问源。
- Hermes 主实例。
- 本地大模型接口。
- content-pipeline。
- skill registry。
- 缩略图生成。
- 冷存储归档。

## 3. frp 推荐方向

推荐：

```text
ECS: frps
Local: frpc
```

原因：本地服务器通常在 NAT 后，主动连出更稳定。

## 4. 访问链路

```text
用户请求原图
→ ECS Nuxt API
→ 权限校验
→ ECS localhost:3001
→ frp tunnel
→ Local photo-server
→ 文件流返回
```

不要让用户直接访问：

```text
/friends-photos/raw-path
/private-photos/raw-path
```

## 5. 存储策略

```text
ECS:
  public thumbnails
  portfolio images
  blog images

Local:
  all originals
  private/friends files
  generated thumbnails

Cold:
  archived originals
  manifest
  backups
```

## 6. 本地离线行为

- 公开网站仍可访问。
- 公开缩略图仍可访问。
- friends/private 原图不可访问。
- 后台显示本地服务离线。
- 不应删除或修改 DB 状态。
