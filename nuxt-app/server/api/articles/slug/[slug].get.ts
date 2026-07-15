import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug is required' })
  }

  try {
    const article = await prisma.article.findFirst({
      where: {
        slug,
        status: 'published',
      },
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
