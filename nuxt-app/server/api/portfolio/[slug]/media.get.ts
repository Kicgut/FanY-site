import { getPublicPortfolioMedia } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const data = await getPublicPortfolioMedia(slug, getQuery(event))
  if (!data) throw createError({ statusCode: 404, message: 'Portfolio media not found' })
  return { success: true, data }
})
