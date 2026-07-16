import { requirePhotoBackflowAccess } from '~/server/utils/photo-backflow-auth'
import { markPhotoBackflowFailed } from '~/server/services/photo-backflow'

export default defineEventHandler(async (event) => {
  await requirePhotoBackflowAccess(event)
  const body = await readBody(event)
  const photoId = Number(body?.photoId)
  if (!Number.isInteger(photoId)) throw createError({ statusCode: 400, message: 'photoId 必填' })
  await markPhotoBackflowFailed(photoId, String(body?.error || '回流失败'))
  return { success: true }
})
