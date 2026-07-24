import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const jobs = await prisma.job.findMany({
    where: { type: { in: ['content_pipeline_daily', 'photo_thumbnail_rebuild'] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return { success: true, data: jobs }
})
