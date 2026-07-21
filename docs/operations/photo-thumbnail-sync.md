---
title: "Ubuntu 增量缩略图同步"
status: active
tags: [photos, sync, ubuntu, ecs]
---

# Ubuntu 增量缩略图同步

Ubuntu 的 `photo-thumbnail-sync.timer` 每 10 分钟读取 ECS 的 `pending` 同步队列，只处理 `public/friends + published` 照片的缩略图。每条记录先原子领取为 `syncing`，上传成功后回调 `complete`；失败则记录 `failed`，不会影响其他照片。

## 运行时配置

配置位于 Ubuntu 用户目录 `~/.config/personal-website/photo-backflow.env`，至少包含：

```text
PHOTO_SYNC_API_BASE=http://120.26.231.150
PHOTO_BACKFLOW_TOKEN=<与 ECS .env 中 PHOTO_BACKFLOW_TOKEN 相同>
PHOTO_BACKFLOW_LOCK_FILE=/home/aloof/.cache/personal-website/photo-thumbnail-sync.lock
```

token 只存在服务器运行时配置，不进入 Git。

## 检查命令

```bash
systemctl --user list-timers photo-thumbnail-sync.timer
systemctl --user start photo-thumbnail-sync.service
systemctl --user status photo-thumbnail-sync.service
```

该任务只上传缩略图，不上传原图；原图回流由 `photo-backflow.timer` 负责。
