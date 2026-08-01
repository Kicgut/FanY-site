import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const mediaId = Number(getRouterParam(event, 'mediaId'))
  const media = await prisma.portfolioMedia.findUnique({ where: { id: mediaId }, select: { id: true, portfolioId: true } })
  if (!media) throw createError({ statusCode: 404, message: 'Media not found' })
  await prisma.portfolioMedia.delete({ where: { id: mediaId } })
  await logAudit(event, 'portfolio_media_delete', 'portfolio_media', mediaId, { portfolioId: media.portfolioId }, null)
  return { success: true }
})
