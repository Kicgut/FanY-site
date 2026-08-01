import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { createPortfolioDraft, listAdminPortfolios } from '~/server/services/portfolio'
import { parsePortfolio, portfolioCreateSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  if (getMethod(event) === 'GET') return { success: true, data: await listAdminPortfolios(getQuery(event)) }
  if (getMethod(event) === 'POST') {
    const item = await createPortfolioDraft(parsePortfolio(portfolioCreateSchema, await readBody(event).catch(() => ({}))), actor.id)
    await logAudit(event, 'create_portfolio_draft', 'portfolio', item.id, null, { type: item.type, status: item.status })
    return { success: true, data: item }
  }
  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
