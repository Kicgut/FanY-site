import { requireAdmin } from '~/server/utils/permission'
import { reviewCandidate } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const body = await readBody(event)
  const candidate = await reviewCandidate(id, body?.action, user.id, body?.note)
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `review_content_candidate_${body?.action || 'unknown'}`,
      resourceType: 'content_candidate',
      resourceId: String(id),
      afterJson: JSON.stringify({ note: body?.note || null }),
    },
  })
  return { success: true, data: candidate }
})
