import { requireAdmin } from '~/server/utils/permission'
import { getAdminPortfolio, safeExternalUrl } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const item: any = await getAdminPortfolio(id)
  if (!item) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  const cover = item.media?.find((asset: any) => asset.kind === 'cover') || item.media?.[0] || null
  return { success: true, data: { id: item.id, title: item.title, slug: item.slug, type: item.type, description: item.description, cover, status: item.status, reviewStatus: item.reviewStatus, media: item.media, resources: item.resources, blocks: item.blocks, promptEntries: item.promptEntries } }
})
