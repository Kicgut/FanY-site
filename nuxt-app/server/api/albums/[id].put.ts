import { prisma } from '~/server/utils/db'
import { requireAdmin, ROLES, canManageScopedResource } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const before = await prisma.album.findUnique({ where: { id } })
  if (!before) throw createError({ statusCode: 404, message: 'Album not found' })
  if (!canManageScopedResource(actor, before.createdBy, before.visibleTo, false)) throw createError({ statusCode: 403, message: 'Album is outside your management groups' })
  const body = await readBody(event)
  const data: any = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.description !== undefined) data.description = body.description || null
  if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl || null
  if (body.visibility !== undefined && ['public', 'private', 'groups'].includes(body.visibility)) data.visibility = body.visibility
  if (body.visibleTo !== undefined) {
    const groups: string[] = Array.isArray(body.visibleTo) ? [...new Set<string>(body.visibleTo.map(String).map((v: string) => v.replace(/^group:/, '').trim()).filter(Boolean))] : []
    if (await prisma.group.count({ where: { name: { in: groups } } }) !== groups.length) throw createError({ statusCode: 400, message: 'Selected group does not exist' })
    if (actor.role !== ROLES.SUPERADMIN && groups.some((group) => !actor.groups.includes(group))) throw createError({ statusCode: 403, message: 'Admins can only use their own groups' })
    data.visibleTo = groups.length ? JSON.stringify(groups.map((group) => `group:${group}`)) : null
  }
  if ((data.visibility || before.visibility) === 'groups' && !data.visibleTo && !before.visibleTo) throw createError({ statusCode: 400, message: 'A group album needs at least one group' })
  const album = await prisma.album.update({ where: { id }, data })
  await logAudit(event, 'album_update', 'album', id, before, album)
  return album
})
