import { presentPhoto, publicPhotoUrl } from '~/server/utils/photo-presentation'

const publicPhotoWhere = {
  photo: {
    visibility: 'public',
    status: 'published',
    reviewStatus: 'approved',
  },
} as const

export default defineEventHandler(async () => {
  try {
    const albums = await prisma.album.findMany({
      where: { visibility: 'public' },
      select: {
        id: true,
        name: true,
        description: true,
        coverUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = await Promise.all(albums.map(async (album) => {
      const [photoCount, previews] = await Promise.all([
        prisma.albumPhoto.count({ where: { albumId: album.id, ...publicPhotoWhere } }),
        prisma.albumPhoto.findMany({
          where: { albumId: album.id, ...publicPhotoWhere },
          select: { photo: { include: { tags: true } } },
          orderBy: { order: 'asc' },
          take: 10,
        }),
      ])

      const previewPhotos = previews.map(({ photo }) => {
        const presented = presentPhoto(photo)
        return { id: presented.id, title: presented.title, thumbnailUrl: presented.thumbnailUrl || presented.mediumUrl }
      })

      return {
        id: album.id,
        name: album.name,
        description: album.description,
        coverUrl: publicPhotoUrl(album.coverUrl) || previewPhotos[0]?.thumbnailUrl || null,
        photoCount,
        previewPhotos,
        createdAt: album.createdAt,
      }
    }))

    return { success: true, data: result.filter((album) => album.photoCount > 0) }
  } catch (error: any) {
    console.error('Failed to fetch public albums:', error)
    throw createError({ statusCode: 500, message: 'Failed to fetch public albums' })
  }
})
