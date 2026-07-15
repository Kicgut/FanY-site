# Phase 4：照片上传与待审核工作流

## 1. 任务目标

实现朋友/家人/你本人上传照片后的待审核机制：上传成功不等于展示，必须由你审核后进入公开、朋友、私人或归档状态。

## 2. 前置条件

- Phase 2、Phase 3 已完成。
- Photo 模型存在 `reviewStatus`、`uploadedBy`、`visibility`、`visibleTo`、`status`。
- 已阅读 `docs/design/review-workflows.md` 和 `docs/architecture/photo-asset-system.md`。

## 3. 改动范围

### 允许改动

- `/api/upload` 或新增 `/api/photos/upload`
- `/api/admin/review/photos/**`
- `/api/photos/my-uploads`
- 上传页面 `/upload` 或 `/friends/upload`
- 审核页面 `/admin/review/photos`

### 禁止改动

- 不实现永久删除。
- 不直接公开朋友上传内容。
- 不允许上传者决定最终 visibility。

## 4. 上传默认状态

朋友上传后：

```text
reviewStatus = pending
status = hidden
visibility = private
uploadedBy = currentUser.id
storageLocation = local
syncStatus = pending
allowOriginalDownload = false
```

你本人远程上传也建议默认 pending，除非明确选择“仅自己私人保存”。

## 5. 审核动作

### approve

批准时必须设置：

- visibility
- visibleTo，可空
- status
- albumIds，可空
- allowOriginalDownload
- tags，可空
- title/location/description，可空

### reject

拒绝后：

```text
reviewStatus = rejected
status = hidden
visibility = private
```

拒绝不等于删除。

### needs_edit

要求上传者补充信息：

```text
reviewStatus = needs_edit
status = hidden
```

上传者修改后重新变为：

```text
reviewStatus = pending
```

### private_archive

仅保存不展示：

```text
reviewStatus = approved
visibility = private
status = hidden 或 active
```

## 6. 需要实现的核心函数

```ts
createPendingPhotoUpload(input, user): Promise<Photo>
extractImageMetadata(file): Promise<ImageMetadata>
generateInitialThumbnail(file): Promise<ThumbnailResult>
listPendingPhotos(filters): Promise<PaginatedPhotos>
approvePhoto(photoId, decision, actor): Promise<Photo>
rejectPhoto(photoId, reason, actor): Promise<Photo>
requestPhotoEdit(photoId, note, actor): Promise<Photo>
resubmitPhoto(photoId, changes, actor): Promise<Photo>
```

## 7. 后台审核页面字段

必须展示：

- 缩略图
- 上传者
- 上传时间
- EXIF 时间
- EXIF 地点
- 文件大小
- 当前 reviewStatus
- 当前 visibility/status
- 上传者备注
- 重复文件提示，基于 checksum

## 8. 上传者页面

上传者只能看到自己上传内容的状态：

```text
pending
needs_edit
approved
rejected
```

不得看到其他用户上传内容。

## 9. 验收标准

- 朋友上传照片后，不出现在公开 gallery。
- 朋友上传照片后，不出现在 friends 相册，直到你批准。
- 审核批准为 public 后，公开 gallery 可见。
- 审核批准为 family 后，只有 family 用户可见。
- 拒绝后上传者能看到状态，但其他用户不可见。
- needs_edit 后上传者可补充信息并重新提交。

## 10. 安全验证

- 直接访问未审核照片 ID 应返回 403 或 404。
- 上传者不能伪造 visibility=public。
- 上传者不能伪造 uploadedBy。
- 前端隐藏字段不可信，服务端必须覆盖默认状态。

## 11. 回滚方案

- 禁用上传入口。
- 审核 API 回滚。
- pending 数据保留，不展示。

## 12. Agent 注意事项

- 不允许把“待审核”实现成纯前端状态。
- 不允许审核通过时默认公开。
