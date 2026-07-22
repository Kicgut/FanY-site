/** Convert stored filesystem paths into URLs without exposing storage details. */
export function publicPhotoUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value
  if (value.startsWith('/uploads/')) return value
  const normalized = value.replace(/\\/g, '/')
  const uploadsIndex = normalized.indexOf('/uploads/')
  if (uploadsIndex >= 0) return normalized.slice(uploadsIndex)
  if (normalized.startsWith('/api/')) return normalized
  return null
}

export interface PhotoPresentationOptions {
  /** Admin responses may expose the controlled original endpoint. */
  includeOriginal?: boolean
  /** Include workflow and storage metadata for admin-only responses. */
  includeAdminMeta?: boolean
}

export function presentPhoto<T extends Record<string, any>>(photo: T, options: PhotoPresentationOptions = {}) {
  const assetUrl = (type: 'thumbnail' | 'medium' | 'original') =>
    photo.id ? `/api/photos/file?id=${encodeURIComponent(photo.id)}&type=${type}` : null

  const includeOriginal = options.includeOriginal === true || photo.allowOriginalDownload === true
  const includeAdminMeta = options.includeAdminMeta === true

  return {
    id: photo.id,
    title: photo.title,
    description: photo.description ?? null,
    filename: photo.filename,
    width: photo.width ?? null,
    height: photo.height ?? null,
    orientation: photo.orientation ?? null,
    fileSize: photo.fileSize ?? null,
    mimeType: photo.mimeType ?? null,
    location: photo.location ?? null,
    gpsLatitude: photo.gpsLatitude ?? null,
    gpsLongitude: photo.gpsLongitude ?? null,
    cameraMake: photo.cameraMake ?? null,
    cameraModel: photo.cameraModel ?? null,
    lens: photo.lens ?? null,
    iso: photo.iso ?? null,
    focalLength: photo.focalLength ?? null,
    keywords: photo.keywords ?? null,
    takenAt: photo.takenAt ?? null,
    allowOriginalDownload: photo.allowOriginalDownload === true,
    tags: photo.tags,
    albums: photo.albums,
    originalUrl: includeOriginal ? (assetUrl('original') || publicPhotoUrl(photo.originalUrl)) : null,
    thumbnailUrl: assetUrl('thumbnail') || publicPhotoUrl(photo.thumbnailUrl) || publicPhotoUrl(photo.thumbPath) || publicPhotoUrl(photo.ecsThumbPath),
    mediumUrl: assetUrl('medium') || publicPhotoUrl(photo.mediumUrl) || publicPhotoUrl(photo.thumbnailUrl) || publicPhotoUrl(photo.thumbPath),
    ...(includeAdminMeta ? {
      status: photo.status,
      visibility: photo.visibility,
      reviewStatus: photo.reviewStatus,
      reviewNote: photo.reviewNote ?? null,
      checksum: photo.checksum ?? null,
      syncStatus: photo.syncStatus ?? null,
      thumbnailStatus: photo.thumbnailStatus ?? null,
      ecsSyncPolicy: photo.ecsSyncPolicy ?? null,
      uploadedBy: photo.uploadedBy ?? null,
    } : {}),
  }
}
