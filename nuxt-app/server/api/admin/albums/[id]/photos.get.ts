import { requireAdmin } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 50))
  const skip = (page - 1) * limit

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }

  const [albumPhotos, total] = await prisma.$transaction([
    prisma.albumPhoto.findMany({
      where: { albumId: id },
      include: {
        photo: {
          include: { tags: true, albums: { include: { album: true } } },
        },
      },
      orderBy: { order: 'asc' },
      skip,
      take: limit,
    }),
    prisma.albumPhoto.count({ where: { albumId: id } }),
  ])

  return {
    success: true,
    data: {
      album: { id: album.id, name: album.name, description: album.description, visibility: album.visibility, coverUrl: album.coverUrl },
      photos: albumPhotos.map((ap) => ({ ...ap.photo, albumOrder: ap.order })),
      total,
      page,
      limit,
    },
  }
})
