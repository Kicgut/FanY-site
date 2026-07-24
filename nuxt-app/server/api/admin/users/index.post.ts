import bcrypt from 'bcryptjs'
import { prisma } from '~/server/utils/db'
import { requireAdmin, parseGroups, ROLES, requireSuperadmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = requireSuperadmin(await requireAdmin(event))
  const body = await readBody(event)
  if (!body?.username || !body?.password || !body?.name) throw createError({ statusCode: 400, message: 'Username, name and password are required' })
  if (String(body.password).length < 8) throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
  const username = String(body.username).trim()
  if (await prisma.user.findUnique({ where: { username } })) throw createError({ statusCode: 409, message: 'Username already exists' })
  const requestedRole = String(body.role || ROLES.USER)
  const role = requestedRole === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : requestedRole === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER
  const groups: string[] = Array.isArray(body.groups) ? [...new Set<string>(body.groups.map((value: unknown) => String(value).trim()).filter(Boolean))] : []
  const valid = await prisma.group.count({ where: { name: { in: groups } } })
  if (valid !== groups.length) throw createError({ statusCode: 400, message: 'One or more selected groups do not exist' })
  const user = await prisma.user.create({ data: { username, name: String(body.name).trim(), password: await bcrypt.hash(String(body.password), 12), role, groups: JSON.stringify(groups), status: body.status || 'active', aiAccess: Boolean(body.aiAccess), aiAccessLevel: body.aiAccess ? (body.aiAccessLevel || 'chat') : 'none', uploadQuotaMb: Number(body.uploadQuotaMb) || 500 }, select: { id: true, username: true, name: true, role: true, groups: true, status: true, aiAccess: true, aiAccessLevel: true, uploadQuotaMb: true, usedQuotaMb: true, createdAt: true } })
  const result = { ...user, groups: parseGroups(user.groups), createdBy: actor.id }
  await logAudit(event, 'user_create', 'user', user.id, null, result)
  return { success: true, data: result }
})
