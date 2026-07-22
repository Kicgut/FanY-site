import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { access, stat } from 'node:fs/promises'
import { join, normalize, resolve } from 'node:path'
import { canAccessVisibleTo, getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
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
  const isTrusted = getAccessOrigin(event, user) === 'local_trusted'
  const allowed = user?.role === ROLES.ADMIN || isTrusted || (
    photo.status === 'published' && photo.reviewStatus === 'approved' && (
      photo.visibility === 'public' ||
      Boolean(user && photo.visibility === 'friends' && canAccessVisibleTo(photo.visibleTo, user)) ||
      Boolean(user && photo.visibility === 'groups' && canAccessVisibleTo(photo.visibleTo, user)) ||
      Boolean(user && photo.visibility === 'private' && photo.uploadedBy === user.id)
    )
  )
  if (!allowed) throw createError({ statusCode: 404, message: '照片不存在' })
  if (type === 'original' && user?.role !== ROLES.ADMIN && !isTrusted && !photo.allowOriginalDownload) {
    throw createError({ statusCode: 403, message: '原图下载未开放' })
  }

  for (const value of candidates(photo, type)) {
    const path = asSafeLocalPath(value)
    if (!path) continue
    try {
      await access(path)
      const info = await stat(path)
      setResponseHeader(event, 'Content-Type', type === 'original' ? (photo.mimeType || 'image/jpeg') : 'image/jpeg')
      setResponseHeader(event, 'Content-Length', info.size)
      setResponseHeader(event, 'Cache-Control', type === 'original'
        ? 'private, no-store'
        : photo.visibility === 'public' && photo.status === 'published' && photo.reviewStatus === 'approved'
          ? 'public, max-age=3600'
          : 'private, max-age=300')
      return sendStream(event, createReadStream(path))
    } catch { /* try the next fallback */ }
  }

  // Originals may live on Ubuntu after the ECS temporary copy is removed.
  if (type === 'original' && process.env.PHOTO_ORIGINALS_BASE_URL) {
    const target = `${process.env.PHOTO_ORIGINALS_BASE_URL.replace(/\/$/, '')}/photo/original/${encodeURIComponent(photo.filename)}`
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      const response = await fetch(target, {
        headers: process.env.PHOTO_ORIGINALS_TOKEN
          ? { 'x-photo-internal-token': process.env.PHOTO_ORIGINALS_TOKEN }
          : undefined,
        signal: controller.signal,
        redirect: 'error',
      })
      clearTimeout(timeout)
      if (response.ok && response.body) {
        const contentType = response.headers.get('content-type') || photo.mimeType || 'image/jpeg'
        const contentLength = response.headers.get('content-length')
        setResponseHeader(event, 'Content-Type', contentType)
        if (contentLength) setResponseHeader(event, 'Content-Length', Number(contentLength))
        setResponseHeader(event, 'Cache-Control', 'private, no-store')
        return sendStream(event, Readable.fromWeb(response.body as any))
      }
    } catch {
      // Keep the public error stable; do not expose Ubuntu or FRP details.
    }
  }
  throw createError({ statusCode: 404, message: '图片文件暂不可用' })
})
