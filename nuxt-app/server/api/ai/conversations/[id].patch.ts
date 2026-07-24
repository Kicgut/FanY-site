import { requireLogin, canAccessAi, AI_LEVELS } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  if (!canAccessAi(user, AI_LEVELS.CHAT)) throw createError({ statusCode: 403, message: 'AI 功能未授权' })
  const id = getRouterParam(event, 'id')
  const body = await readBody(event).catch(() => ({}))
  const action = String(body?.action || '')
  if (!['archive', 'restore'].includes(action)) throw createError({ statusCode: 400, message: 'Unsupported conversation action' })
  const updated = await prisma.aiConversation.updateMany({ where: { id, userId: user.id }, data: { archivedAt: action === 'archive' ? new Date() : null } })
  if (!updated.count) throw createError({ statusCode: 404, message: '会话不存在' })
  return { success: true, data: { id, archived: action === 'archive' } }
})
