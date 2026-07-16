import { requireAdmin } from '~/server/utils/permission'
import { unpublishCandidate } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const candidate = await unpublishCandidate(id, user.id)
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'unpublish_content_candidate', resourceType: 'content_candidate', resourceId: String(id) },
  })
  return { success: true, data: candidate }
})
