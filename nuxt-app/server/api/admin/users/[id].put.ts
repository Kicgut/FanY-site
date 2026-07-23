import { prisma } from '~/server/utils/db'
import {
  requireAdmin,
  getAccessOrigin,
  ROLES,
  canManageUser,
} from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const origin = getAccessOrigin(event, actor)

  const id = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid user ID' })
  }

  // Permission check
  if (!canManageUser(actor, id, origin)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to manage this user' })
  }

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Request body is required' })
  }

  // Fetch existing target user
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (actor.role !== ROLES.SUPERADMIN && (target.role === ROLES.SUPERADMIN || id !== actor.id && target.role === ROLES.ADMIN)) {
    throw createError({ statusCode: 403, message: '普通管理员不能修改管理员账号' })
  }

  // Capture before state for audit
  const beforeState = {
    name: target.name,
    role: target.role,
    groups: target.groups,
    status: target.status,
    aiAccess: target.aiAccess,
    aiAccessLevel: target.aiAccessLevel,
    uploadQuotaMb: target.uploadQuotaMb,
  }

  // Build update data from allowed fields only
  const allowedFields = ['groups', 'aiAccess', 'aiAccessLevel', 'uploadQuotaMb', 'status', 'role', 'name'] as const
  const updateData: any = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = field === 'role'
        ? (body[field] === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : body[field] === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER)
        : body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }

  // Safety: Cannot disable yourself
  if (updateData.status === 'disabled' && actor.id === id) {
    throw createError({ statusCode: 400, message: 'Cannot disable your own account' })
  }

  // Safety: Cannot change your own role away from admin
  if (updateData.role && updateData.role !== ROLES.ADMIN && actor.id === id) {
    throw createError({ statusCode: 400, message: 'Cannot change your own role from admin' })
  }

  if (actor.role !== ROLES.SUPERADMIN && (updateData.role !== undefined || updateData.groups !== undefined)) {
    throw createError({ statusCode: 403, message: '普通管理员不能修改角色或分组' })
  }

  // Serialize groups to JSON if provided as array
  if (updateData.groups && Array.isArray(updateData.groups)) {
    const groups: string[] = Array.from(new Set<string>(updateData.groups.map((value: unknown) => String(value)).map((value: string) => value.trim()).filter(Boolean)))
    if (actor.role !== ROLES.SUPERADMIN && groups.some((group) => !actor.groups.includes(group))) throw createError({ statusCode: 403, message: '只能分配自己所属的分组' })
    updateData.groups = JSON.stringify(groups)
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      groups: true,
      status: true,
      aiAccess: true,
      aiAccessLevel: true,
      uploadQuotaMb: true,
      usedQuotaMb: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Parse groups back to array for response
  let parsedGroups: string[] = []
  if (updated.groups) {
    try { parsedGroups = JSON.parse(updated.groups) } catch { parsedGroups = [] }
  }

  // Log audit
  await logAudit(event, 'user_update', 'user', id, beforeState, updateData)

  return {
    success: true,
    data: { user: { ...updated, groups: parsedGroups } },
  }
})
