import { requireAdmin } from '~/server/utils/permission'
import { updateCandidate } from '~/server/services/content-pipeline'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const body = await readBody(event)
  const candidate = await updateCandidate(id, body, user.id)
  return { success: true, data: candidate }
})
