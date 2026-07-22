import bcrypt from 'bcryptjs'
import { requireAdmin, parseGroups, ROLES } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody(event)
  if (!body?.username || !body?.password || !body?.name) throw createError({ statusCode: 400, message: '用户名、姓名和密码不能为空' })
  if (String(body.password).length < 8) throw createError({ statusCode: 400, message: '密码至少需要 8 位' })
  const username = String(body.username).trim()
  if (await prisma.user.findUnique({ where: { username } })) throw createError({ statusCode: 409, message: '用户名已存在' })
  const requestedRole = String(body.role || ROLES.USER)
  if (actor.role !== ROLES.SUPERADMIN && requestedRole !== ROLES.USER) throw createError({ statusCode: 403, message: '普通管理员只能创建普通用户' })
  const role = requestedRole === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : requestedRole === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER
  const groups = Array.isArray(body.groups) ? [...new Set(body.groups.map(String).map((v) => v.trim()).filter(Boolean))] : []
  if (actor.role !== ROLES.SUPERADMIN && groups.some((group) => !actor.groups.includes(group))) throw createError({ statusCode: 403, message: '只能分配自己所属的分组' })
  const user = await prisma.user.create({ data: { username, name: String(body.name).trim(), password: await bcrypt.hash(String(body.password), 12), role, groups: JSON.stringify(groups), status: body.status || 'active', aiAccess: Boolean(body.aiAccess), aiAccessLevel: body.aiAccess ? (body.aiAccessLevel || 'chat') : 'none', uploadQuotaMb: Number(body.uploadQuotaMb) || 500 }, select: { id: true, username: true, name: true, role: true, groups: true, status: true, aiAccess: true, aiAccessLevel: true, uploadQuotaMb: true, usedQuotaMb: true, createdAt: true } })
  return { success: true, data: { ...user, groups: parseGroups(user.groups), createdBy: actor.id } }
})
