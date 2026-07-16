import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid candidate ID' })
  const revisions = await prisma.contentRevision.findMany({
    where: { candidateId: id },
    orderBy: { version: 'desc' },
  })
  return { success: true, data: revisions }
})
