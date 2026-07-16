import { requireAdmin } from '~/server/utils/permission'
import { enqueueInboxProcessingJob, runInboxProcessingJob } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  const job = await enqueueInboxProcessingJob(user.id)

  if (body?.mode === 'run') {
    const completed = await runInboxProcessingJob(job.id, user.id)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'run_content_pipeline',
        resourceType: 'job',
        resourceId: String(job.id),
        afterJson: completed.result || JSON.stringify({ status: completed.status }),
      },
    })
    return { success: true, data: completed }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'enqueue_content_pipeline',
      resourceType: 'job',
      resourceId: String(job.id),
    },
  })
  return { success: true, data: job }
})
