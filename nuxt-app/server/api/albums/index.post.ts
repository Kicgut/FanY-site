import { prisma } from '~/server/utils/db'
import { requireAdmin, ROLES } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

async function controlledVisibleTo(raw: unknown, actor: Awaited<ReturnType<typeof requireAdmin>>) {
  const values = Array.isArray(raw) ? [...new Set(raw.map(String).map((v) => v.replace(/^group:/, '').trim()).filter(Boolean))] : []
  const count = await prisma.group.count({ where: { name: { in: values } } })
  if (count !== values.length) throw createError({ statusCode: 400, message: 'Selected group does not exist' })
  if (actor.role !== ROLES.SUPERADMIN && values.some((group) => !actor.groups.includes(group))) throw createError({ statusCode: 403, message: 'Admins can only use their own groups' })
  return values.map((group) => `group:${group}`)
}

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: 'Album name is required' })
  const visibility = ['public', 'private', 'groups'].includes(body.visibility) ? body.visibility : 'private'
  const visibleTo = await controlledVisibleTo(body.visibleTo, actor)
  if (visibility === 'groups' && !visibleTo.length) throw createError({ statusCode: 400, message: 'A group album needs at least one group' })
  try {
    const album = await prisma.album.create({ data: { name: String(body.name).trim(), description: body.description || null, coverUrl: body.coverUrl || null, visibility, visibleTo: visibleTo.length ? JSON.stringify(visibleTo) : null, createdBy: actor.id } })
    await logAudit(event, 'album_create', 'album', album.id, null, album)
    return album
  } catch (error: any) {
    if (error.code === 'P2002') throw createError({ statusCode: 400, message: 'An album with this name already exists' })
    throw error
  }
})
