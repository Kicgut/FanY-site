import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { PHOTO_STORAGE_LOCATION, PHOTO_SYNC_STATUS } from '~/server/services/photo-backflow'

/** Manual recovery control: make failed ECS originals eligible for the Ubuntu worker again. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const candidates = await prisma.photo.findMany({ where: { syncStatus: { in: [PHOTO_SYNC_STATUS.FAILED, PHOTO_SYNC_STATUS.PENDING] }, originalPath: { not: null } }, select: { id: true, originalPath: true } })
  const ids = candidates.filter((photo) => photo.originalPath?.startsWith('/app/public/uploads/photos/')).map((photo) => photo.id)
  const result = ids.length ? await prisma.photo.updateMany({ where: { id: { in: ids } }, data: { storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY, syncStatus: PHOTO_SYNC_STATUS.PENDING, syncError: null } }) : { count: 0 }
  return { success: true, data: { resetCount: result.count, message: `${result.count} 个原图回流任务已重新排队；Ubuntu 每 5 分钟自动执行，也可在 Ubuntu 手动启动 photo-backflow.service` } }
})
