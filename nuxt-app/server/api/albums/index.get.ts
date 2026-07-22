import { requireAdmin } from '~/server/utils/permission'
import { presentPhoto, publicPhotoUrl } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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

    const result = albums.map((album) => ({
      ...album,
      visibleTo: album.visibleTo ? (() => { try { return JSON.parse(album.visibleTo) } catch { return [] } })() : [],
      photoCount: album._count.photos,
      coverUrl: publicPhotoUrl(album.coverUrl) || (album.photos[0]?.photo ? (() => {
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
