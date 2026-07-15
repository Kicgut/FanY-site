import { requireLogin, canAccessAi, AI_LEVELS } from '~/server/utils/permission'

/**
 * GET /api/ai/status
 * Returns current AI configuration (no secrets exposed)
 */
export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)

  if (!canAccessAi(user, AI_LEVELS.CHAT)) {
    throw createError({ statusCode: 403, message: 'AI 功能未授权' })
  }

  const provider = process.env.AI_PROVIDER || 'mock'
  const model = process.env.AI_MODEL || getDefaultModel(provider)
  const hasApiKey = !!process.env.AI_API_KEY

  return {
    success: true,
    data: {
      provider,
      model,
      configured: hasApiKey,
      status: provider === 'mock' ? 'mock' : (hasApiKey ? 'active' : 'unconfigured'),
    },
  }
})

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-4o-mini'
    case 'deepseek': return 'deepseek-chat'
    default: return 'mock'
  }
}
