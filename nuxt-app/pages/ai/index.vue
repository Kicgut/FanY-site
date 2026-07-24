<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const user = ref<any>(null)
const loading = ref(false)
const inputText = ref('')
const conversationId = ref<string | undefined>(undefined)
const messages = reactive<ChatMessage[]>([])
const chatContainer = ref<HTMLElement | null>(null)
const authFetch = useAuthFetch()

const hasAccess = computed(() => user.value?.aiAccess === true)
const accessLevel = computed(() => user.value?.aiAccessLevel || 'none')
const aiStatus = ref<{ provider: string; model: string; status: string } | null>(null)
const conversations = ref<Array<{ id: string; title: string | null; updatedAt: string; _count: { messages: number } }>>([])

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  none: '无权限',
  chat: '基础对话',
  limited: '受限访问',
  owner: '完全访问',
}

const accessLevelLabel = computed(() => ACCESS_LEVEL_LABELS[accessLevel.value] || accessLevel.value)

onMounted(async () => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    user.value = null
  }

  // Refresh permissions from the server so stale localStorage cannot hide
  // a newly enabled AI account or show an outdated configuration state.
  try {
    const res = await authFetch<{ success: boolean; data: { user: any } }>('/api/auth/me')
    user.value = res.data.user
    localStorage.setItem('user', JSON.stringify(user.value))
  } catch {
    // The global auth middleware will handle an expired token.
  }

  if (hasAccess.value) {
    addWelcomeMessage()
    fetchAiStatus()
    loadConversations()
  }
})

async function loadConversations() {
  try {
    const res = await authFetch<{ success: boolean; data: { conversations: typeof conversations.value } }>('/api/ai/conversations')
    conversations.value = res.data.conversations
  } catch {}
}

async function openConversation(id: string) {
  try {
    const res = await authFetch<{ success: boolean; data: { conversation: { id: string; messages: Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }> } } }>(`/api/ai/conversations/${id}`)
    conversationId.value = res.data.conversation.id
    messages.splice(0, messages.length, ...res.data.conversation.messages.map((message) => ({ role: message.role, content: message.content, timestamp: new Date(message.createdAt) })))
    scrollToBottom()
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '加载会话失败')
  }
}

async function deleteConversation() {
  if (!conversationId.value) return
  try {
    await authFetch(`/api/ai/conversations/${conversationId.value}`, { method: 'DELETE' })
    conversations.value = conversations.value.filter((item) => item.id !== conversationId.value)
    conversationId.value = undefined
    messages.splice(0, messages.length)
    addWelcomeMessage()
    ElMessage.success('会话已删除')
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '删除会话失败')
  }
}

async function archiveConversation() {
  if (!conversationId.value) return
  try {
    await authFetch(`/api/ai/conversations/${conversationId.value}`, { method: 'PATCH', body: { action: 'archive' } })
    conversations.value = conversations.value.filter((item) => item.id !== conversationId.value)
    conversationId.value = undefined
    messages.splice(0, messages.length)
    addWelcomeMessage()
    ElMessage.success('会话已归档')
  } catch (err: any) { ElMessage.error(err?.data?.message || '归档会话失败') }
}

async function fetchAiStatus() {
  try {
    const res = await authFetch<{ success: boolean; data: { provider: string; model: string; status: string } }>('/api/ai/status')
    aiStatus.value = res.data
  } catch {
    // ignore
  }
}

