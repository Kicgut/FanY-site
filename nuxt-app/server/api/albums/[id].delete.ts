import { requireLocalTrusted } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireLocalTrusted(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  try {
    const before = await prisma.album.findUnique({ where: { id } })
    if (!before) throw Object.assign(new Error('Album not found'), { code: 'P2025' })
    await prisma.album.delete({ where: { id } })
    await logAudit(event, 'album_delete', 'album', id, before, null)
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Album not found' })
    }
    throw createError({ statusCode: 500, message: 'Failed to delete album' })
  }
})
