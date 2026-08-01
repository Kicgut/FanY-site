import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { getAdminPortfolio, listAdminPromptEntries, saveAdminPromptEntry } from '~/server/services/portfolio'
import { parsePortfolio, portfolioPromptSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const portfolioId = Number(getRouterParam(event, 'id'))
  if (getMethod(event) === 'GET') return { success: true, data: await listAdminPromptEntries(portfolioId) }
  const portfolio = await getAdminPortfolio(portfolioId)
  if (!portfolio) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  const entry = await saveAdminPromptEntry(portfolioId, parsePortfolio(portfolioPromptSchema, await readBody(event)))
  await logAudit(event, 'create_portfolio_prompt_entry', 'portfolio_prompt_entry', entry?.id, null, { portfolioId, actorId: actor.id })
  return { success: true, data: entry }
})
