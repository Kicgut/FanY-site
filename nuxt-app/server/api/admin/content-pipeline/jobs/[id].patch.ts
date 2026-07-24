import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { runInboxProcessingJob } from '~/server/services/content-pipeline'
import { runThumbnailRebuild } from '~/server/services/photo-thumbnails'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Invalid job id' })
  const body = await readBody(event).catch(() => ({}))
  const action = String(body?.action || '')
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job || !['content_pipeline_daily', 'photo_thumbnail_rebuild'].includes(job.type)) throw createError({ statusCode: 404, message: 'Job not found' })

  if (action === 'cancel') {
    if (!['pending', 'running'].includes(job.status)) throw createError({ statusCode: 409, message: 'Only pending or running jobs can be cancelled' })
    const updated = await prisma.job.update({ where: { id }, data: { status: 'cancelled', finishedAt: new Date(), error: 'Cancelled by administrator' } })
    return { success: true, data: updated }
  }
  if (action === 'retry') {
    if (!['failed', 'completed_with_errors', 'cancelled'].includes(job.status)) throw createError({ statusCode: 409, message: 'Only failed, partial, or cancelled jobs can be retried' })
    const retry = await prisma.job.update({ where: { id }, data: { status: 'pending', availableAt: new Date(), finishedAt: null, error: null } })
    return { success: true, data: retry }
  }
  if (action === 'run') {
    const completed = job.type === 'photo_thumbnail_rebuild'
      ? await runThumbnailRebuild(id, user.id, JSON.parse(job.payload || '{}').limit || 20, JSON.parse(job.payload || '{}').retryFailed === true)
      : await runInboxProcessingJob(id, user.id)
    return { success: true, data: completed }
  }
  throw createError({ statusCode: 400, message: 'Unsupported job action' })
})
