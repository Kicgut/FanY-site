/** Convert stored filesystem paths into URLs that the public app can request. */
export function publicPhotoUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value
  if (value.startsWith('/uploads/')) return value
  const normalized = value.replace(/\\/g, '/')
  const uploadsIndex = normalized.indexOf('/uploads/')
  if (uploadsIndex >= 0) return normalized.slice(uploadsIndex)
  return value.startsWith('/') ? value : `/${value}`
}

export function presentPhoto<T extends Record<string, any>>(photo: T) {
  // Use a stable, permission-checked asset endpoint whenever a photo id exists.
  // Stored filesystem paths are an implementation detail and must not leak to clients.
  const assetUrl = (type: 'thumbnail' | 'medium' | 'original') =>
    photo.id ? `/api/photos/file?id=${encodeURIComponent(photo.id)}&type=${type}` : null

  return {
    ...photo,
    originalUrl: assetUrl('original') || publicPhotoUrl(photo.originalUrl) || publicPhotoUrl(photo.originalPath),
    thumbnailUrl: assetUrl('thumbnail') || publicPhotoUrl(photo.thumbnailUrl) || publicPhotoUrl(photo.thumbPath) || publicPhotoUrl(photo.ecsThumbPath),
    mediumUrl: assetUrl('medium') || publicPhotoUrl(photo.mediumUrl) || publicPhotoUrl(photo.thumbnailUrl) || publicPhotoUrl(photo.thumbPath),
  }
}
