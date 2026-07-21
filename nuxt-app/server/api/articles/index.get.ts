export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // 导出模式：?export=md
  const exportMode = query.export === 'md'

  const status = query.status as string | undefined
  const tag = query.tag as string | undefined
  const search = String(query.q || '').trim()

  const where: any = {}
  if (status) {
    where.status = status
  }
  if (tag) {
    where.tags = { some: { name: tag } }
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { content: { contains: search } },
    ]
  }

  try {
    // 导出模式：返回所有文章的 MD 格式
    if (exportMode) {
      const articles = await prisma.article.findMany({
        where,
        include: { tags: true },
        orderBy: { createdAt: 'desc' },
      })

      const mdArticles = articles.map((article: any) => {
        const tags = article.tags?.map((t: any) => t.name) || []
        const publishedAt = article.publishedAt || article.createdAt

        const frontmatter = [
          '---',
          `title: "${article.title.replace(/"/g, '\\"')}"`,
          `slug: "${article.slug}"`,
          article.description ? `description: "${article.description.replace(/"/g, '\\"')}"` : null,
          `tags: [${tags.join(', ')}]`,
          `status: ${article.status}`,
          `publishedAt: ${publishedAt}`,
          `createdAt: ${article.createdAt}`,
          '---',
        ]
          .filter(Boolean)
          .join('\n')

        return {
          slug: article.slug,
          title: article.title,
          status: article.status,
          tags,
          createdAt: article.createdAt,
          publishedAt: article.publishedAt,
          md: frontmatter + '\n\n' + article.content,
        }
      })

      return {
        success: true,
        count: mdArticles.length,
        data: mdArticles,
      }
    }

    // 正常模式：分页返回
    const page = Math.max(1, parseInt(query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10))
    const skip = (page - 1) * limit

    const [articles, total] = await prisma.$transaction([
      prisma.article.findMany({
        where,
        include: { tags: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ])

    return { articles, total }
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch articles' })
  }
})
