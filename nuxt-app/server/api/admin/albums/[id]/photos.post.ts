import { requireAdmin, canManageAlbum, canManagePhoto, isPhotoCompatibleWithAlbum } from '~/server/utils/permission'
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

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) {
    throw createError({ statusCode: 404, message: 'Album not found' })
  }
  if (!canManageAlbum(actor, album)) throw createError({ statusCode: 403, message: 'Album is outside your management scope' })

  // Get current max order in album
  const maxOrder = await prisma.albumPhoto.aggregate({
    where: { albumId: id },
    _max: { order: true },
  })
  let nextOrder = (maxOrder._max.order ?? -1) + 1

  let added = 0
  for (const photoId of body.photoIds) {
    try {
      const photo = await prisma.photo.findUnique({ where: { id: Number(photoId) } })
      if (!photo || !canManagePhoto(actor, photo)) continue
      if (!isPhotoCompatibleWithAlbum(photo, album)) throw createError({ statusCode: 400, message: `Photo ${photoId} is incompatible with this album` })
      await prisma.albumPhoto.create({
        data: { photoId, albumId: id, order: nextOrder++ },
      })
      added++
    } catch (e: any) {
      // Skip duplicates (P2002 = unique constraint)
      if (e.code !== 'P2002') throw e
    }
  }

  await logAudit(event, 'album_add_photos', 'album', id, null, { photoIds: body.photoIds, added })

  return { success: true, data: { added, total: body.photoIds.length } }
})
