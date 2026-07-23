import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Album name is required' })
  }

  try {
    const album = await prisma.album.create({
      data: {
        name: body.name,
        description: body.description || null,
        coverUrl: body.coverUrl || null,
        visibility: ['public', 'private', 'groups'].includes(body.visibility) ? body.visibility : 'private',
        visibleTo: Array.isArray(body.visibleTo) ? JSON.stringify(body.visibleTo.map(String)) : null,
      },
    })

    await logAudit(event, 'album_create', 'album', album.id, null, album)
    return album
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'An album with this name already exists' })
    }
    throw createError({ statusCode: 500, message: 'Failed to create album' })
  }
})
