---
title: "Phase 6：后台管理界面升级"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: active
purpose: "项目执行、验证或上下文管理文档。"
scope: "全项目"
related: []
tags:
  - project-management
---
# Phase 6：后台管理界面升级

## 1. 任务目标

把后台从基础 CRUD 升级为可控的内容资产管理界面，支持照片审核、权限设置、用户分组、AI 访问授权、同步状态和任务状态查看。

## 2. 前置条件

- Phase 3、4、5 已完成。
- API 已具备对应权限和审核能力。
- 已阅读 `docs/architecture/admin-system.md` 和 `docs/design/frontend-pages.md`。

## 3. 改动范围

### 允许改动

- `/admin/photos`
- `/admin/review/photos`
- `/admin/users`
- `/admin/storage`
- `/admin/jobs`
- `/admin/hermes` 占位入口
- 后台布局导航。

### 禁止改动

- 不绕过 API 直接读写数据库。
- 不在前端实现权限判断替代后端校验。
- 不提供远程永久删除按钮。

## 4. 必须新增或调整的页面

```text
/admin/review/photos
/admin/users
/admin/storage
/admin/jobs
/admin/hermes
/admin/hermes/skills
/admin/content-pipeline
```

## 5. 照片管理页能力

筛选：

- 年月
- visibility
- reviewStatus
- status
- storageLocation
- syncStatus
- uploadedBy
- album
- tag

批量操作：

- 设置 visibility
- 设置 visibleTo
- 设置 status hidden/active
- 加入相册
- 标记待同步
- 请求生成缩略图

远程禁止：

- 永久删除
- 批量删除本地文件
- 修改本地最高权限配置

## 6. 用户管理页能力

- 创建用户
- 禁用用户
- 设置 role
- 设置 groups
- 设置 aiAccess
- 设置 aiAccessLevel
- 设置 uploadQuotaMb
- 重置密码

## 7. 审核页能力

- 批准
- 拒绝
- 要求修改
- 仅保存不展示
- 设置可见范围
- 设置是否允许下载原图

## 8. 验收标准

- admin 用户可以完成照片审核闭环。
- 普通用户不能访问后台。
- 远程 owner 后台看不到永久删除高危入口，或点击后后端拒绝。
- 用户 AI 访问授权可以保存并立即生效。
- 所有批量操作有确认弹窗并显示影响数量。

## 9. UI 约束

- 高危操作必须二次确认。
- 批量操作必须显示筛选条件和选中数量。
- 权限字段必须显示解释，不只显示英文枚举。
- 审核结果必须可追溯。

## 10. 回滚方案

- 保留旧后台页面入口。
- 新页面可通过 feature flag 关闭。

## 11. Agent 注意事项

- 不允许把未完成 API 的按钮做成假成功。
- 不允许在 UI 层吞掉后端权限错误。
