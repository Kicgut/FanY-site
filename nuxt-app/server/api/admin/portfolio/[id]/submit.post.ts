import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { transitionPortfolio } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const item = await transitionPortfolio(id, 'submit')
  await logAudit(event, 'submit_portfolio', 'portfolio', id, null, { reviewStatus: item.reviewStatus, actorId: actor.id })
  return { success: true, data: item }
})
