import { prisma } from '~/server/utils/db'
import { requireAdmin } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { success: true, data: await prisma.group.findMany({ orderBy: { name: 'asc' } }) }
})
