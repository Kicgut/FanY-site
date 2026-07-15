import { requireAdmin } from '~/server/utils/permission'
import { syncSkillsToDb } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const result = await syncSkillsToDb()

  return {
    success: true,
    data: {
      synced: result.synced,
      total: result.total,
      syncedAt: new Date().toISOString(),
    },
  }
})
