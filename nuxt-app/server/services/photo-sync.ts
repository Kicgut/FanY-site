import { prisma } from '~/server/utils/db'
import type { Prisma } from '@prisma/client'

// ─── Constants ─────────────────────────────────────────────────────────────

// 可见性：谁能看？
export const VISIBILITY = {
  PUBLIC: 'public',     // 所有人可见
  FRIENDS: 'friends',   // 朋友可见
  PRIVATE: 'private',   // 仅自己可见
} as const

// 展示状态：是否对外展示？
export const PHOTO_STATUS = {
  PUBLISHED: 'published',  // 展示中
  HIDDEN: 'hidden',        // 已下架
  ARCHIVED: 'archived',    // 已归档
} as const

// ECS 同步策略：缩略图在哪里？
export const ECS_SYNC_POLICY = {
  SYNCED: 'synced',        // ECS 有缩略图
  LOCAL_ONLY: 'local_only', // 只在本地
  PENDING: 'pending',       // 待同步
  SYNCING: 'syncing',       // 正在同步
  FAILED: 'failed',         // 同步失败
} as const

// ─── Sync Policy Logic ─────────────────────────────────────────────────────

/**
 * 根据 visibility 和 status 计算应该的 ecsSyncPolicy
 */
export function calculateEcsSyncPolicy(visibility: string, status: string): string {
  // 私有照片永远不同步
  if (visibility === VISIBILITY.PRIVATE) {
    return ECS_SYNC_POLICY.LOCAL_ONLY
  }

  // 下架或归档的照片不同步
  if (status === PHOTO_STATUS.HIDDEN || status === PHOTO_STATUS.ARCHIVED) {
    return ECS_SYNC_POLICY.LOCAL_ONLY
  }

  // 公开或朋友可见 + 已发布 → 需要同步
  if (
    (visibility === VISIBILITY.PUBLIC || visibility === VISIBILITY.FRIENDS) &&
    status === PHOTO_STATUS.PUBLISHED
  ) {
    return ECS_SYNC_POLICY.PENDING
  }

  return ECS_SYNC_POLICY.LOCAL_ONLY
}

/** Update photo state and derive the thumbnail sync policy atomically. */
export async function updatePhotoState(photoId: number, data: Prisma.PhotoUpdateInput) {
  const current = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { visibility: true, status: true },
  })
  if (!current) throw createError({ statusCode: 404, message: 'Photo not found' })

  const nextVisibility = typeof data.visibility === 'string' ? data.visibility : current.visibility
  const nextStatus = typeof data.status === 'string' ? data.status : current.status

  return prisma.photo.update({
    where: { id: photoId },
    data: {
      ...data,
      ecsSyncPolicy: calculateEcsSyncPolicy(nextVisibility, nextStatus),
    },
  })
}
// ─── Photo Sync Service ────────────────────────────────────────────────────

/**
 * 获取待同步到 ECS 的照片列表
 * 条件：ecsSyncPolicy = 'pending' 且 visibility = 'public'/'friends' 且 status = 'published'
 */
export async function getPendingSyncPhotos(limit: number = 50) {
  return prisma.photo.findMany({
    where: {
      ecsSyncPolicy: ECS_SYNC_POLICY.PENDING,
      visibility: { in: [VISIBILITY.PUBLIC, VISIBILITY.FRIENDS] },
      status: PHOTO_STATUS.PUBLISHED,
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
      ecsSyncPolicy: ECS_SYNC_POLICY.SYNCING,
    },
  })
}

/**
 * 标记照片同步完成
 */
export async function markPhotoSynced(
  photoId: number,
  ecsThumbPath: string,
): Promise<void> {
  await prisma.photo.update({
    where: { id: photoId },
    data: {
      ecsSyncPolicy: ECS_SYNC_POLICY.SYNCED,
      ecsThumbPath,
      syncedAt: new Date(),
      syncError: null,
    },
  })
}

/**
 * 标记照片同步失败
 */
export async function markPhotoSyncFailed(
  photoId: number,
  error: string,
): Promise<void> {
  await prisma.photo.update({
    where: { id: photoId },
    data: {
      ecsSyncPolicy: ECS_SYNC_POLICY.FAILED,
      syncError: error,
    },
  })

  console.error(`[photo-sync] Failed for photo ${photoId}: ${error}`)
}
/**
 * 获取同步状态统计
 */
export async function getSyncStats() {
  const [pending, syncing, synced, failed, localOnly] = await Promise.all([
    prisma.photo.count({
      where: { ecsSyncPolicy: ECS_SYNC_POLICY.PENDING },
    }),
    prisma.photo.count({
      where: { ecsSyncPolicy: ECS_SYNC_POLICY.SYNCING },
    }),
    prisma.photo.count({
      where: { ecsSyncPolicy: ECS_SYNC_POLICY.SYNCED },
    }),
    prisma.photo.count({
      where: { ecsSyncPolicy: ECS_SYNC_POLICY.FAILED },
    }),
    prisma.photo.count({
      where: { ecsSyncPolicy: ECS_SYNC_POLICY.LOCAL_ONLY },
    }),
  ])

  return {
    pending,
    syncing,
    synced,
    failed,
    localOnly,
    total: pending + syncing + synced + failed + localOnly,
  }
}

/**
 * 重置失败的照片为待同步
 */
export async function resetFailedPhotos(): Promise<number> {
  const result = await prisma.photo.updateMany({
    where: {
      ecsSyncPolicy: ECS_SYNC_POLICY.FAILED,
    },
    data: {
      ecsSyncPolicy: ECS_SYNC_POLICY.PENDING,
      syncError: null,
    },
  })

  return result.count
}
