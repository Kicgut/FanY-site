import { requireAdmin } from '~/server/utils/permission'
import { updatePortfolioMedia } from '~/server/services/portfolio'
import { logAudit } from '~/server/services/audit'
import { parsePortfolio, portfolioMediaSchema } from '~/server/services/portfolio-schema'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const mediaId = Number(getRouterParam(event, 'mediaId'))
  const media = await updatePortfolioMedia(mediaId, parsePortfolio(portfolioMediaSchema.partial(), await readBody(event)))
  await logAudit(event, 'portfolio_media_update', 'portfolio_media', media.id)
  return { success: true, data: media }
})
