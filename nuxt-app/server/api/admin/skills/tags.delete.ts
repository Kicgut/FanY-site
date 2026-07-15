import { requireAdmin } from '~/server/utils/permission'
import { removeSkillTag } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { skillName, tag } = body

  if (!skillName || !tag) {
    throw createError({ statusCode: 400, message: 'skillName and tag are required' })
  }

  await removeSkillTag(skillName, tag)
  return { success: true }
})
