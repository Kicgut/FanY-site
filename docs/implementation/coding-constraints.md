---
title: "代码撰写约束"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - docs\implementation
---
# 代码撰写约束

## 1. 禁止硬编码敏感信息

不得提交：

- JWT_SECRET。
- frp token。
- API key。
- 真实服务器密码。
- 私人路径中包含敏感信息的绝对路径。

## 2. API 约束

每个敏感 API 必须：

1. requireUser/requireAdmin。
2. 权限函数校验。
3. 输入校验。
4. service 层执行。
5. audit log。
6. 统一响应。

## 3. 文件约束

- 不接受用户传入任意路径。
- 只接受 id。
- 服务端从 DB 查路径。
- path resolve 后校验 root。
- 禁止 symlink 绕过。

## 4. AI/Hermes 约束

- `/ai` 不允许访客。
- Hermes 主 WebUI 不上公网。
- AI 输出只能进入 candidates/review。
- AI 不直接写 published。
- AI 不直接修改 stable skill。

## 5. 批量操作约束

批量操作必须返回：

```json
{
  "matched": 100,
  "changed": 95,
  "skipped": 5,
  "errors": []
}
```

必须记录 audit log。

## 6. 状态常量

状态值统一放在 constants：

```ts
PHOTO_VISIBILITY
PHOTO_STATUS
REVIEW_STATUS
STORAGE_LOCATION
SYNC_STATUS
USER_ROLE
ACCESS_SOURCE
```

禁止到处写裸字符串。
