import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { PHOTO_STORAGE_LOCATION, PHOTO_SYNC_STATUS } from '~/server/services/photo-backflow'
import { prisma } from '~/server/utils/db'

/** Atomically claim one pending photo so only one backflow worker handles it. */
export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const body = await readBody(event)
  const photoId = Number(body?.photoId)
  if (!Number.isInteger(photoId)) throw createError({ statusCode: 400, message: 'photoId is required' })

  const result = await prisma.photo.updateMany({
    where: { id: photoId, storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY, syncStatus: PHOTO_SYNC_STATUS.PENDING },
    data: { syncStatus: PHOTO_SYNC_STATUS.SYNCING, syncError: null },
  })
  if (result.count === 0) return { success: true, claimed: false }
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  return { success: true, claimed: true, data: photo }
})
