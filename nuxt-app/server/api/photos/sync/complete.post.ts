import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { ECS_SYNC_POLICY } from '~/server/services/photo-sync'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const body = await readBody(event)
  const photoId = Number(body?.photoId)
  const ecsThumbPath = String(body?.ecsThumbPath || '')
  if (!Number.isInteger(photoId) || !ecsThumbPath.startsWith('/app/public/uploads/photos/')) throw createError({ statusCode: 400, message: 'invalid sync completion' })
  await prisma.photo.update({ where: { id: photoId }, data: { ecsSyncPolicy: ECS_SYNC_POLICY.SYNCED, ecsThumbPath, syncedAt: new Date(), syncError: null } })
  return { success: true }
})
