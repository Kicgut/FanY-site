import { getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

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
  const origin = getAccessOrigin(event, user)
  const isAdmin = user?.role === ROLES.ADMIN

  // Check if viewer can see this album
  if (album.visibility === 'private' && !isAdmin) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }
  if (album.visibility === 'friends' && !user) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }

  // Fetch all album photos (no nested where — filter in memory instead)
  const albumPhotos = await prisma.albumPhoto.findMany({
    where: { albumId: id },
    include: {
      photo: {
        include: { tags: true },
      },
    },
    orderBy: { order: 'asc' },
  })

  // Filter photos based on viewer permissions
  const photos = albumPhotos
    .filter((ap) => {
      const p = ap.photo
      if (!p) return false
      if (p.status !== 'published' || p.reviewStatus !== 'approved') return false

      if (isAdmin) return true
      if (!user) return p.visibility === 'public'
      if (origin === 'local_trusted') return true
      if (p.visibility === 'public') return true
      if (p.visibility === 'friends' && p.visibleTo?.includes(user.username)) return true
      if (p.visibility === 'private' && p.uploadedBy === user.id) return true
      return false
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
    }))

  return {
    success: true,
    data: {
      album: {
        id: album.id,
        name: album.name,
        description: album.description,
        coverUrl: album.coverUrl || photos[0]?.thumbnailUrl || photos[0]?.mediumUrl || null,
        visibility: album.visibility,
      },
      photos,
      total: photos.length,
    },
  }
})
