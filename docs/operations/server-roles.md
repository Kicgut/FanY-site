---
title: "服务器角色命名约定"
status: final
---
# 服务器角色命名约定

为避免部署、照片同步和 FRP 排障时混淆，项目统一使用以下名称。

## ECS 服务器

“ECS 服务器”专指运行网站服务的公网 ECS：

- 运行 Nuxt、Docker Compose、Nginx 和 frps。
- 提供网站前台、管理后台以及 `/api/*` 接口。
- 保存网站运行数据库、公开展示用缩略图和临时上传文件。
- AI 网关也运行在这里，因此 `AI_PROVIDER`、`AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY` 必须配置在 ECS 的 `nuxt-app/.env`，再重启网站容器。

## Ubuntu 服务器（服务器 A）

“服务器 A”专指提供本地后台服务的 Ubuntu 服务器，不等同于 ECS：

- 保存照片原图、私密内容和本地备份。
- 运行 Immich、本地 Skills API、Skill 同步以及相关本地服务。
- 运行 frpc，主动连接 ECS 的 frps 建立隧道。
- 负责照片回流、缩略图同步和本地高信任操作。

服务器 A 不负责直接运行公网网站；网站 AI 配置也不放在服务器 A，除非未来明确改为由服务器 A 提供本地模型 API。

## 快速判断

| 需求 | 应操作的机器 |
|---|---|
| 修改 AI API Key | ECS 服务器的 `nuxt-app/.env` |
| 重启网站/API | ECS 服务器的 Docker Compose |
| 检查前台 404 或后台路由 | ECS 服务器的 Nuxt/Nginx |
| 检查原图是否存在 | Ubuntu 服务器（服务器 A） |
| 检查 Skill 同步或 Immich | Ubuntu 服务器（服务器 A） |
| 检查 FRP 服务端/客户端 | 服务端在 ECS；客户端在 Ubuntu 服务器（服务器 A） |
