import { getPublicPortfolio } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const item = await getPublicPortfolio(slug)
  if (!item) throw createError({ statusCode: 404, message: '项目不存在' })
  return { success: true, data: item }
})
