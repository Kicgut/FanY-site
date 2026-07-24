import { requireAdmin, canManageScopedResource } from '~/server/utils/permission'
import { presentPhoto, publicPhotoUrl } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

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
  if (!canManageScopedResource(actor, album.createdBy, album.visibleTo, false)) throw createError({ statusCode: 403, message: 'Album is outside your management groups' })

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
    album: { id: album.id, name: album.name, description: album.description, visibility: album.visibility, coverUrl: publicPhotoUrl(album.coverUrl), photoCount: total },
    photos: albumPhotos.map((ap) => ({ ...presentPhoto(ap.photo, { includeOriginal: true, includeAdminMeta: true }), albumOrder: ap.order })),
    total,
    page,
    limit,
  }
})
