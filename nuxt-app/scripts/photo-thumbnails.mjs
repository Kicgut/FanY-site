import { createHash } from 'node:crypto'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'

const prisma = new PrismaClient()
const args = new Set(process.argv.slice(2))
const limitArg = process.argv.find((value) => value.startsWith('--limit='))
const limit = Math.min(1000, Math.max(1, Number(limitArg?.split('=')[1] || 50)))
const dryRun = args.has('--dry-run')
const retryFailed = args.has('--retry-failed')
const rootAllowlist = (process.env.PHOTO_STORAGE_ROOTS || '/app/public/uploads/photos,/mnt/data/personal-website').split(',').map((value) => value.trim()).filter(Boolean)

function safePath(value) {
  if (!value || !isAbsolute(value)) throw new Error('photo path must be absolute')
  const normalized = value.replaceAll('\\', '/')
  if (!rootAllowlist.some((root) => normalized === root || normalized.startsWith(`${root.replaceAll('\\', '/')}/`))) {
    throw new Error(`photo path is outside configured roots: ${value}`)
  }
  return value
}

function variantPath(originalPath, variant) {
  const suffix = variant === 'thumb' ? '_thumb.jpg' : '_medium.jpg'
  const base = originalPath.replace(/\.[^.]+$/, '').replace(/_original$/, '')
  return `${base}${suffix}`.replace('/ecs-originals/', '/thumbnails/').replace('\\ecs-originals\\', '\\thumbnails\\')
}

async function processPhoto(photo) {
  const originalPath = safePath(photo.originalPath)
  const source = await stat(originalPath)
  if (!source.isFile()) throw new Error('original path is not a file')
  const thumbCandidate = photo.thumbPath && isAbsolute(photo.thumbPath) ? photo.thumbPath : variantPath(originalPath, 'thumb')
  const mediumCandidate = photo.mediumUrl && isAbsolute(photo.mediumUrl) ? photo.mediumUrl : variantPath(originalPath, 'medium')
  const thumbPath = safePath(thumbCandidate)
  const mediumPath = safePath(mediumCandidate)
  if (dryRun) return { id: photo.id, thumbPath, mediumPath, bytes: source.size, dryRun: true }

  await mkdir(dirname(thumbPath), { recursive: true })
  await mkdir(dirname(mediumPath), { recursive: true })
  await sharp(originalPath).rotate().resize(400, undefined, { withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbPath)
  await sharp(originalPath).rotate().resize(1200, undefined, { withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(mediumPath)

  const checksum = photo.checksum || createHash('sha256').update(await (await import('node:fs/promises')).readFile(originalPath)).digest('hex')
  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      thumbnailUrl: thumbPath,
      mediumUrl: mediumPath,
      thumbPath,
      thumbnailStatus: 'ready',
      thumbnailError: null,
      thumbnailProcessedAt: new Date(),
      checksum,
    },
  })
  return { id: photo.id, thumbPath, mediumPath, bytes: source.size }
}

async function main() {
  const where = {
    originalPath: { not: null },
    OR: [
      { thumbnailStatus: 'pending' },
      ...(retryFailed ? [{ thumbnailStatus: 'failed' }] : []),
      { thumbPath: null },
      { mediumUrl: null },
    ],
  }
  const photos = await prisma.photo.findMany({ where, orderBy: { createdAt: 'asc' }, take: limit })
  const results = []
  for (const photo of photos) {
    if (!dryRun) {
      await prisma.photo.update({ where: { id: photo.id }, data: { thumbnailStatus: 'processing', thumbnailAttempts: { increment: 1 }, thumbnailError: null } })
    }
    try {
      results.push({ ...(await processPhoto(photo)), status: 'ready' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!dryRun) await prisma.photo.update({ where: { id: photo.id }, data: { thumbnailStatus: 'failed', thumbnailError: message } })
      results.push({ id: photo.id, status: 'failed', error: message })
    }
  }
  console.log(JSON.stringify({ dryRun, scanned: photos.length, ready: results.filter((item) => item.status === 'ready').length, failed: results.filter((item) => item.status === 'failed').length, results }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
