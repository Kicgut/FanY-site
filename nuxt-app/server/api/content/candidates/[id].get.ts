import { requireAdmin } from '~/server/utils/permission'
import { getCandidate } from '~/server/services/content-pipeline'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const candidate = await getCandidate(id)
  if (!candidate) throw createError({ statusCode: 404, message: 'Candidate not found' })
  return { success: true, data: candidate }
})
