import { canAccessVisibleTo, canManageScopedResource, getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const user = await getRequestUser(event)
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const cursor = Number(query.cursor)
  const title = String(query.title || '').trim()
  const tag = String(query.tag || '').trim()
  const location = String(query.location || '').trim()
  const requestedVisibility = String(query.visibility || '').trim()
  const reviewStatus = String(query.reviewStatus || '').trim()
  const albumId = Number(query.albumId)
  const sort = String(query.sort || 'createdAt') === 'takenAt' ? 'takenAt' : 'createdAt'
  const where: any = {}
  if (title) where.title = { contains: title }
  if (tag) where.tags = { some: { name: tag } }
  if (location) where.location = { contains: location }
  if (Number.isInteger(albumId) && albumId > 0) where.albums = { some: { albumId } }

  if (!isAdmin) {
    if (!user) { where.status = 'published'; where.reviewStatus = 'approved'; where.visibility = 'public' }
    else if (getAccessOrigin(event, user) !== 'local_trusted') {
      where.OR = [
        { uploadedBy: user.id },
        { status: 'published', reviewStatus: 'approved', visibility: 'public' },
        { status: 'published', reviewStatus: 'approved', visibility: 'friends' },
        ...user.groups.map((group) => ({ status: 'published', reviewStatus: 'approved', visibility: 'groups', visibleTo: { contains: `group:${group}` } })),
      ]
    }
  } else if (query.status) {
    where.status = String(query.status)
  }
  if (isAdmin && ['public', 'friends', 'private'].includes(requestedVisibility)) where.visibility = requestedVisibility
  if (isAdmin && ['pending', 'approved', 'rejected', 'needs_edit'].includes(reviewStatus)) where.reviewStatus = reviewStatus
  const from = query.takenFrom ? new Date(String(query.takenFrom)) : null
  const to = query.takenTo ? new Date(String(query.takenTo)) : null
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    where.takenAt = {
      ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
      ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
    }
  }

  const [photos, total] = await prisma.$transaction([
    prisma.photo.findMany({
      where,
      include: { tags: true, albums: { include: { album: true } }, uploadedByUser: { select: { id: true, username: true, name: true } } },
      orderBy: [{ [sort]: 'desc' }, { id: 'desc' }],
      ...(Number.isInteger(cursor) && cursor > 0 ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * limit }),
      take: limit,
    }),
    prisma.photo.count({ where }),
  ])
  const visiblePhotos = photos.filter((photo) => {
    if (isAdmin) {
      return canManageScopedResource(user!, photo.uploadedBy, photo.visibleTo) || photo.albums.some(({ album }) => canManageScopedResource(user!, album.createdBy, album.visibleTo, false))
    }
    if (getAccessOrigin(event, user) === 'local_trusted') return true
    if (photo.visibility === 'public') return true
    if (photo.visibility === 'private') return user?.id === photo.uploadedBy
    return canAccessVisibleTo(photo.visibleTo, user)
  })
  const nextCursor = photos.length === limit ? String(photos[photos.length - 1]?.id || '') : null
  return { success: true, photos: visiblePhotos.map((photo) => presentPhoto(photo, { includeOriginal: isAdmin, includeAdminMeta: isAdmin })), total: isAdmin ? visiblePhotos.length : total, page, limit, nextCursor }
})
