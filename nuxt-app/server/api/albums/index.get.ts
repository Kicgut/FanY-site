export default defineEventHandler(async (event) => {
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
      photoCount: album._count.photos,
      coverUrl: album.coverUrl || album.photos[0]?.photo?.thumbnailUrl || null,
      photos: undefined,
      _count: undefined,
    }))

    return result
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch albums' })
  }
})
