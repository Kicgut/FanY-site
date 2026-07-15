import { requireAdmin } from '~/server/utils/permission'
import { getAllTags, PRESET_TAGS } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const existingTags = await getAllTags()

  return {
    success: true,
    data: {
      presetTags: PRESET_TAGS,
      existingTags,
    },
  }
})
