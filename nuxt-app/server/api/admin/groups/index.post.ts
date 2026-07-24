import { prisma } from '~/server/utils/db'
import { requireAdmin, requireSuperadmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  const actor = requireSuperadmin(await requireAdmin(event))
  const name = String((await readBody(event))?.name || '').trim()
  if (!name || name.length > 50) throw createError({ statusCode: 400, message: 'Group name must be 1-50 characters' })
  try {
    const group = await prisma.group.create({ data: { name, createdBy: actor.id } })
    await logAudit(event, 'group_create', 'group', group.id, null, group)
    return { success: true, data: group }
  } catch (error: any) {
    if (error.code === 'P2002') throw createError({ statusCode: 409, message: 'Group already exists' })
    throw error
  }
})
