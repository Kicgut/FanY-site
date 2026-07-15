import { requireAdmin } from '~/server/utils/permission'
import { getAuditLogs, getAuditLogStats } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)

  const filters: any = {}
  if (query.action) filters.action = String(query.action)
  if (query.resourceType) filters.resourceType = String(query.resourceType)
  if (query.userId) filters.userId = Number(query.userId)
  if (query.startDate) filters.startDate = String(query.startDate)
  if (query.endDate) filters.endDate = String(query.endDate)
  if (query.page) filters.page = Number(query.page)
  if (query.limit) filters.limit = Number(query.limit)

  const result = await getAuditLogs(filters)

  return {
    success: true,
    data: result,
  }
})
