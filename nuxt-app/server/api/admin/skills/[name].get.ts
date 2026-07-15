import { requireAdmin } from '~/server/utils/permission'
import { getSkillDetails } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, message: 'Skill name is required' })
  }

  const result = await getSkillDetails(name)
  if (!result) {
    throw createError({ statusCode: 404, message: 'Skill not found' })
  }

  return {
    success: true,
    data: result,
  }
})
