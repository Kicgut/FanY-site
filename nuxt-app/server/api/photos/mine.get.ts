import { requireLogin } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

/** Return the current user's uploads, including review states that are hidden publicly. */
export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const where = { uploadedBy: user.id }

  const [photos, total] = await prisma.$transaction([
    prisma.photo.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.photo.count({ where }),
  ])

  return {
    success: true,
    data: {
      photos: photos.map((photo) => presentPhoto(photo, { includeAdminMeta: true })),
      total,
      page,
      limit,
    },
  }
})
