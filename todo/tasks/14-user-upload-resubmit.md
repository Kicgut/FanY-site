# 14 - 用户上传功能：我的上传 + 重新提交

## 状态

`not_started`

## 目标

为非 admin 用户（已注册账号的朋友/家人）提供：
1. **我的上传**页面 — 查看自己提交的照片及审核状态
2. **重新提交**功能 — 被要求修改或拒绝后，修改照片并重新提交审核

## 背景

当前现状：
- `GET /api/photos/my-uploads` 端点已删除（无前端调用）
- `POST /api/photos/[id]/resubmit` 端点已删除（无前端调用）
- `photo-review.ts` 中对应的 service 函数也已删除
- 审核流程存在"要求修改"(needs_edit) 状态，但上传者无法操作

需要重新实现这些功能，并确定 UI 放置位置。

## 前置条件

- 任务 04（照片审核流程）已完成
- 任务 03（用户认证）已完成
- 非 admin 用户能通过 `/api/photos/upload` 上传照片（当前已实现，但默认 status=hidden, visibility=private）

## UI 设计决策

### "我的上传" 放置位置

**推荐方案：顶部导航加入口 + 独立页面 `/my/uploads`**

理由：
- 已登录用户都能看到自己的上传记录
- 不依赖 admin 后台权限
- 导航入口提醒用户有"待处理"的审核反馈

导航入口（仅登录用户可见）：
```
首页 | 博客 | 照片相册 | 我的上传(admin不可见) | ... | 后台(admin)
```

### 页面结构

```
/my/uploads
├── 照片网格（缩略图 + 标题）
├── 每张照片显示状态标签：
│   ├── 🟡 待审核 (pending)
│   ├── 🟢 已通过 (approved)  
│   ├── 🔴 已拒绝 (rejected) + 拒绝原因
│   └── 🟠 需修改 (needs_edit) + 修改意见
├── 筛选：按 reviewStatus 过滤
└── 操作按钮：
    ├── needs_edit → "修改并重新提交" 
    └── rejected → "修改并重新提交"
```

### "重新提交" 交互流程

```
用户点击"修改并重新提交"
  → 弹出编辑对话框（标题、描述、位置 + 显示审核意见）
  → 用户修改后点击提交
  → POST /api/photos/[id]/resubmit
  → reviewStatus 回到 'pending'
  → 通知 admin 有新提交（未来可做，暂不实现通知）
```

## 改动范围

### 新建文件
- `pages/my/uploads.vue` — 我的上传页面
- `server/api/photos/my-uploads.get.ts` — 获取当前用户的上传列表
- `server/api/photos/[id]/resubmit.post.ts` — 重新提交

### 恢复 service 函数（从 git 历史恢复或重写）
- `photo-review.ts` 中恢复 `getMyUploads()` 和 `resubmitPhoto()`

### 修改文件
- `layouts/default.vue` — 导航栏加"我的上传"入口
- `server/api/photos/upload.post.ts` — 确认非 admin 上传的默认行为正确（status=hidden, visibility=private, reviewStatus=pending）

## 执行步骤

1. 恢复 `photo-review.ts` 中的 `getMyUploads()` 和 `resubmitPhoto()` 函数
2. 创建 `server/api/photos/my-uploads.get.ts`
3. 创建 `server/api/photos/[id]/resubmit.post.ts`
4. 创建 `pages/my/uploads.vue` 页面
5. 修改 `layouts/default.vue` 添加导航入口
6. 测试非 admin 用户上传 → 审核 → 需修改 → 重新提交完整流程

## 验收标准

- [ ] 非 admin 用户登录后能在导航栏看到"我的上传"
- [ ] 点击进入能看到自己上传的照片列表
- [ ] 每张照片显示正确的审核状态标签
- [ ] needs_edit 状态的照片显示审核意见
- [ ] rejected 状态的照片显示拒绝原因
- [ ] 点击"修改并重新提交"能修改标题/描述/位置
- [ ] 重新提交后 reviewStatus 变回 pending
- [ ] 非 admin 用户看不到其他人的上传
- [ ] admin 看不到"我的上传"入口（admin 用后台管理）

## 禁止事项

- 非 admin 用户不能直接设置 status=published 或 visibility=public
- 重新提交不能绕过审核流程
- 不能让 rejected 状态的照片出现在公开页面
- 用户不能删除其他人的照片
