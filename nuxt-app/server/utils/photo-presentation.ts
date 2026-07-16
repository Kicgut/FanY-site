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
  return {
    ...photo,
    originalUrl: publicPhotoUrl(photo.originalUrl) || publicPhotoUrl(photo.originalPath),
    thumbnailUrl: publicPhotoUrl(photo.thumbnailUrl) || publicPhotoUrl(photo.thumbPath) || publicPhotoUrl(photo.ecsThumbPath),
    mediumUrl: publicPhotoUrl(photo.mediumUrl) || publicPhotoUrl(photo.thumbnailUrl) || publicPhotoUrl(photo.thumbPath),
  }
}
