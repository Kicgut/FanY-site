import { requireLogin, canAccessAi, AI_LEVELS } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  if (!canAccessAi(user, AI_LEVELS.CHAT)) throw createError({ statusCode: 403, message: 'AI 功能未授权' })
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit || 30), 1), 100)
  const includeArchived = query.archived === 'true'
  const rows = await prisma.aiConversation.findMany({
    where: { userId: user.id, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, title: true, archivedAt: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
  })
  return { success: true, data: { conversations: rows } }
})
