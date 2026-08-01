import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { getAdminPortfolio, savePortfolioDraft } from '~/server/services/portfolio'
import { parsePortfolio, portfolioDraftSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Invalid portfolio id' })
  const before: any = await getAdminPortfolio(id)
  if (!before) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  const item = await savePortfolioDraft(id, parsePortfolio(portfolioDraftSchema, await readBody(event).catch(() => ({}))))
  await logAudit(event, 'update_portfolio_draft', 'portfolio', id, { version: before.version }, { version: item.version, type: item.type })
  return { success: true, data: item }
})
