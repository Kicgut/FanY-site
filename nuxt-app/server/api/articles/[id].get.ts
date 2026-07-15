export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid article ID' })
  }

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    })

    if (!article) {
      throw createError({ statusCode: 404, message: 'Article not found' })
    }

    return article
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Failed to fetch article' })
  }
})
