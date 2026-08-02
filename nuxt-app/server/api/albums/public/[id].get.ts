import { canViewAlbum, canViewPhoto, getRequestUser } from '~/server/utils/permission'
import { presentPhoto, publicPhotoUrl } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }

  // Determine visibility based on viewer
  const user = await getRequestUser(event)
  const page = Math.max(1, Number(getQuery(event).page) || 1)
  const limit = Math.min(100, Math.max(1, Number(getQuery(event).limit) || 50))
  const photoWhere: any = user?.role === 'superadmin' ? {} : { status: 'published', reviewStatus: 'approved' }

  if (!user) photoWhere.visibility = 'public'
  else if (user.role !== 'superadmin' && user.id !== album.createdBy) {
    photoWhere.OR = [
      { visibility: 'public' },
      ...(user.groups.includes('all')
        ? [{ visibility: 'groups' }]
        : user.groups.map((group) => ({ visibility: 'groups', visibleTo: { contains: `group:${group}` } }))),
    ]
  }

  if (!canViewAlbum(user, album)) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }

  const [albumPhotos, total] = await prisma.$transaction([
    prisma.albumPhoto.findMany({
    where: { albumId: id, photo: photoWhere },
    select: {
      order: true,
      photo: {
        select: {
          id: true, title: true, description: true, filename: true,
          originalUrl: true, thumbnailUrl: true, mediumUrl: true, allowOriginalDownload: true,
          width: true, height: true, originalPath: true, thumbPath: true,
          ecsThumbPath: true, visibility: true, visibleTo: true, uploadedBy: true,
          tags: true,
        },
      },
    },
    orderBy: { order: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    }),
    prisma.albumPhoto.count({ where: { albumId: id, photo: photoWhere } }),
  ])

  // Filter photos based on viewer permissions
  const photos = albumPhotos
    .filter((ap) => {
      const p = ap.photo
      if (!p) return false
      return canViewPhoto(user, p)
    })
    .map((ap) => presentPhoto({
      id: ap.photo.id,
      title: ap.photo.title,
      description: ap.photo.description,
      filename: ap.photo.filename,
      originalUrl: ap.photo.originalUrl,
      thumbnailUrl: ap.photo.thumbnailUrl,
      mediumUrl: ap.photo.mediumUrl,
      width: ap.photo.width,
      height: ap.photo.height,
      tags: ap.photo.tags,
      originalPath: ap.photo.originalPath,
      thumbPath: ap.photo.thumbPath,
      ecsThumbPath: ap.photo.ecsThumbPath,
      allowOriginalDownload: ap.photo.allowOriginalDownload,
    }))

  return {
    success: true,
    data: {
      album: {
        id: album.id,
        name: album.name,
        description: album.description,
        coverUrl: publicPhotoUrl(album.coverUrl) || photos[0]?.thumbnailUrl || photos[0]?.mediumUrl || null,
        visibility: album.visibility,
        photoCount: total,
      },
      photos,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    },
  }
})
