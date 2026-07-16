import { getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const user = await getRequestUser(event)
  const isAdmin = user?.role === ROLES.ADMIN
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(10000, Math.max(1, Number(query.limit) || 50))
  const title = String(query.title || '').trim()
  const tag = String(query.tag || '').trim()
  const where: any = {}
  if (title) where.title = { contains: title }
  if (tag) where.tags = { some: { name: tag } }

  if (!isAdmin) {
    where.status = 'published'
    where.reviewStatus = 'approved'
    if (!user) where.visibility = 'public'
    else if (getAccessOrigin(event, user) !== 'local_trusted') {
      where.OR = [
        { visibility: 'public' },
        { visibility: 'friends', visibleTo: { contains: user.username } },
        { visibility: 'private', uploadedBy: user.id },
      ]
    }
  } else if (query.status) {
    where.status = String(query.status)
  }

  const [photos, total] = await prisma.$transaction([
    prisma.photo.findMany({ where, include: { tags: true, albums: { include: { album: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.photo.count({ where }),
  ])
  return { success: true, photos: photos.map(presentPhoto), total, page, limit }
})
