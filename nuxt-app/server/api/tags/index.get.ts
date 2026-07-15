export default defineEventHandler(async (event) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { articles: true } },
      },
      orderBy: { name: 'asc' },
    })

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      articleCount: tag._count.articles,
    }))
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch tags' })
  }
})
