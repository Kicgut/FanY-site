// ─── AI Chat Gateway ──────────────────────────────────────────────────────────
import { saveConversationMarkdown } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

// Abstract AI provider interface + multiple implementations.
// SECURITY: No shell access, no file system access, no API keys in code.
// ─────────────────────────────────────────────────────────────────────────────

export interface AiChatInput {
  userId: number
  aiAccessLevel: string
  prompt: string
  conversationId?: string
}

export interface AiChatOutput {
  response: string
  conversationId: string
  tokensUsed?: number
}

export interface AiChatProvider {
  chat(input: AiChatInput): Promise<AiChatOutput>
}

// ─── Mock Provider (default) ──────────────────────────────────────────────────

class MockAiProvider implements AiChatProvider {
  async chat(input: AiChatInput): Promise<AiChatOutput> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500))

    const preview = input.prompt.length > 50
      ? input.prompt.slice(0, 50) + '...'
      : input.prompt

    return {
      response: `[Mock AI] 收到您的消息：${preview}\n\nAI 功能正在配置中，敬请期待。当前为模拟响应，接入真实模型后将提供完整对话能力。`,
      conversationId: input.conversationId || crypto.randomUUID(),
    }
  }
}

// ─── OpenAI-compatible Provider ────────────────────────────────────────────────
// Works with: OpenAI, Azure OpenAI, Anthropic (via proxy), DeepSeek, etc.

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// In-memory conversation store (keyed by conversationId)
const conversations = new Map<string, ConversationMessage[]>()

function conversationKey(userId: number, conversationId: string) {
  return `${userId}:${conversationId}`
}

export async function archiveConversationTurn(
  userId: number,
  conversationId: string,
  prompt: string,
  response: string,
) {
  const existingConversation = await prisma.aiConversation.findUnique({ where: { id: conversationId }, select: { userId: true } })
  if (existingConversation && existingConversation.userId !== userId) throw new Error('Conversation does not belong to user')
  const key = conversationKey(userId, conversationId)
  let history = conversations.get(key) || []
  if (!history.length) {
    history = [{ role: 'user', content: prompt }, { role: 'assistant', content: response }]
  } else if (history[history.length - 1]?.content !== response) {
    if (history[history.length - 1]?.content !== prompt) {
      history.push({ role: 'user', content: prompt })
    }
    history.push({ role: 'assistant', content: response })
  }
  conversations.set(key, history.slice(-20))
  await prisma.aiConversation.upsert({
    where: { id: conversationId },
    create: { id: conversationId, userId, messages: { create: [{ role: 'user', content: prompt }, { role: 'assistant', content: response }] } },
    update: { userId, messages: { create: [{ role: 'user', content: prompt }, { role: 'assistant', content: response }] } },
  })
  await saveConversationMarkdown(userId, conversationId, conversations.get(key) || [])
}

export async function assertConversationOwner(userId: number, conversationId?: string) {
  if (!conversationId) return
  const conversation = await prisma.aiConversation.findUnique({ where: { id: conversationId }, select: { userId: true } })
  if (conversation && conversation.userId !== userId) throw createError({ statusCode: 403, message: 'Conversation access denied' })
}

async function loadConversation(userId: number, conversationId: string): Promise<ConversationMessage[]> {
  const conversation = await prisma.aiConversation.findFirst({ where: { id: conversationId, userId }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } } })
  return conversation?.messages.filter((message) => message.role === 'user' || message.role === 'assistant').map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content })) || []
}

class OpenAICompatibleProvider implements AiChatProvider {
  private apiKey: string
  private baseUrl: string
  private model: string
  private maxTokens: number

  constructor(config: {
    apiKey: string
    baseUrl: string
    model: string
    maxTokens?: number
  }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.model = config.model
    this.maxTokens = config.maxTokens || 2048
  }

  async chat(input: AiChatInput): Promise<AiChatOutput> {
    const conversationId = input.conversationId || crypto.randomUUID()
    const key = conversationKey(input.userId, conversationId)

    // Get or create conversation history
    let history = conversations.get(key) || await loadConversation(input.userId, conversationId)
    history.push({ role: 'user', content: input.prompt })

    // Keep last 20 messages to avoid token overflow
    if (history.length > 20) {
      history = history.slice(-20)
    }

    const systemPrompt = this.getSystemPrompt(input.aiAccessLevel)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`AI API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as any
    const aiResponse = data.choices?.[0]?.message?.content || '抱歉，AI 未能生成回复。'
    const tokensUsed = data.usage?.total_tokens

    // Save assistant response to history
    history.push({ role: 'assistant', content: aiResponse })
    conversations.set(key, history)

    // Cleanup old conversations (keep last 100)
    if (conversations.size > 100) {
      const keys = Array.from(conversations.keys())
      for (let i = 0; i < keys.length - 100; i++) {
        conversations.delete(keys[i])
      }
    }

    return {
      response: aiResponse,
      conversationId,
      tokensUsed,
    }
  }

  private getSystemPrompt(level: string): string {
    const base = '你是一个有用的 AI 助手，服务于个人网站的用户。请用中文回复。'

    switch (level) {
      case 'owner':
        return `${base} 你拥有完全访问权限，可以讨论任何话题。`
      case 'limited':
        return `${base} 你有受限的访问权限，避免讨论敏感操作。`
      case 'chat':
      default:
        return `${base} 你只能进行基础对话，不涉及系统操作。`
    }
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

export function getAiProvider(): AiChatProvider {
  const provider = process.env.AI_PROVIDER || 'mock'

  switch (provider) {
    case 'openai':
    case 'deepseek':
    case 'custom': {
      const apiKey = process.env.AI_API_KEY
      if (!apiKey) {
        console.warn(`[AI Gateway] AI_PROVIDER=${provider} but AI_API_KEY not set, falling back to mock`)
        return new MockAiProvider()
      }
      return new OpenAICompatibleProvider({
        apiKey,
        baseUrl: process.env.AI_BASE_URL || getDefaultBaseUrl(provider),
        model: process.env.AI_MODEL || getDefaultModel(provider),
        maxTokens: process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS) : 2048,
      })
    }

    case 'mock':
    default:
      return new MockAiProvider()
  }
}

function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1'
    case 'deepseek': return 'https://api.deepseek.com/v1'
    default: return 'https://api.openai.com/v1'
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-4o-mini'
    case 'deepseek': return 'deepseek-chat'
    default: return 'gpt-4o-mini'
  }
}

// ─── Input Validation ─────────────────────────────────────────────────────────

export function validateChatInput(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: '消息不能为空' }
  }
  if (prompt.length > 4000) {
    return { valid: false, error: '消息过长（最多4000字）' }
  }
  return { valid: true }
}
