---
title: "照片资产系统架构"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: draft
purpose: "记录目标设计和待完成方案，不代表当前代码已经实现。"
scope: "全项目"
related: []
tags:
  - project-management
---
# 照片资产系统架构

## 1. 目标

照片系统从“画廊展示”升级为“资产管理”。

必须支持：

- 手机小批量上传。
- 电脑大批量导入。
- 自动读取 EXIF 时间、地点、尺寸。
- 手动标签、地点、描述。
- 后续本地大模型图片分析。
- public/friends/private 三档权限。
- 家人和朋友区分。
- 指定用户可见。
- 原图下载授权。
- 本地归档和冷存储恢复。

## 2. 存储分层

```text
ECS
  public thumbnails only

Local server
  all originals
  generated thumbnails
  private/friends access source

Cold storage
  archived originals
  manifest index
```

## 3. 照片状态

### visibility

```text
public    公开
friends   登录授权用户
private   仅 owner
```

### status

```text
active    展示
hidden    不展示但保留
archived  已归档
```

### reviewStatus

```text
pending     待审核
approved    已审核通过
rejected    拒绝
needs_edit  需要补充信息
```

### storageLocation

```text
local
ecs
cold
```

### syncStatus

```text
pending
synced
failed
skipped
```

## 4. 上传流程

```text
user upload
→ save to local incoming
→ validate file
→ extract EXIF
→ generate thumbnail
→ create DB record
→ reviewStatus=pending
→ status=hidden
→ owner review
```

## 5. 审核后处理

Owner 审核时决定：

- 标题。
- 标签。
- 地点。
- 相册。
- visibility。
- visibleTo。
- 是否允许下载原图。
- 是否加入摄影精选 Portfolio。

## 6. 公开展示条件

```text
visibility = public
status = active
reviewStatus = approved
```

## 7. friends 展示条件

```text
visibility = friends
status = active
reviewStatus = approved
user logged in
visibleTo is null or matches user/group
```

## 8. private 展示条件

```text
visibility = private
owner only
二次认证
```

## 9. 大模型图片分析预留

新增分析任务：

```text
photo_analysis_pending
photo_analysis_running
photo_analysis_done
photo_analysis_failed
```

AI 分析结果只作为建议写入：

```text
suggestedTags
suggestedLocation
suggestedDescription
suggestedPeople
```

不得自动覆盖人工字段。
