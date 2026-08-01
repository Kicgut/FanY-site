import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { transitionPortfolio } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event).catch(() => ({}))
  const action = String(body.action || '')
  if (!['approve', 'reject', 'request_changes'].includes(action)) throw createError({ statusCode: 400, message: 'Invalid review action' })
  const item = await transitionPortfolio(id, action, body.note)
  await logAudit(event, `review_portfolio_${action}`, 'portfolio', id, null, { reviewStatus: item.reviewStatus, note: body.note || null, actorId: actor.id })
  return { success: true, data: item }
})
