/**
 * 公开 Skill 详情 API — 无需认证
 */
import { getSkillDetails } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, message: 'Missing skill name' })
  }

  const result = await getSkillDetails(name)
  if (!result) {
    throw createError({ statusCode: 404, message: 'Skill not found' })
  }

  return { success: true, data: result }
})
