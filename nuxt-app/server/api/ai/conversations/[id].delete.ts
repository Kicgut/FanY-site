import { requireLogin, canAccessAi, AI_LEVELS } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  if (!canAccessAi(user, AI_LEVELS.CHAT)) throw createError({ statusCode: 403, message: 'AI 功能未授权' })
  const id = getRouterParam(event, 'id')
  const result = await prisma.aiConversation.deleteMany({ where: { id, userId: user.id } })
  if (!result.count) throw createError({ statusCode: 404, message: '会话不存在' })
  return { success: true, data: { deleted: true, id } }
})
