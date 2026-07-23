import { requireLogin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { saveUploadedPhoto } from '~/server/services/photo-storage'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~/server/services/photo-review'
import { presentPhoto } from '~/server/utils/photo-presentation'
import { PHOTO_STORAGE_LOCATION, PHOTO_SYNC_STATUS } from '~/server/services/photo-backflow'
import { extractPhotoMetadata } from '~/server/services/photo-metadata'
import { calculateEcsSyncPolicy } from '~/server/services/photo-sync'
import { logAudit } from '~/server/services/audit'

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
  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  if (!isAdmin && visibility === 'public') throw createError({ statusCode: 403, message: '普通用户上传后必须经过审核才能公开' })
  if (!isAdmin && visibility === 'groups' && groups.some((group) => !user.groups.includes(group))) {
    throw createError({ statusCode: 403, message: '只能选择自己所属的分组' })
  }
  const albumIds = albumIdsPart?.data ? String(albumIdsPart.data).split(',').map(Number).filter((v) => Number.isInteger(v) && v > 0) : []
  const title = String(titlePart?.data?.toString() || file.filename.replace(/\.[^.]+$/, ''))
  const chargeMb = Math.max(1, Math.ceil(file.data.length / (1024 * 1024)))
  const quota = await prisma.user.findUnique({ where: { id: user.id }, select: { usedQuotaMb: true, uploadQuotaMb: true } })
  if (!quota || quota.usedQuotaMb + chargeMb > quota.uploadQuotaMb) {
    throw createError({ statusCode: 413, message: '上传配额不足' })
  }
  const quotaReservation = await prisma.user.updateMany({
    where: { id: user.id, usedQuotaMb: quota.usedQuotaMb },
    data: { usedQuotaMb: { increment: chargeMb } },
  })
  if (quotaReservation.count !== 1) throw createError({ statusCode: 409, message: '上传配额状态已变化，请重试' })
  let quotaReserved = true
  try {
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
      uploadedBy: user.id, status: isAdmin ? 'published' : 'hidden', reviewStatus: isAdmin ? 'approved' : 'pending',
      storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY, syncStatus: PHOTO_SYNC_STATUS.PENDING,
      ecsSyncPolicy: calculateEcsSyncPolicy(visibility, isAdmin ? 'published' : 'hidden'),
      thumbnailStatus: stored.thumbPath && stored.mediumPath ? 'ready' : 'pending',
    },
  })
  if (albumIds.length) {
    const albums = await prisma.album.findMany({
      where: { id: { in: albumIds } },
      select: { id: true, visibility: true, visibleTo: true },
    })
    const allowedAlbums = isAdmin
      ? albums
      : albums.filter((album) => {
          if (album.visibility === 'public') return true
          if (album.visibility !== 'groups') return false
          let visibleTo: unknown[] = []
          try { visibleTo = album.visibleTo ? JSON.parse(album.visibleTo) : [] } catch { visibleTo = [] }
          return Array.isArray(visibleTo) && visibleTo.some((group) => user.groups.includes(String(group).replace(/^group:/, '')))
        })
    await prisma.albumPhoto.createMany({ data: allowedAlbums.map((album) => ({ albumId: album.id, photoId: photo.id })) })
  }
  await logAudit(event, 'photo_upload', 'photo', photo.id, null, { fileSize: file.data.length, chargeMb, visibility })
  quotaReserved = false
  return { success: true, data: presentPhoto(photo), message: '上传成功，等待审核和原图回流' }
  } catch (error) {
    if (quotaReserved) {
      await prisma.user.update({ where: { id: user.id }, data: { usedQuotaMb: { decrement: chargeMb } } }).catch(() => {})
    }
    throw error
  }
})
