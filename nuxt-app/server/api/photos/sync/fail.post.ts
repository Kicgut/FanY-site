import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { ECS_SYNC_POLICY } from '~/server/services/photo-sync'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const body = await readBody(event)
  const photoId = Number(body?.photoId)
  if (!Number.isInteger(photoId)) throw createError({ statusCode: 400, message: 'photoId is required' })
  await prisma.photo.update({ where: { id: photoId }, data: { ecsSyncPolicy: ECS_SYNC_POLICY.FAILED, syncError: String(body?.error || 'thumbnail sync failed') } })
  return { success: true }
})
