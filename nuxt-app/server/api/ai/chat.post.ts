import { requireLogin, canAccessAi, AI_LEVELS } from '~/server/utils/permission'
import { getAiProvider, validateChatInput } from '~/server/services/ai-gateway'
import { prisma } from '~/server/utils/db'
import { getRequestHeader } from 'h3'

// ─── Simple in-memory rate limiter (per user, per minute) ─────────────────────
const rateLimitMap = new Map<number, { count: number; resetAt: number }>()

function checkRateLimit(userId: number, maxPerMinute = 30): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= maxPerMinute) {
    return false
  }

  entry.count++
  return true
}

// Cleanup stale entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key)
    }
  }, 300_000)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  // 1. Require authenticated user
  const user = await requireLogin(event)

  // 2. Check AI access permission
  if (!canAccessAi(user, AI_LEVELS.CHAT)) {
    throw createError({
      statusCode: 403,
      message: 'AI 功能未授权，请联系管理员开通',
    })
  }

  // 3. Rate limit check
  if (!checkRateLimit(user.id)) {
    throw createError({
      statusCode: 429,
      message: '请求过于频繁，请稍后再试（每分钟最多30次）',
    })
  }

  // 4. Parse and validate input
  const body = await readBody(event)
  const prompt = body?.prompt as string

  const validation = validateChatInput(prompt)
  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      message: validation.error!,
    })
  }

  const conversationId = body?.conversationId as string | undefined

  // 5. Call AI provider
  const provider = getAiProvider()
  const result = await provider.chat({
    userId: user.id,
    aiAccessLevel: user.aiAccessLevel,
    prompt: prompt.trim(),
    conversationId,
  })

  // 6. Log to AuditLog
  try {
    const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
      || getRequestHeader(event, 'x-real-ip')
      || event.node?.req?.socket?.remoteAddress
      || 'unknown'

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ai_chat',
        resourceType: 'ai',
        resourceId: result.conversationId,
        afterJson: JSON.stringify({
          promptLength: prompt.length,
          responseLength: result.response.length,
          aiAccessLevel: user.aiAccessLevel,
        }),
        accessSource: 'remote',
        ip,
        userAgent: getRequestHeader(event, 'user-agent') || 'unknown',
      },
    })
  } catch (logErr) {
    // Don't fail the request if audit logging fails
    console.error('[AI Chat] AuditLog write failed:', logErr)
  }

  // 7. Return response
  return {
    success: true,
    data: {
      response: result.response,
      conversationId: result.conversationId,
      tokensUsed: result.tokensUsed,
    },
  }
})
