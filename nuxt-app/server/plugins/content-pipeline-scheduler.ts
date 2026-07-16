import { enqueueInboxProcessingJob, runInboxProcessingJob } from '~/server/services/content-pipeline'

/**
 * Optional in-process scheduler for a single-instance deployment.
 * It only creates processed/candidate artifacts; it never publishes content.
 * Multi-instance deployments should use one external cron caller instead.
 */
export default defineNitroPlugin((nitroApp) => {
  if (process.env.CONTENT_PIPELINE_SCHEDULE_ENABLED !== 'true') return

  const intervalMs = Math.max(
    60_000,
    Number(process.env.CONTENT_PIPELINE_INTERVAL_MS || 86_400_000),
  )
  let running = false

  const run = async () => {
    if (running) return
    running = true
    try {
      const job = await enqueueInboxProcessingJob()
      await runInboxProcessingJob(job.id)
    } catch (error) {
      console.error('[content-pipeline] scheduled processing failed:', error)
    } finally {
      running = false
    }
  }

  const initialTimer = setTimeout(run, 10_000)
  const interval = setInterval(run, intervalMs)
  nitroApp.hooks.hook('close', () => {
    clearTimeout(initialTimer)
    clearInterval(interval)
  })
})
