import { requireLogin, canAccessAi, AI_LEVELS } from '~/server/utils/permission'
import { archiveConversationTurn, assertConversationOwner, getAiProvider, validateChatInput } from '~/server/services/ai-gateway'
import { createCandidate, CANDIDATE_SOURCE, CONTENT_TYPE } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

/**
 * Generate a reviewable content candidate. AI output is never published here.
 */
export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  if (!canAccessAi(user, AI_LEVELS.CHAT)) {
    throw createError({ statusCode: 403, message: 'AI 功能未授权，请联系管理员开通' })
  }

  const body = await readBody(event)
  const prompt = String(body?.prompt || '').trim()
  await assertConversationOwner(user.id, body?.conversationId)
  const validation = validateChatInput(prompt)
  if (!validation.valid) throw createError({ statusCode: 400, message: validation.error })

  const contentType = body?.contentType || CONTENT_TYPE.BLOG
  if (![CONTENT_TYPE.BLOG, CONTENT_TYPE.PORTFOLIO].includes(contentType)) {
    throw createError({ statusCode: 400, message: 'Only blog and portfolio candidates are supported' })
  }

  const result = await getAiProvider().chat({
    userId: user.id,
    aiAccessLevel: user.aiAccessLevel,
    prompt,
    conversationId: body?.conversationId,
  })
  await archiveConversationTurn(user.id, result.conversationId, prompt, result.response)

  const candidate = await createCandidate({
    title: body?.title || 'AI 生成候选内容',
    content: result.response,
    description: body?.description,
    contentType,
    source: CANDIDATE_SOURCE.AI_CHAT,
    sourceRef: result.conversationId,
    tags: Array.isArray(body?.tags) ? body.tags : [],
    suggestedVisibility: 'private',
    riskLevel: 'medium',
  }, user.id)

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'create_ai_content_candidate',
      resourceType: 'content_candidate',
      resourceId: String(candidate.id),
      afterJson: JSON.stringify({ conversationId: result.conversationId, contentType }),
    },
  })

  return {
    success: true,
    data: { candidate, conversationId: result.conversationId, status: 'draft' },
  }
})
