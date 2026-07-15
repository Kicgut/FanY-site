# 前端页面设计

## 1. Public

```text
/
/blog
/blog/:slug
/blog/archive
/gallery
/gallery/:id
/portfolio
/portfolio/:slug
/about
/login
```

## 2. Logged-in user

```text
/ai
/friends/photos
/friends/albums
/upload
/my/uploads
```

## 3. Admin

```text
/admin
/admin/articles
/admin/photos
/admin/photos/review
/admin/albums
/admin/portfolio
/admin/users
/admin/content-pipeline
/admin/hermes
/admin/hermes/skills
/admin/storage
/admin/jobs
/admin/audit-log
/admin/security
```

## 4. 页面权限

- `/ai`：登录 + aiAccess。
- `/friends/*`：登录。
- `/upload`：登录 + quota 未超限。
- `/admin/*`：owner/admin。
- 本地高危操作按钮：只有 local_trusted 显示可操作。

## 5. 待审核页面

照片审核列表显示：

- 缩略图。
- 上传者。
- 上传时间。
- EXIF 时间。
- 地点。
- 文件大小。
- 重复检查结果。
- 用户备注。
- AI 建议标签。

操作：

- 批准。
- 拒绝。
- 要求修改。
- 仅保存不展示。
- 加入相册。
- 设置可见范围。
- 是否允许下载原图。
- 是否加入摄影精选。

## 6. Skill 页面

显示：

- 新增。
- 待处理。
- 已固化。
- 实验中。
- 已归档。
- 调用次数。
- 风险等级。

远程操作：

- 标记待处理。
- 写备注。
- 请求本地固化。
