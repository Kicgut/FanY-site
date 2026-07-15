import { randomUUID } from 'crypto'
import { join } from 'path'
import { mkdir, copyFile } from 'fs/promises'
import { prisma } from '~/server/utils/db'
import { VISIBILITY } from '~/server/services/photo-sync'

// ─── Constants ─────────────────────────────────────────────────────────────

// ECS 容器内的路径（通过 volume 映射到宿主机）
const ECS_PHOTOS_ROOT = '/app/public/uploads/photos'
const ECS_ORIGINALS_DIR = join(ECS_PHOTOS_ROOT, 'ecs-originals')
const ECS_THUMBNAILS_DIR = join(ECS_PHOTOS_ROOT, 'thumbnails')

// 本地服务器路径
const LOCAL_PHOTOS_ROOT = '/mnt/data/personal-website/photos'
const LOCAL_THUMBNAILS_ROOT = '/mnt/data/personal-website/thumbnails'

// ─── Sharp lazy import ──────────────────────────────────────────────────────

let sharpModule: typeof import('sharp') | null = null
let sharpAvailable: boolean | null = null

async function getSharp() {
  if (sharpAvailable === false) return null
  if (sharpModule) return sharpModule
  try {
    sharpModule = (await import('sharp')).default
    sharpAvailable = true
    return sharpModule
  } catch {
    sharpAvailable = false
    console.warn('[photo-storage] sharp not available, falling back to copy for thumbnails')
    return null
  }
}

// ─── Path resolution ───────────────────────────────────────────────────────

/**
 * 生成年月目录
 */
function getYearMonth(date?: Date | null): string {
  const d = date || new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 生成唯一的文件名
 */
function generateFilename(ext: string = 'jpg'): string {
  return `${randomUUID()}.${ext}`
}

/**
 * 获取 ECS 原图路径（临时存储，待回流）
 */
function getEcsOriginalPath(yearMonth: string, filename: string): string {
  return join(ECS_ORIGINALS_DIR, yearMonth, filename)
}

/**
 * 获取 ECS 缩略图路径
 */
function getEcsThumbPath(yearMonth: string, filename: string): string {
  return join(ECS_THUMBNAILS_DIR, yearMonth, filename)
}

/**
 * 获取本地原图路径
 */
function getLocalOriginalPath(visibility: string, yearMonth: string, filename: string): string {
  return join(LOCAL_PHOTOS_ROOT, visibility, yearMonth, filename)
}

/**
 * 获取本地缩略图路径
 */
function getLocalThumbPath(visibility: string, yearMonth: string, filename: string): string {
  return join(LOCAL_THUMBNAILS_ROOT, visibility, yearMonth, filename)
}

// ─── Storage operations ────────────────────────────────────────────────────

/**
 * 保存远程上传的照片到 ECS
 * 返回：原图路径、缩略图路径
 */
export async function saveUploadedPhoto(
  fileData: Buffer,
  mimeType: string,
  visibility: string,
  takenAt?: Date | null,
): Promise<{
  originalPath: string
  thumbPath: string
  mediumPath: string
  filename: string
  yearMonth: string
}> {
  const ext = mimeType.split('/')[1] || 'jpg'
  const filename = `${randomUUID()}_original.${ext}`
  const thumbFilename = `${randomUUID()}_thumb.jpg`
  const mediumFilename = `${randomUUID()}_medium.jpg`
  const yearMonth = getYearMonth(takenAt)

  // 保存原图到 ECS 临时目录
  const originalDir = join(ECS_ORIGINALS_DIR, yearMonth)
  await mkdir(originalDir, { recursive: true })
  const originalPath = join(originalDir, filename)
  await import('fs/promises').then(fs => fs.writeFile(originalPath, fileData))

  // 生成缩略图到 ECS 缩略图目录
  const thumbDir = join(ECS_THUMBNAILS_DIR, yearMonth)
  await mkdir(thumbDir, { recursive: true })
  const thumbPath = join(thumbDir, thumbFilename)
  const mediumPath = join(thumbDir, mediumFilename)

  const sharp = await getSharp()
  if (sharp) {
    try {
      await sharp(originalPath)
        .resize(400, undefined, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath)

      await sharp(originalPath)
        .resize(1200, undefined, { withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(mediumPath)
    } catch (err) {
      console.warn('[photo-storage] sharp processing failed, copying original:', err)
      await copyFile(originalPath, thumbPath)
      await copyFile(originalPath, mediumPath)
    }
  } else {
    await copyFile(originalPath, thumbPath)
    await copyFile(originalPath, mediumPath)
  }

  return { originalPath, thumbPath, mediumPath, filename, yearMonth }
}
