import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { transitionPortfolio } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const item = await transitionPortfolio(id, 'unpublish')
  await logAudit(event, 'unpublish_portfolio', 'portfolio', id, null, { status: item.status, actorId: actor.id })
  return { success: true, data: item }
})
