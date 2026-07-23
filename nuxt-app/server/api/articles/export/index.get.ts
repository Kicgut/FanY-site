import { prisma } from '~/server/utils/db'
import { requireAdmin } from '~/server/utils/permission'

/**
 * 批量导出文章为 MD 格式
 * 
 * GET /api/articles/export-md
 * GET /api/articles/export-md?status=published
 * GET /api/articles/export-md?tag=vue
 * 
 * 返回：所有文章的 MD 格式内容（JSON 数组）
 */

function generateFrontmatter(article: any): string {
  const tags = article.tags?.map((t: any) => t.name) || []
  const publishedAt = article.publishedAt || article.createdAt

  const lines = [
    '---',
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `slug: "${article.slug}"`,
  ]

  if (article.description) {
    lines.push(`description: "${article.description.replace(/"/g, '\\"')}"`)
  }

  if (tags.length > 0) {
    lines.push(`tags: [${tags.join(', ')}]`)
  }

  lines.push(`status: ${article.status}`)
  lines.push(`publishedAt: ${publishedAt}`)
  lines.push(`createdAt: ${article.createdAt}`)
  lines.push('---')

  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  // 构建查询条件
  const where: any = {}
  if (query.status) {
    where.status = query.status as string
  }
  if (query.tag) {
    where.tags = {
      some: {
        name: query.tag as string,
      },
    }
  }

  try {
    // 查询所有符合条件的文章
    const articles = await prisma.article.findMany({
      where,
      include: {
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 转换为 MD 格式
    const mdArticles = articles.map((article) => {
      const frontmatter = generateFrontmatter(article)
      const mdContent = frontmatter + '\n\n' + article.content

      return {
        slug: article.slug,
        title: article.title,
        status: article.status,
        tags: article.tags?.map((t: any) => t.name) || [],
        createdAt: article.createdAt,
        publishedAt: article.publishedAt,
        md: mdContent,
      }
    })

    return {
      success: true,
      count: mdArticles.length,
      data: mdArticles,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: 'Failed to export articles: ' + error.message,
    })
  }
})
