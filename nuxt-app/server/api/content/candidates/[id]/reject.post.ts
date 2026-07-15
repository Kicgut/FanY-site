import { requireAdmin } from '~/server/utils/permission'
import { rejectCandidate } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Candidate ID is required' })
  }

  const body = await readBody(event)
  const reason = body?.reason || 'No reason provided'

  const result = await rejectCandidate(id, reason)
  if (!result) {
    throw createError({ statusCode: 404, message: 'Candidate not found' })
  }

  // Log audit
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'reject_candidate',
        resourceType: 'content_pipeline',
        resourceId: id,
        afterJson: JSON.stringify({ reason }),
      },
    })
  } catch {}

  return { success: true, data: result }
})
