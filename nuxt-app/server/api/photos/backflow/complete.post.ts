import { unlink } from 'node:fs/promises'
import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { markPhotoBackflowCompleted } from '~/server/services/photo-backflow'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const body = await readBody(event)
  const photoId = Number(body?.photoId)
  if (!Number.isInteger(photoId) || !body?.localPath || !body?.checksum) throw createError({ statusCode: 400, message: 'photoId、localPath 和 checksum 必填' })
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo?.originalPath) throw createError({ statusCode: 404, message: '待回流原图不存在' })
  const localPath = String(body.localPath)
  if (!localPath.startsWith('/mnt/data/personal-website/photos/')) throw createError({ statusCode: 400, message: '回流路径无效' })
  if (photo.checksum && photo.checksum !== String(body.checksum)) throw createError({ statusCode: 409, message: '原图 checksum 校验失败' })

  // The caller only reaches this endpoint after verifying the local copy.
  // Marking complete and deleting the ECS temporary original happen in one flow.
  await markPhotoBackflowCompleted(photoId, localPath)
  try { await unlink(photo.originalPath) } catch (error: any) {
    await prisma.photo.update({ where: { id: photoId }, data: { syncStatus: 'failed', syncError: `ECS 原图删除失败: ${error?.message || 'unknown error'}` } })
    throw createError({ statusCode: 500, message: '原图已回流，但 ECS 临时原图删除失败' })
  }
  return { success: true, data: { photoId, deletedEcsOriginal: photo.originalPath } }
})