function addWelcomeMessage() {
  messages.push({
    role: 'assistant',
    content: '你好！我是 AI 助手，很高兴为您服务。请问有什么可以帮助您的？\n\n⚠️ 当前为模拟模式（Mock Provider），接入真实模型后将提供完整对话能力。',
    timestamp: new Date(),
  })
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

async function sendMessage() {
  const prompt = inputText.value.trim()
  if (!prompt || loading.value) return

  // Add user message
  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date(),
  })
  inputText.value = ''
  scrollToBottom()

  loading.value = true

  try {
    const data = await authFetch<{ success: boolean; data: { response: string; conversationId: string } }>('/api/ai/chat', {
      method: 'POST',
      body: {
        prompt,
        conversationId: conversationId.value,
      },
    })

    if (data.success) {
      conversationId.value = data.data.conversationId
      messages.push({
        role: 'assistant',
        content: data.data.response,
        timestamp: new Date(),
      })
    }
  } catch (err: any) {
    const errorMsg = err?.data?.message || '请求失败，请稍后重试'
    messages.push({
      role: 'assistant',
      content: `❌ 错误：${errorMsg}`,
      timestamp: new Date(),
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="ai-page">
    <!-- No Access State -->
    <div v-if="!hasAccess" class="no-access">
      <el-card class="no-access-card" shadow="always">
        <div class="no-access-content">
          <el-icon :size="64" color="#909399">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </el-icon>
          <h2>AI 功能未授权</h2>
          <p>您当前没有 AI 助手的使用权限。</p>
          <p>请联系管理员开通 AI 访问权限后重试。</p>
          <el-button type="primary" @click="$router.push('/')">
            返回首页
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- Chat Interface -->
    <div v-else class="chat-wrapper">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-left">
          <h2>🤖 AI 助手</h2>
          <el-tag :type="accessLevel === 'owner' ? 'danger' : 'success'" size="small">
            {{ accessLevelLabel }}
          </el-tag>
        </div>
        <el-tag :type="aiStatus?.status === 'active' ? 'success' : 'warning'" size="small">
          {{ aiStatus?.status === 'active' ? `${aiStatus.model}` : aiStatus?.status === 'mock' ? '模拟模式' : '未配置' }}
        </el-tag>
      </div>

      <div v-if="conversations.length" class="conversation-tools">
        <el-select :model-value="conversationId" placeholder="选择历史会话" clearable @change="(id: string) => id && openConversation(id)">
          <el-option v-for="item in conversations" :key="item.id" :label="item.title || `会话 ${item.id.slice(0, 8)}`" :value="item.id">
            <span>{{ item.title || `会话 ${item.id.slice(0, 8)}` }}</span><small>{{ item._count.messages }} 条消息</small>
          </el-option>
        </el-select>
        <el-button v-if="conversationId" type="danger" plain @click="deleteConversation">删除当前会话</el-button>
        <el-button v-if="conversationId" type="warning" plain @click="archiveConversation">归档当前会话</el-button>
      </div>

      <!-- Messages Area -->
      <div ref="chatContainer" class="chat-messages">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="['message-row', msg.role === 'user' ? 'message-user' : 'message-ai']"
        >
          <el-card
            :class="['message-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']"
            shadow="never"
          >
            <div class="message-content">
              {{ msg.content }}
            </div>
            <div class="message-time">
              {{ formatTime(msg.timestamp) }}
            </div>
          </el-card>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="message-row message-ai">
          <el-card class="message-bubble bubble-ai" shadow="never">
            <div class="loading-dots">
              <span /><span /><span />
            </div>
          </el-card>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          resize="none"
          :disabled="loading"
          :maxlength="4000"
          show-word-limit
          @keydown="handleKeydown"
        />
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!inputText.trim()"
          class="send-btn"
          @click="sendMessage"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

/* No Access State */
.no-access {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.no-access-card {
  max-width: 480px;
  width: 100%;
}

.no-access-content {
  text-align: center;
  padding: 20px 0;
}

.no-access-content h2 {
  margin: 16px 0 8px;
  color: #303133;
}

.no-access-content p {
  color: #606266;
  margin: 4px 0;
}

/* Chat Wrapper */
.chat-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.conversation-tools { display: flex; gap: 10px; padding: 10px 20px; border-bottom: 1px solid #ebeef5; background: #fff; }
.conversation-tools :deep(.el-select) { flex: 1; }
.conversation-tools small { float: right; color: #909399; margin-left: 12px; }

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #303133;
}

/* Messages Area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 300px;
  max-height: calc(100vh - 320px);
  background: #fafafa;
}

.message-row {
  display: flex;
  margin-bottom: 16px;
}

.message-user {
  justify-content: flex-end;
}

.message-ai {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
}

.bubble-user {
  background: #409eff;
  color: #fff;
}

.bubble-user :deep(.el-card__body) {
  padding: 10px 14px;
}

.bubble-ai {
  background: #fff;
}

.bubble-ai :deep(.el-card__body) {
  padding: 10px 14px;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 0.95rem;
}

.bubble-user .message-content {
  color: #fff;
}

.message-time {
  font-size: 0.75rem;
  margin-top: 6px;
  opacity: 0.6;
}

.bubble-user .message-time {
  color: rgba(255, 255, 255, 0.8);
  text-align: right;
}

.bubble-ai .message-time {
  color: #909399;
}

/* Loading Dots */
.loading-dots {
  display: flex;
  gap: 6px;
  padding: 4px 0;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: dot-bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: 0s;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Input Area */
.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  align-items: flex-end;
}

.chat-input :deep(.el-textarea__inner) {
  border-radius: 8px;
}

.send-btn {
  height: 56px;
  min-width: 80px;
  border-radius: 8px;
}
</style>
