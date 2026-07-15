import { requireAdmin } from '~/server/utils/permission'
import { getAuditLogStats } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const stats = await getAuditLogStats()

  return {
    success: true,
    data: stats,
  }
})
