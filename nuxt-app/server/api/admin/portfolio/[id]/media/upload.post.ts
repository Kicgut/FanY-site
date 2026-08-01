import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { createPortfolioMedia } from '~/server/services/portfolio'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const MAX_BYTES = 50 * 1024 * 1024

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid portfolio id' })
  const form = await readMultipartFormData(event)
  const file = form?.find((part) => part.name === 'file' || part.filename)
  if (!file?.data || !file.filename) throw createError({ statusCode: 400, message: 'file is required' })
  const mimeType = file.type || ''
  const kind = IMAGE_TYPES.has(mimeType) ? (mimeType === 'image/gif' ? 'gif' : 'image') : VIDEO_TYPES.has(mimeType) ? 'video' : null
  if (!kind) throw createError({ statusCode: 415, message: 'Unsupported portfolio media MIME type' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, message: 'Portfolio media exceeds 50MB limit' })
  const ext = (file.filename.split('.').pop() || (kind === 'video' ? 'mp4' : 'bin')).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
  const filename = `${randomUUID()}.${ext}`
  const dir = join(process.cwd(), 'public', 'uploads', 'portfolio')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), file.data)
  let width: number | null = null
  let height: number | null = null
  if (kind !== 'video') {
    try { const sharp = (await import('sharp')).default; const meta = await sharp(file.data, { failOn: 'none' }).metadata(); width = meta.width || null; height = meta.height || null } catch { /* leave as draft for manual metadata */ }
  }
  const altPart = form?.find((part) => part.name === 'alt')
  const alt = String(altPart?.data || '').trim()
  const field = (name: string) => form?.find((part) => part.name === name)?.data?.toString().trim() || ''
  const suppliedWidth = Number(field('width')) || width
  const suppliedHeight = Number(field('height')) || height
  const suppliedDuration = Number(field('duration')) || null
  const sortOrder = Number(field('sortOrder')) || 0
  const posterUrl = field('posterUrl') || null
  const derivativeStatus = kind === 'video' ? 'pending' : 'ready'
  const media = await createPortfolioMedia(id, { kind, publicUrl: `/uploads/portfolio/${filename}`, mimeType, sizeBytes: file.data.length, derivativeStatus, posterUrl, width: suppliedWidth, height: suppliedHeight, duration: suppliedDuration, sortOrder, alt, status: kind === 'video' ? 'draft' : 'ready' })
  await logAudit(event, 'portfolio_media_upload', 'portfolio_media', media.id, null, { portfolioId: id, mimeType, sizeBytes: file.data.length, kind })
  return { success: true, data: media }
})
