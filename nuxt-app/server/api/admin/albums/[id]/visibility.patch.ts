import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { updatePhotoState } from '~/server/services/photo-sync'

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

  // Update album visibility
  const updated = await prisma.album.update({
    where: { id },
    data: { visibility: body.visibility },
  })

  let cascadeCount = 0

  // Cascade to photos if requested
  if (body.cascadeToPhotos) {
    // Only cascade to non-public when making album private/friends
    // Never auto-cascade to public (safety measure)
    if (body.visibility === 'private' || body.visibility === 'groups') {
      const albumPhotoIds = await prisma.albumPhoto.findMany({
        where: { albumId: id },
        select: { photoId: true },
      })
      if (albumPhotoIds.length > 0) {
        for (const { photoId } of albumPhotoIds) {
          await updatePhotoState(photoId, { visibility: body.visibility })
          cascadeCount += 1
        }
      }
    }
  }

  await logAudit(event, 'album_visibility_change', 'album', id, null, {
    visibility: body.visibility,
    cascadeToPhotos: body.cascadeToPhotos,
    cascadeCount,
  })

  return {
    success: true,
    data: {
      album: updated,
      cascadeCount,
    },
  }
})
