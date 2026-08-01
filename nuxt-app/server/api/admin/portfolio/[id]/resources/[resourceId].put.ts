import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { saveAdminResource } from '~/server/services/portfolio'
import { parsePortfolio, portfolioResourceSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const resource = await saveAdminResource(Number(getRouterParam(event, 'id')), parsePortfolio(portfolioResourceSchema, await readBody(event)), Number(getRouterParam(event, 'resourceId')))
  await logAudit(event, 'update_portfolio_resource', 'portfolio_resource', resource.id)
  return { success: true, data: resource }
})
