import { requireAdmin } from '~/server/utils/permission'
import { reviewCandidate, REVIEW_ACTION } from '~/server/services/content-pipeline'

// Compatibility endpoint: approval is intentionally separate from publishing.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const body = await readBody(event)
  const candidate = await reviewCandidate(id, REVIEW_ACTION.APPROVE, user.id, body?.note)
  return { success: true, data: candidate, message: 'Candidate approved; publish it separately as a draft.' }
})
