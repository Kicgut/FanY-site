import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { PHOTO_STORAGE_LOCATION, PHOTO_SYNC_STATUS } from '~/server/services/photo-backflow'

/** Manual recovery control: make failed ECS originals eligible for the Ubuntu worker again. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await prisma.photo.updateMany({
    where: { storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY, syncStatus: PHOTO_SYNC_STATUS.FAILED },
    data: { syncStatus: PHOTO_SYNC_STATUS.PENDING, syncError: null },
  })
  return { success: true, data: { resetCount: result.count, message: '任务已重新排队，Ubuntu 定时任务会自动处理' } }
})
