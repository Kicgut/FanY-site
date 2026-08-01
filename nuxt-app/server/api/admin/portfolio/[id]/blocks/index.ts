import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { listAdminBlocks, saveAdminBlock } from '~/server/services/portfolio'
import { parsePortfolio, portfolioBlockSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const portfolioId = Number(getRouterParam(event, 'id'))
  if (getMethod(event) === 'GET') return { success: true, data: await listAdminBlocks(portfolioId) }
  const block = await saveAdminBlock(portfolioId, parsePortfolio(portfolioBlockSchema, await readBody(event)))
  await logAudit(event, 'create_portfolio_block', 'portfolio_block', block.id)
  return { success: true, data: block }
})
