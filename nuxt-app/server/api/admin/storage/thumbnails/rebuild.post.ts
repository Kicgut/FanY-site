import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  const limit = Math.min(Math.max(Number(body?.limit || 20), 1), 100)
  const retryFailed = body?.retryFailed === true
  const job = await prisma.job.create({ data: { type: 'photo_thumbnail_rebuild', status: 'pending', payload: JSON.stringify({ limit, retryFailed }), createdBy: user.id, availableAt: new Date() } })
  return { success: true, data: job }
})
