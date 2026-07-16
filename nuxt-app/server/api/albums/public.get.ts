import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  try {
    const albums = await prisma.album.findMany({
      where: {
        visibility: 'public',
      },
      include: {
        _count: { select: { photos: true } },
        photos: {
          include: {
            photo: {
              include: { tags: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = albums
      .map((album) => {
        // Filter to only public+active+approved photos in memory
        const publicPhotos = album.photos
          .filter((ap) => ap.photo && ap.photo.visibility === 'public' && ap.photo.status === 'published' && ap.photo.reviewStatus === 'approved')
          .slice(0, 4)

        const firstPhoto = publicPhotos[0]?.photo ? presentPhoto(publicPhotos[0].photo) : null
        return {
          id: album.id,
          name: album.name,
          description: album.description,
          coverUrl: album.coverUrl || firstPhoto?.thumbnailUrl || firstPhoto?.mediumUrl || firstPhoto?.originalUrl || null,
          photoCount: publicPhotos.length,
          previewPhotos: publicPhotos.map((ap) => {
            const photo = presentPhoto(ap.photo)
            return { id: photo.id, title: photo.title, thumbnailUrl: photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl }
          }),
          createdAt: album.createdAt,
        }
      })
      .filter((a) => a.photoCount > 0)

    return { success: true, data: result }
  } catch (error: any) {
    console.error('Failed to fetch public albums:', error)
    throw createError({ statusCode: 500, message: 'Failed to fetch public albums' })
  }
})
