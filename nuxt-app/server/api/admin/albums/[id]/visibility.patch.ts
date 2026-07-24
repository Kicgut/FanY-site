import { canManageAlbum, requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  const body = await readBody(event)
  if (!body.visibility || !['public', 'private', 'groups'].includes(body.visibility)) {
    throw createError({ statusCode: 400, message: 'Invalid visibility value' })
  }

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }
  if (!canManageAlbum(actor, album)) throw createError({ statusCode: 403, message: 'Album is outside your management scope' })
  if (body.cascadeToPhotos) throw createError({ statusCode: 400, message: 'Album visibility never cascades to photos; edit each photo separately' })

  // Update album visibility
  const updated = await prisma.album.update({
    where: { id },
    data: { visibility: body.visibility },
  })

  await logAudit(event, 'album_visibility_change', 'album', id, null, {
    visibility: body.visibility,
  })

  return {
    success: true,
    data: {
      album: updated,
    },
  }
})
