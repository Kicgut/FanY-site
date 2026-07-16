import { requireAdmin } from '~/server/utils/permission'
import { listCandidates, createCandidate, CANDIDATE_SOURCE, CONTENT_TYPE } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const method = getMethod(event)

  if (method === 'GET') {
    const query = getQuery(event)
    const filters: { status?: string; source?: string; contentType?: string } = {}
    if (query.status) filters.status = query.status as string
    if (query.source) filters.source = query.source as string
    if (query.contentType) filters.contentType = query.contentType as string

    const candidates = await listCandidates(filters)
    return { success: true, data: candidates }
  }

  if (method === 'POST') {
    const body = await readBody(event)

    if (!body?.title || !body?.content) {
      throw createError({ statusCode: 400, message: 'title and content are required' })
    }

    const source = body.source || CANDIDATE_SOURCE.MANUAL
    if (!Object.values(CANDIDATE_SOURCE).includes(source)) {
      throw createError({
        statusCode: 400,
        message: `Invalid source. Must be one of: ${Object.values(CANDIDATE_SOURCE).join(', ')}`,
      })
    }

    const contentType = body.contentType || CONTENT_TYPE.BLOG
    if (!Object.values(CONTENT_TYPE).includes(contentType)) {
      throw createError({ statusCode: 400, message: 'Invalid contentType' })
    }

    const candidate = await createCandidate({
      title: body.title,
      content: body.content,
      description: body.description,
      slug: body.slug,
      tags: body.tags,
      contentType,
      source,
      sourceRef: body.sourceRef,
      suggestedVisibility: body.suggestedVisibility,
      riskLevel: body.riskLevel,
    }, user.id)

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'create_content_candidate',
        resourceType: 'content_candidate',
        resourceId: String(candidate.id),
        afterJson: JSON.stringify({ source, contentType }),
      },
    })

    return { success: true, data: candidate }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
