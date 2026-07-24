import { createHash } from 'node:crypto'
import { readFile, mkdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'
import sharp from 'sharp'
import { prisma } from '~/server/utils/db'

const roots = (process.env.PHOTO_STORAGE_ROOTS || '/app/public/uploads/photos,/mnt/data/personal-website').split(',').map((value) => value.trim()).filter(Boolean)

function safePath(value: string) {
  const normalized = value.replaceAll('\\', '/')
  if (!isAbsolute(value) || !roots.some((root) => normalized === root || normalized.startsWith(`${root.replaceAll('\\', '/')}/`))) throw new Error('photo path is outside configured storage roots')
  return value
}

function variantPath(original: string, variant: 'thumb' | 'medium') {
  const suffix = variant === 'thumb' ? '_thumb.jpg' : '_medium.jpg'
  return `${original.replace(/\.[^.]+$/, '').replace(/_original$/, '')}${suffix}`.replace('/ecs-originals/', '/thumbnails/')
}

export async function runThumbnailRebuild(jobId: number, actorId: number, limit = 20, retryFailed = false) {
  const take = Math.min(Math.max(limit, 1), 100)
  const photos = await prisma.photo.findMany({ where: { originalPath: { not: null }, OR: [{ thumbnailStatus: 'pending' }, ...(retryFailed ? [{ thumbnailStatus: 'failed' }] : []), { thumbPath: null }, { mediumUrl: null }] }, orderBy: { createdAt: 'asc' }, take })
  const results: Array<{ id: number; status: string; error?: string }> = []
  for (const photo of photos) {
    const current = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } })
    if (current?.status === 'cancelled') break
    await prisma.photo.update({ where: { id: photo.id }, data: { thumbnailStatus: 'processing', thumbnailAttempts: { increment: 1 }, thumbnailError: null } })
    try {
      const original = safePath(photo.originalPath as string)
      const source = await stat(original)
      if (!source.isFile()) throw new Error('original path is not a file')
      const thumbPath = safePath(photo.thumbPath && isAbsolute(photo.thumbPath) ? photo.thumbPath : variantPath(original, 'thumb'))
      const mediumPath = safePath(photo.mediumUrl && isAbsolute(photo.mediumUrl) ? photo.mediumUrl : variantPath(original, 'medium'))
      await mkdir(dirname(thumbPath), { recursive: true }); await mkdir(dirname(mediumPath), { recursive: true })
      await sharp(original).rotate().resize(400, undefined, { withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbPath)
      await sharp(original).rotate().resize(1200, undefined, { withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(mediumPath)
      const checksum = photo.checksum || createHash('sha256').update(await readFile(original)).digest('hex')
      await prisma.photo.update({ where: { id: photo.id }, data: { thumbnailUrl: thumbPath, mediumUrl: mediumPath, thumbPath, thumbnailStatus: 'ready', thumbnailError: null, thumbnailProcessedAt: new Date(), checksum } })
      results.push({ id: photo.id, status: 'ready' })
    } catch (error: any) {
      const message = error?.message || String(error)
      await prisma.photo.update({ where: { id: photo.id }, data: { thumbnailStatus: 'failed', thumbnailError: message } })
      results.push({ id: photo.id, status: 'failed', error: message })
    }
  }
  const cancelled = (await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } }))?.status === 'cancelled'
  const summary = { scanned: photos.length, ready: results.filter((item) => item.status === 'ready').length, failed: results.filter((item) => item.status === 'failed').length, cancelled, results }
  return prisma.job.update({ where: { id: jobId }, data: { status: cancelled ? 'cancelled' : summary.failed ? 'completed_with_errors' : 'completed', result: JSON.stringify(summary), finishedAt: new Date() } })
}
