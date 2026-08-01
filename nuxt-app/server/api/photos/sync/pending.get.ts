import { getQuery } from 'h3'
import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { getPendingSyncPhotos } from '~/server/services/photo-sync'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)

  const requestedLimit = Number(getQuery(event).limit ?? 50)
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50
  const photos = await getPendingSyncPhotos(limit)

  return { success: true, data: { photos } }
})
