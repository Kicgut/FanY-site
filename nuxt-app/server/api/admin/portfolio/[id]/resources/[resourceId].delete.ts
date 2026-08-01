import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const resourceId = Number(getRouterParam(event, 'resourceId'))
  await prisma.portfolioResource.delete({ where: { id: resourceId } })
  await logAudit(event, 'delete_portfolio_resource', 'portfolio_resource', resourceId)
  return { success: true }
})
