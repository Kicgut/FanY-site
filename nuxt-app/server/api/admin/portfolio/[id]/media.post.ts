import { requireAdmin } from '~/server/utils/permission'
import { createPortfolioMedia } from '~/server/services/portfolio'
import { logAudit } from '~/server/services/audit'
import { parsePortfolio, portfolioMediaSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const media = await createPortfolioMedia(id, parsePortfolio(portfolioMediaSchema, await readBody(event)))
  await logAudit(event, 'portfolio_media_create', 'portfolio_media', media.id, null, { portfolioId: id })
  return { success: true, data: media }
})
