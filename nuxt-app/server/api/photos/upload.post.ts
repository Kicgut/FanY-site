import { requireLogin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { saveUploadedPhoto } from '~/server/services/photo-storage'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~/server/services/photo-review'
import { presentPhoto } from '~/server/utils/photo-presentation'
import { PHOTO_STORAGE_LOCATION, PHOTO_SYNC_STATUS } from '~/server/services/photo-backflow'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  const form = await readMultipartFormData(event)
  const file = form?.find((part) => part.name === 'file' || part.filename)
  if (!file?.data || !file.filename) throw createError({ statusCode: 400, message: '请选择图片文件' })
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) throw createError({ statusCode: 400, message: '仅支持 JPG、PNG、GIF 和 WebP' })
  if (file.data.length > MAX_FILE_SIZE) throw createError({ statusCode: 400, message: '图片不能超过 10MB' })

  const titlePart = form?.find((part) => part.name === 'title')
  const visibilityPart = form?.find((part) => part.name === 'visibility')
  const visibility = String(visibilityPart?.data?.toString() || 'private')
  if (!['public', 'friends', 'private'].includes(visibility)) throw createError({ statusCode: 400, message: '可见范围无效' })
  const title = String(titlePart?.data?.toString() || file.filename.replace(/\.[^.]+$/, ''))
  const stored = await saveUploadedPhoto(file.data, file.type || 'image/jpeg', visibility)
  const photo = await prisma.photo.create({
    data: {
      title, filename: stored.filename, mimeType: file.type, fileSize: file.data.length,
      originalUrl: stored.originalPath, thumbnailUrl: stored.thumbPath, mediumUrl: stored.mediumPath,
      originalPath: stored.originalPath, thumbPath: stored.thumbPath,
      visibility, uploadedBy: user.id, status: 'hidden', reviewStatus: 'pending',
      storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY, syncStatus: PHOTO_SYNC_STATUS.PENDING,
      ecsSyncPolicy: 'local_only',
    },
  })
  return { success: true, data: presentPhoto(photo), message: '上传成功，等待审核和原图回流' }
})
