import { prisma } from '~/server/utils/db'
import type { AuthUser } from '~/server/utils/permission'
import { calculateEcsSyncPolicy, VISIBILITY } from '~/server/services/photo-sync'
import { isPhotoCompatibleWithAlbum } from '~/server/utils/permission'

// ─── Constants ─────────────────────────────────────────────────────────────

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_EDIT: 'needs_edit',
} as const

export const PHOTO_STATUS = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  ARCHIVED: 'archived',
} as const

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ─── Service Functions ─────────────────────────────────────────────────────

/**
 * Approve a photo (admin only).
 * Sets visibility, status=published, reviewStatus=approved.
 */
export async function approvePhoto(
  photoId: number,
  decision: {
    visibility?: string
    visibleTo?: string
    status?: string
    albumIds?: number[]
    allowOriginalDownload?: boolean
    tags?: string[]
    title?: string
    location?: string
    description?: string
  },
  actor: AuthUser,
) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { albums: { include: { album: true } } } })
  if (!photo) {
    throw createError({ statusCode: 404, message: 'Photo not found' })
  }

  // Update photo with decision fields
  const updateData: any = {
    reviewStatus: REVIEW_STATUS.APPROVED,
    reviewedBy: actor.id,
    reviewedAt: new Date(),
    status: decision.status || PHOTO_STATUS.PUBLISHED,
    visibility: decision.visibility || photo.visibility,
  }

  if (decision.visibleTo !== undefined) updateData.visibleTo = decision.visibleTo
  if (decision.allowOriginalDownload !== undefined) updateData.allowOriginalDownload = decision.allowOriginalDownload
  if (decision.title !== undefined) updateData.title = decision.title
  if (decision.location !== undefined) updateData.location = decision.location
  if (decision.description !== undefined) updateData.description = decision.description
  updateData.ecsSyncPolicy = calculateEcsSyncPolicy(updateData.visibility, updateData.status)

  const nextPhoto = { visibility: updateData.visibility, visibleTo: updateData.visibleTo === undefined ? photo.visibleTo : updateData.visibleTo }
  if (nextPhoto.visibility !== 'private' && photo.albums.some(({ album }) => !isPhotoCompatibleWithAlbum(nextPhoto, album))) {
    throw createError({ statusCode: 400, message: 'Photo groups are incompatible with one or more current albums' })
  }
  let selectedAlbums: { id: number, visibility: string, visibleTo: string | null }[] = []
  if (decision.albumIds !== undefined) {
    if (nextPhoto.visibility === 'private' && decision.albumIds.length) throw createError({ statusCode: 400, message: 'Private photos cannot be added to albums' })
    selectedAlbums = await prisma.album.findMany({ where: { id: { in: decision.albumIds } }, select: { id: true, visibility: true, visibleTo: true } })
    if (selectedAlbums.length !== new Set(decision.albumIds).size || selectedAlbums.some((album) => !isPhotoCompatibleWithAlbum(nextPhoto, album))) {
      throw createError({ statusCode: 400, message: 'One or more selected albums are incompatible with photo visibility' })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (nextPhoto.visibility === 'private' || decision.albumIds !== undefined) await tx.albumPhoto.deleteMany({ where: { photoId } })
    if (decision.albumIds?.length) await tx.albumPhoto.createMany({ data: selectedAlbums.map((album) => ({ photoId, albumId: album.id })) })
    await tx.photo.update({ where: { id: photoId }, data: updateData })
  })

  // Handle tags if provided
  if (decision.tags !== undefined) {
    await prisma.photoTag.deleteMany({ where: { photoId } })
    if (decision.tags.length) {
      await prisma.photoTag.createMany({
        data: decision.tags.map((name) => ({ photoId, name })),
      })
    }
  }

  // Handle albums if provided
  if (decision.albumIds !== undefined) {
    await prisma.albumPhoto.deleteMany({ where: { photoId } })
    if (decision.albumIds.length) {
      await prisma.albumPhoto.createMany({
        data: decision.albumIds.map((albumId) => ({ photoId, albumId })),
      })
    }
  }

  // Fetch final result with updated tags/albums
  const finalPhoto = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { tags: true, albums: { include: { album: true } } },
  })
  if (!finalPhoto) throw createError({ statusCode: 404, message: 'Photo not found' })
  return finalPhoto
}

/**
 * Reject a photo (admin only).
 */
export async function rejectPhoto(photoId: number, reason: string, actor: AuthUser) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo) {
    throw createError({ statusCode: 404, message: 'Photo not found' })
  }

  return prisma.photo.update({
    where: { id: photoId },
    data: {
      reviewStatus: REVIEW_STATUS.REJECTED,
      status: PHOTO_STATUS.HIDDEN,
      reviewNote: reason || null,
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      ecsSyncPolicy: 'local_only',
    },
    include: { tags: true, albums: { include: { album: true } } },
  })
}

/**
 * Request edit on a photo (admin only).
 */
export async function requestPhotoEdit(photoId: number, note: string, actor: AuthUser) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo) {
    throw createError({ statusCode: 404, message: 'Photo not found' })
  }

  return prisma.photo.update({
    where: { id: photoId },
    data: {
      reviewStatus: REVIEW_STATUS.NEEDS_EDIT,
      reviewNote: note || null,
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      ecsSyncPolicy: 'local_only',
    },
    include: { tags: true, albums: { include: { album: true } } },
  })
}
