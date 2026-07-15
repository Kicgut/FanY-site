import { requireAdmin } from '~/server/utils/permission'
import { listCandidates, createCandidate, CANDIDATE_SOURCE } from '~/server/services/content-pipeline'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const method = getMethod(event)

  if (method === 'GET') {
    const query = getQuery(event)
    const filters: { status?: string; source?: string } = {}
    if (query.status) filters.status = query.status as string
    if (query.source) filters.source = query.source as string

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

    const candidate = await createCandidate(
      {
        title: body.title,
        content: body.content,
        description: body.description,
        tags: body.tags,
      },
      source
    )

    return { success: true, data: candidate }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
