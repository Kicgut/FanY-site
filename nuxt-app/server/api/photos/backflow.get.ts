import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { getPendingBackflowPhotos, getBackflowStats } from '~/server/services/photo-backflow'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const query = getQuery(event)
  if (query.action === 'stats') return { success: true, data: await getBackflowStats() }
  const photos = await getPendingBackflowPhotos(Math.min(100, Math.max(1, Number(query.limit) || 50)))
  return { success: true, data: { photos, count: photos.length } }
})
