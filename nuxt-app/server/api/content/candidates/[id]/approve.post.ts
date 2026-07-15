import { requireAdmin } from '~/server/utils/permission'
import { getCandidateContent, approveCandidate, APPROVE_TARGET } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Candidate ID is required' })
  }

  const body = await readBody(event)
  const target = body?.target || APPROVE_TARGET.BLOG

  if (!Object.values(APPROVE_TARGET).includes(target)) {
    throw createError({
      statusCode: 400,
      message: `Invalid target. Must be one of: ${Object.values(APPROVE_TARGET).join(', ')}`,
    })
  }

  const result = await approveCandidate(id, target)
  if (!result) {
    throw createError({ statusCode: 404, message: 'Candidate not found' })
  }

  // Create Article or Portfolio based on target
  const slug = result.meta.title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')

  if (target === APPROVE_TARGET.BLOG) {
    const article = await prisma.article.create({
      data: {
        title: result.meta.title,
        slug: slug + '-' + result.meta.id,
        content: result.content,
        description: result.meta.description || '',
        status: 'published',
        publishedAt: new Date(),
      },
    })

    // Log audit
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'approve_candidate',
          resourceType: 'content_pipeline',
          resourceId: id,
          afterJson: JSON.stringify({ target: 'blog', articleId: article.id }),
        },
      })
    } catch {}

    return {
      success: true,
      data: {
        candidate: result.meta,
        published: { type: 'article', id: article.id, slug: article.slug },
      },
    }
  }

  if (target === APPROVE_TARGET.PORTFOLIO) {
    const portfolio = await prisma.portfolio.create({
      data: {
        title: result.meta.title,
        slug: slug + '-' + result.meta.id,
        content: result.content,
        description: result.meta.description || '',
        status: 'published',
      },
    })

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'approve_candidate',
          resourceType: 'content_pipeline',
          resourceId: id,
          afterJson: JSON.stringify({ target: 'portfolio', portfolioId: portfolio.id }),
        },
      })
    } catch {}

    return {
      success: true,
      data: {
        candidate: result.meta,
        published: { type: 'portfolio', id: portfolio.id, slug: portfolio.slug },
      },
    }
  }

  throw createError({ statusCode: 400, message: 'Unknown target type' })
})
