import { requireAdmin } from '~/server/utils/permission'
import { addSkillTag } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { skillName, tag, tagType = 'custom' } = body

  if (!skillName || !tag) {
    throw createError({ statusCode: 400, message: 'skillName and tag are required' })
  }

  try {
    const result = await addSkillTag(skillName, tag, tagType)
    return { success: true, data: result }
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Tag already exists on this skill' })
    }
    throw err
  }
})
