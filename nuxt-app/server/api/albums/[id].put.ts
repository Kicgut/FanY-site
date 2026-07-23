import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  const body = await readBody(event)

  try {
    const before = await prisma.album.findUnique({ where: { id } })
    if (!before) throw Object.assign(new Error('Album not found'), { code: 'P2025' })
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.coverUrl !== undefined) updateData.coverUrl = body.coverUrl
    if (body.visibility !== undefined && ['public', 'private', 'groups'].includes(body.visibility)) {
      updateData.visibility = body.visibility
    }
    if (body.visibleTo !== undefined) updateData.visibleTo = Array.isArray(body.visibleTo) ? JSON.stringify(body.visibleTo.map(String)) : body.visibleTo

    const album = await prisma.album.update({
      where: { id },
      data: updateData,
    })

    await logAudit(event, 'album_update', 'album', id, before, album)
    return album
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Album not found' })
    }
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'An album with this name already exists' })
    }
    throw createError({ statusCode: 500, message: 'Failed to update album' })
  }
})
