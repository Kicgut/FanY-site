import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { ECS_SYNC_POLICY, PHOTO_STATUS, VISIBILITY } from '~/server/services/photo-sync'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const query = getQuery(event)
  const where = { ecsSyncPolicy: ECS_SYNC_POLICY.PENDING, visibility: { in: [VISIBILITY.PUBLIC, VISIBILITY.FRIENDS] }, status: PHOTO_STATUS.PUBLISHED }
  if (query.action === 'stats') {
    const [pending, syncing, synced, failed, localOnly] = await Promise.all([
      prisma.photo.count({ where: { ecsSyncPolicy: ECS_SYNC_POLICY.PENDING } }),
      prisma.photo.count({ where: { ecsSyncPolicy: ECS_SYNC_POLICY.SYNCING } }),
      prisma.photo.count({ where: { ecsSyncPolicy: ECS_SYNC_POLICY.SYNCED } }),
      prisma.photo.count({ where: { ecsSyncPolicy: ECS_SYNC_POLICY.FAILED } }),
      prisma.photo.count({ where: { ecsSyncPolicy: ECS_SYNC_POLICY.LOCAL_ONLY } }),
    ])
    return { success: true, data: { pending, syncing, synced, failed, localOnly, total: pending + syncing + synced + failed + localOnly } }
  }
  const photos = await prisma.photo.findMany({ where, orderBy: { createdAt: 'asc' }, take: Math.min(100, Math.max(1, Number(query.limit) || 20)) })
  return { success: true, data: { photos, count: photos.length } }
})
