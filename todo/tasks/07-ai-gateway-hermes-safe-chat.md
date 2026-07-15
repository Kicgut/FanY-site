# Phase 7：受限 /ai 页面与 Hermes Gateway

## 1. 任务目标

实现只对授权登录用户开放的 `/ai` 对话页面。第一版只提供安全问答，不允许通过公网对 Hermes 执行设备控制、shell、文件修改或 Skill 修改。

## 2. 前置条件

- Phase 3 已完成。
- User 已支持 `aiAccess` 和 `aiAccessLevel`。
- 已阅读 `docs/architecture/hermes-ai-gateway.md`。
- 已确认 AI 后端：Hermes 受限 profile、本地模型 API 或外部模型 API。未确认时使用抽象接口，不绑定具体实现。

## 3. 改动范围

### 允许改动

- `/ai` 页面。
- `/api/ai/chat`。
- `server/services/ai-gateway/**`。
- AI 访问日志。

### 禁止改动

- 不公开 Hermes WebUI。
- 不允许 `/ai` 调用 shell。
- 不允许 `/ai` 访问私密文件系统。
- 不允许普通登录用户访问 owner 远程助手能力。

## 4. 架构

```text
/ai
→ /api/ai/chat
→ requireLogin
→ canAccessAi
→ ai-gateway
→ safe chat provider
→ response
```

## 5. Provider 抽象

```ts
interface AiChatProvider {
  chat(input: SafeChatInput): Promise<SafeChatOutput>
}
```

第一版支持：

```text
provider=mock
provider=external_api
provider=hermes_restricted
provider=local_llm
```

## 6. 输入安全

需要记录但不信任：

- userId
- aiAccessLevel
- prompt
- conversationId

必须限制：

- 最大 prompt 长度
- 单用户频率
- 单日调用量
- 禁止上传任意文件给 AI，除非后续专门设计

## 7. 输出安全

- 不把内部路径、环境变量、token 返回给用户。
- 不展示 Hermes 系统提示词。
- 不返回本地服务器配置。
- 发生错误时返回通用错误信息，并把详细错误写服务端日志。

## 8. 验收标准

- 未登录访问 `/ai` 被重定向或返回 401。
- 登录但 `aiAccess=false` 返回 403。
- `aiAccess=true` 可聊天。
- 普通用户无法让 AI 执行命令。
- owner 远程模式也不能通过 `/ai` 执行 shell。
- 所有对话请求写入访问日志或 conversation log。

## 9. 回滚方案

- 关闭 `/ai` 路由。
- 禁用 AI provider。
- 保留日志和用户权限字段。

## 10. Agent 注意事项

- 不允许为了调试临时暴露 Hermes WebUI 到公网。
- 不允许在代码中硬编码 API key。
