import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { saveAdminBlock } from '~/server/services/portfolio'
import { parsePortfolio, portfolioBlockSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const block = await saveAdminBlock(Number(getRouterParam(event, 'id')), parsePortfolio(portfolioBlockSchema, await readBody(event)), Number(getRouterParam(event, 'blockId')))
  await logAudit(event, 'update_portfolio_block', 'portfolio_block', block.id)
  return { success: true, data: block }
})
