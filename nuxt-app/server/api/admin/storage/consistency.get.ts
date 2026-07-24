import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'

async function exists(path: string | null | undefined) {
  if (!path) return false
  try { await access(path); return true } catch { return false }
}

async function collectFiles(root: string, limit = 2000): Promise<string[]> {
  const output: string[] = []
  async function walk(current: string): Promise<void> {
    if (output.length >= limit) return
    let entries: any[]
    try { entries = await readdir(current, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (output.length >= limit) return
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) output.push(full)
    }
  }
  await walk(root)
  return output
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const photos = await prisma.photo.findMany({ select: { id: true, filename: true, originalPath: true, thumbPath: true, ecsThumbPath: true, thumbnailStatus: true } })
  const missingOriginals: number[] = []
  const missingThumbnails: number[] = []
  const referenced = new Set(photos.flatMap((photo) => [photo.originalPath, photo.thumbPath, photo.ecsThumbPath].filter(Boolean) as string[]))
  for (const photo of photos) {
    if (photo.originalPath && !(await exists(photo.originalPath))) missingOriginals.push(photo.id)
    const thumb = photo.thumbPath || photo.ecsThumbPath
    if (photo.thumbnailStatus === 'ready' && thumb && !(await exists(thumb))) missingThumbnails.push(photo.id)
  }
  const files = await collectFiles('/app/public/uploads/photos')
  const orphanFiles = files.filter((file) => !referenced.has(file)).slice(0, 200)
  return { success: true, data: { scanned: photos.length, scannedFiles: files.length, scanTruncated: files.length >= 2000, missingOriginals, missingThumbnails, orphanFiles, healthy: missingOriginals.length === 0 && missingThumbnails.length === 0 && orphanFiles.length === 0 } }
})
