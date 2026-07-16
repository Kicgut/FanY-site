import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { join, normalize, resolve } from 'node:path'
import { getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

const ECS_UPLOADS_ROOT = '/app/public/uploads'
const ALLOWED_TYPES = new Set(['thumbnail', 'medium', 'original'])

function asSafeLocalPath(value: string | null | undefined) {
  if (!value || value.startsWith('/api/') || /^https?:\/\//i.test(value)) return null
  const candidate = value.startsWith('/app/')
    ? value
    : value.startsWith('/uploads/')
      ? join('/app/public', value)
      : null
  if (!candidate) return null
  const root = resolve(ECS_UPLOADS_ROOT)
  const absolute = resolve(normalize(candidate))
  return absolute === root || absolute.startsWith(`${root}/`) ? absolute : null
}

function candidates(photo: any, type: string) {
  if (type === 'thumbnail') return [photo.thumbPath, photo.ecsThumbPath, photo.thumbnailUrl]
  if (type === 'medium') return [photo.mediumUrl, photo.thumbPath, photo.ecsThumbPath, photo.thumbnailUrl]
  return [photo.originalPath, photo.originalUrl]
}

export default defineEventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  const type = String(getQuery(event).type || 'thumbnail')
  if (!Number.isInteger(id) || !ALLOWED_TYPES.has(type)) {
    throw createError({ statusCode: 400, message: '图片参数无效' })
  }

  const photo = await prisma.photo.findUnique({ where: { id } })
  if (!photo) throw createError({ statusCode: 404, message: '照片不存在' })
  const user = await getRequestUser(event)
  const allowed = user?.role === ROLES.ADMIN || getAccessOrigin(event, user) === 'local_trusted' || (
    photo.status === 'published' && photo.reviewStatus === 'approved' && (
      photo.visibility === 'public' ||
      Boolean(user && photo.visibility === 'friends' && photo.visibleTo?.includes(user.username)) ||
      Boolean(user && photo.visibility === 'private' && photo.uploadedBy === user.id)
    )
  )
  if (!allowed) throw createError({ statusCode: 404, message: '照片不存在' })

  for (const value of candidates(photo, type)) {
    const path = asSafeLocalPath(value)
    if (!path) continue
    try {
      await access(path)
      const info = await stat(path)
      setResponseHeader(event, 'Content-Type', photo.mimeType || 'image/jpeg')
      setResponseHeader(event, 'Content-Length', String(info.size))
      setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
      return sendStream(event, createReadStream(path))
    } catch { /* try the next fallback */ }
  }

  // Originals may live on Ubuntu after the ECS temporary copy is removed.
  if (type === 'original' && process.env.PHOTO_ORIGINALS_BASE_URL) {
    const target = `${process.env.PHOTO_ORIGINALS_BASE_URL.replace(/\/$/, '')}/api/photos/${id}/original`
    return sendRedirect(event, target, 307)
  }
  throw createError({ statusCode: 404, message: '图片文件暂不可用' })
})
