import { requireLogin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { saveUploadedPhoto } from '~/server/services/photo-storage'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~/server/services/photo-review'
import { presentPhoto } from '~/server/utils/photo-presentation'
import { PHOTO_STORAGE_LOCATION, PHOTO_SYNC_STATUS } from '~/server/services/photo-backflow'
import { extractPhotoMetadata } from '~/server/services/photo-metadata'

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
  if (!['public', 'friends', 'private', 'groups'].includes(visibility)) throw createError({ statusCode: 400, message: '可见范围无效' })
  const groupsPart = form?.find((part) => part.name === 'groups')
  const albumIdsPart = form?.find((part) => part.name === 'albumIds')
  const groups = groupsPart?.data ? String(groupsPart.data).split(',').map((v) => v.trim()).filter(Boolean) : []
  const albumIds = albumIdsPart?.data ? String(albumIdsPart.data).split(',').map(Number).filter((v) => Number.isInteger(v) && v > 0) : []
  const title = String(titlePart?.data?.toString() || file.filename.replace(/\.[^.]+$/, ''))
  const metadata = await extractPhotoMetadata(file.data)
  const stored = await saveUploadedPhoto(file.data, file.type || 'image/jpeg', visibility, metadata.takenAt)
  const photo = await prisma.photo.create({
    data: {
      title, filename: stored.filename, mimeType: file.type, fileSize: file.data.length,
      originalUrl: stored.originalPath, thumbnailUrl: stored.thumbPath, mediumUrl: stored.mediumPath,
      originalPath: stored.originalPath, thumbPath: stored.thumbPath,
      width: metadata.width, height: metadata.height, orientation: metadata.orientation,
      takenAt: metadata.takenAt, location: metadata.location,
      gpsLatitude: metadata.gpsLatitude, gpsLongitude: metadata.gpsLongitude,
      cameraMake: metadata.cameraMake, cameraModel: metadata.cameraModel, lens: metadata.lens,
      iso: metadata.iso, focalLength: metadata.focalLength, keywords: metadata.keywords,
      checksum: metadata.checksum,
      visibility, visibleTo: visibility === 'groups' ? JSON.stringify(groups.map((group) => `group:${group}`)) : null,
      uploadedBy: user.id, status: user.role === 'admin' || user.role === 'superadmin' ? 'published' : 'hidden', reviewStatus: user.role === 'admin' || user.role === 'superadmin' ? 'approved' : 'pending',
      storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY, syncStatus: PHOTO_SYNC_STATUS.PENDING,
      ecsSyncPolicy: 'local_only',
      thumbnailStatus: stored.thumbPath && stored.mediumPath ? 'ready' : 'pending',
    },
  })
  if (albumIds.length) {
    const allowedAlbums = await prisma.album.findMany({ where: { id: { in: albumIds } }, select: { id: true } })
    await prisma.albumPhoto.createMany({ data: allowedAlbums.map((album) => ({ albumId: album.id, photoId: photo.id })) })
  }
  return { success: true, data: presentPhoto(photo), message: '上传成功，等待审核和原图回流' }
})
