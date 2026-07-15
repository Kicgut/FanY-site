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

        return {
          id: album.id,
          name: album.name,
          description: album.description,
          coverUrl: album.coverUrl || publicPhotos[0]?.photo?.thumbnailUrl || null,
          photoCount: album._count.photos,
          previewPhotos: publicPhotos.map((ap) => ({
            id: ap.photo.id,
            title: ap.photo.title,
            thumbnailUrl: ap.photo.thumbnailUrl || ap.photo.mediumUrl || ap.photo.originalUrl,
          })),
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
