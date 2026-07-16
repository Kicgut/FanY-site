export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const item = await prisma.portfolio.findFirst({ where: { slug, status: 'published', reviewStatus: 'approved' } })
  if (!item) throw createError({ statusCode: 404, message: '项目不存在' })
  return { success: true, data: item }
})
