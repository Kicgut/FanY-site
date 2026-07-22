import { prisma } from '~/server/utils/db'
import { logAudit } from '~/server/services/audit'

// ─── Constants ─────────────────────────────────────────────────────────────

export const PHOTO_SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const

export const PHOTO_STORAGE_LOCATION = {
  ECS_ONLY: 'ecs_only',           // 只在 ECS（刚上传，待回流）
  LOCAL_ONLY: 'local_only',       // 只在本地
  ECS_AND_LOCAL: 'ecs_and_local', // ECS 有缩略图，本地有原图
  ARCHIVED: 'archived',           // 已归档到冷存储
} as const

// ─── Photo Backflow Service ─────────────────────────────────────────────────

/**
 * 获取待回流的照片列表
 * 条件：storageLocation = 'ecs_only' 且 syncStatus = 'pending'
 */
export async function getPendingBackflowPhotos(limit: number = 50) {
  return prisma.photo.findMany({
    where: {
      syncStatus: PHOTO_SYNC_STATUS.PENDING,
      OR: [
        { storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY },
        { originalPath: { startsWith: '/app/public/uploads/photos/' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
}

/**
 * 标记照片为正在同步
 */
export async function markPhotoSyncing(photoId: number): Promise<void> {
  await prisma.photo.update({
    where: { id: photoId },
    data: {
      syncStatus: PHOTO_SYNC_STATUS.SYNCING,
    },
  })
}

/**
 * 标记照片回流完成
 * @param photoId 照片 ID
 * @param localOriginalPath 本地原图路径
 */
export async function markPhotoBackflowCompleted(
  photoId: number,
  localOriginalPath: string,
): Promise<void> {
  await prisma.photo.update({
    where: { id: photoId },
    data: {
      syncStatus: PHOTO_SYNC_STATUS.SYNCED,
      storageLocation: PHOTO_STORAGE_LOCATION.ECS_AND_LOCAL,
      originalPath: localOriginalPath,
      syncedAt: new Date(),
    },
  })
}

/**
 * 标记照片回流失败
 */
export async function markPhotoBackflowFailed(
  photoId: number,
  error: string,
): Promise<void> {
  await prisma.photo.update({
    where: { id: photoId },
    data: {
      syncStatus: PHOTO_SYNC_STATUS.FAILED,
      syncError: error,
    },
  })

  console.error(`[photo-backflow] Failed for photo ${photoId}: ${error}`)
}

/**
 * 获取照片回流状态统计
 */
export async function getBackflowStats() {
  const [pending, syncing, synced, failed] = await Promise.all([
    prisma.photo.count({
      where: {
        storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY,
        syncStatus: PHOTO_SYNC_STATUS.PENDING,
      },
    }),
    prisma.photo.count({
      where: { syncStatus: PHOTO_SYNC_STATUS.SYNCING },
    }),
    prisma.photo.count({
      where: { syncStatus: PHOTO_SYNC_STATUS.SYNCED },
    }),
    prisma.photo.count({
      where: { syncStatus: PHOTO_SYNC_STATUS.FAILED },
    }),
  ])

  return {
    pending,
    syncing,
    synced,
    failed,
    total: pending + syncing + synced + failed,
  }
}

/**
 * 重置失败的照片为待同步
 */
export async function resetFailedPhotos(): Promise<number> {
  const result = await prisma.photo.updateMany({
    where: {
      syncStatus: PHOTO_SYNC_STATUS.FAILED,
      storageLocation: PHOTO_STORAGE_LOCATION.ECS_ONLY,
    },
    data: {
      syncStatus: PHOTO_SYNC_STATUS.PENDING,
      syncError: null,
    },
  })

  return result.count
}

/**
 * 记录回流审计日志
 */
export async function logBackflowAudit(
  event: any,
  photoId: number,
  action: 'backflow_start' | 'backflow_complete' | 'backflow_failed',
  details?: Record<string, any>,
): Promise<void> {
  await logAudit(event, action, 'photo', photoId, null, details)
}
