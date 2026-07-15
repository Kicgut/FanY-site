import { requireLocalTrusted } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  await requireLocalTrusted(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  try {
    await prisma.album.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Album not found' })
    }
    throw createError({ statusCode: 500, message: 'Failed to delete album' })
  }
})
