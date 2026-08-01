import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { saveAdminResource } from '~/server/services/portfolio'
import { parsePortfolio, portfolioResourceSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const portfolioId = Number(getRouterParam(event, 'id'))
  const resource = await saveAdminResource(portfolioId, parsePortfolio(portfolioResourceSchema, await readBody(event)))
  await logAudit(event, 'create_portfolio_resource', 'portfolio_resource', resource.id)
  return { success: true, data: resource }
})
