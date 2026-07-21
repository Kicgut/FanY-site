import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { ECS_SYNC_POLICY, PHOTO_STATUS, VISIBILITY } from '~/server/services/photo-sync'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const photoId = Number((await readBody(event))?.photoId)
  if (!Number.isInteger(photoId)) throw createError({ statusCode: 400, message: 'photoId is required' })
  const result = await prisma.photo.updateMany({
    where: { id: photoId, ecsSyncPolicy: ECS_SYNC_POLICY.PENDING, visibility: { in: [VISIBILITY.PUBLIC, VISIBILITY.FRIENDS] }, status: PHOTO_STATUS.PUBLISHED },
    data: { ecsSyncPolicy: ECS_SYNC_POLICY.SYNCING, syncError: null },
  })
  return { success: true, claimed: result.count === 1 }
})
