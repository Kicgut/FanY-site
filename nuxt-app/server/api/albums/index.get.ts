import { requireAdmin, canManageScopedResource } from '~/server/utils/permission'
import { presentPhoto, publicPhotoUrl } from '~/server/utils/photo-presentation'

function usableCoverUrl(value: string | null | undefined) {
  const url = publicPhotoUrl(value)
  if (!url) return null
  if (url.startsWith('/api/photos/file') && !url.includes('id=')) return null
  return url
}

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  try {
    const albums = await prisma.album.findMany({
      include: {
        _count: { select: { photos: true } },
        photos: {
          include: { photo: true },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = albums.filter((album) => canManageScopedResource(actor, album.createdBy, album.visibleTo, false)).map((album) => ({
      ...album,
      visibleTo: album.visibleTo ? (() => { try { return JSON.parse(album.visibleTo) } catch { return [] } })() : [],
      photoCount: album._count.photos,
      coverUrl: usableCoverUrl(album.coverUrl) || (album.photos[0]?.photo ? (() => {
        const photo = presentPhoto(album.photos[0].photo, { includeOriginal: true, includeAdminMeta: true })
        return photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl || null
      })() : null),
      photos: undefined,
      _count: undefined,
    }))

    return result
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch albums' })
  }
})
