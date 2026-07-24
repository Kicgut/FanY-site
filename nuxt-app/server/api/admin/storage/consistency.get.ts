import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { access } from 'node:fs/promises'

async function exists(path: string | null | undefined) {
  if (!path) return false
  try { await access(path); return true } catch { return false }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const photos = await prisma.photo.findMany({ select: { id: true, filename: true, originalPath: true, thumbPath: true, ecsThumbPath: true, thumbnailStatus: true } })
  const missingOriginals: number[] = []
  const missingThumbnails: number[] = []
  for (const photo of photos) {
    if (photo.originalPath && !(await exists(photo.originalPath))) missingOriginals.push(photo.id)
    const thumb = photo.thumbPath || photo.ecsThumbPath
    if (photo.thumbnailStatus === 'ready' && thumb && !(await exists(thumb))) missingThumbnails.push(photo.id)
  }
  return { success: true, data: { scanned: photos.length, missingOriginals, missingThumbnails, healthy: missingOriginals.length === 0 && missingThumbnails.length === 0 } }
})
