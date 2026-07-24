import { prisma } from '~/server/utils/db'
import { requireAdmin, requireSuperadmin, ROLES } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = requireSuperadmin(await requireAdmin(event))
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Invalid user ID' })
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })
  const body = await readBody(event)
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, message: 'Request body is required' })
  if (body.status === 'disabled' && actor.id === id) throw createError({ statusCode: 400, message: 'Cannot disable your own account' })
  if (body.role !== undefined && actor.id === id && body.role !== ROLES.SUPERADMIN) throw createError({ statusCode: 400, message: 'Cannot remove your own superadmin role' })
  const data: any = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.status !== undefined && ['active', 'disabled', 'pending'].includes(body.status)) data.status = body.status
  if (body.role !== undefined) data.role = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.USER].includes(body.role) ? body.role : ROLES.USER
  if (body.aiAccess !== undefined) data.aiAccess = Boolean(body.aiAccess)
  if (body.aiAccessLevel !== undefined) data.aiAccessLevel = String(body.aiAccessLevel)
  if (body.uploadQuotaMb !== undefined) data.uploadQuotaMb = Math.max(0, Number(body.uploadQuotaMb) || 0)
  if (body.groups !== undefined) {
    if (!Array.isArray(body.groups)) throw createError({ statusCode: 400, message: 'Groups must be an array' })
    const groups: string[] = [...new Set<string>(body.groups.map((value: unknown) => String(value).trim()).filter(Boolean))]
    if (await prisma.group.count({ where: { name: { in: groups } } }) !== groups.length) throw createError({ statusCode: 400, message: 'One or more selected groups do not exist' })
    data.groups = JSON.stringify(groups)
  }
  if (!Object.keys(data).length) throw createError({ statusCode: 400, message: 'No valid fields to update' })
  const updated = await prisma.user.update({ where: { id }, data })
  await logAudit(event, 'user_update', 'user', id, target, data)
  return { success: true, data: { user: { ...updated, groups: updated.groups ? JSON.parse(updated.groups) : [] } } }
})
