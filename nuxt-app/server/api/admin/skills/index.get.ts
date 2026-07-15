import { requireAdmin } from '~/server/utils/permission'
import { listSkills } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const filters: { category?: string; status?: string; author?: string; project?: string; tag?: string } = {}
  if (query.category) filters.category = query.category as string
  if (query.status) filters.status = query.status as string
  if (query.author) filters.author = query.author as string
  if (query.project) filters.project = query.project as string
  if (query.tag) filters.tag = query.tag as string

  const skills = await listSkills(filters)

  return {
    success: true,
    data: skills,
  }
})
