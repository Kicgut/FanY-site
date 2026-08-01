import { requireAdmin } from '~/server/utils/permission'
import { getAdminPortfolio } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Invalid portfolio id' })
  const item = await getAdminPortfolio(id)
  if (!item) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  return { success: true, data: item }
})
