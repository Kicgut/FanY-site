import { unlink } from 'node:fs/promises'
import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { markPhotoBackflowCompleted } from '~/server/services/photo-backflow'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const body = await readBody(event)
  const photoId = Number(body?.photoId)
  if (!Number.isInteger(photoId) || !body?.localPath) throw createError({ statusCode: 400, message: 'photoId 和 localPath 必填' })
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo?.originalPath) throw createError({ statusCode: 404, message: '待回流原图不存在' })

  // The caller only reaches this endpoint after verifying the local copy.
  // Marking complete and deleting the ECS temporary original happen in one flow.
  await markPhotoBackflowCompleted(photoId, String(body.localPath))
  try { await unlink(photo.originalPath) } catch (error: any) {
    await prisma.photo.update({ where: { id: photoId }, data: { syncStatus: 'failed', syncError: `ECS 原图删除失败: ${error?.message || 'unknown error'}` } })
    throw createError({ statusCode: 500, message: '原图已回流，但 ECS 临时原图删除失败' })
  }
  return { success: true, data: { photoId, deletedEcsOriginal: photo.originalPath } }
})
