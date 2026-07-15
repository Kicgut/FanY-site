# 安全验证与审核方式

## 1. 权限测试

必须验证：

- 未登录不能访问 `/ai`。
- 未授权登录用户不能访问 `/ai`。
- 普通朋友不能看 private 照片。
- 普通朋友不能看不属于自己的 friends visibleTo 照片。
- 远程 owner 不能永久删除。
- 本地 trusted 才能执行 critical 操作。

## 2. 文件安全测试

必须测试：

- `../` 路径逃逸被拒绝。
- symlink 逃逸被拒绝。
- 非图片伪装上传被拒绝。
- 超限文件被拒绝。
- 文件存在但 DB 不存在时不可访问。

## 3. 审核流测试

必须测试：

- pending 照片不出现在公开 gallery。
- rejected 照片不出现在用户页面。
- needs_edit 只上传者和 owner 可见。
- approved public 才同步 ECS 缩略图。

## 4. Hermes 测试

必须测试：

- 公网无法访问 Hermes 主 WebUI。
- `/ai` profile 无 shell。
- owner_remote 不能写 stable skill。
- Hermes 生成内容不会直接 published。

## 5. 审计测试

必须测试以下操作写入 audit log：

- 审核照片。
- 修改 visibility。
- 用户授权 AI。
- 下载 private 原图。
- 批量操作。
- 发布内容。
