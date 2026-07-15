import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  const body = await readBody(event)
  if (!body.photoIds?.length) {
    throw createError({ statusCode: 400, message: 'photoIds is required' })
  }

  const result = await prisma.albumPhoto.deleteMany({
    where: { albumId: id, photoId: { in: body.photoIds } },
  })

  await logAudit(event, 'album_remove_photos', 'album', id, null, { photoIds: body.photoIds, removed: result.count })

  return { success: true, data: { removed: result.count } }
})
