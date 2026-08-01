import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { saveAdminPromptEntry } from '~/server/services/portfolio'
import { parsePortfolio, portfolioPromptSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const portfolioId = Number(getRouterParam(event, 'id'))
  const entryId = Number(getRouterParam(event, 'entryId'))
  const entry = await saveAdminPromptEntry(portfolioId, parsePortfolio(portfolioPromptSchema, await readBody(event)), entryId)
  await logAudit(event, 'update_portfolio_prompt_entry', 'portfolio_prompt_entry', entry?.id)
  return { success: true, data: entry }
})
