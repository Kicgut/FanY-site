import { requireAdmin } from '~/server/utils/permission'
import { publishCandidate, APPROVE_TARGET } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const body = await readBody(event)
  const target = body?.target || APPROVE_TARGET.BLOG
  const result = await publishCandidate(id, target, user.id)
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'publish_content_candidate_as_draft',
      resourceType: 'content_candidate',
      resourceId: String(id),
      afterJson: JSON.stringify(result.published),
    },
  })
  return { success: true, data: result }
})
