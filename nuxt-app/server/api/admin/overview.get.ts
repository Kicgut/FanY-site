import { getAccessOrigin, requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const [pendingPhotos, pendingCandidates, failedJobs, runningJobs, recentAudit] = await Promise.all([
    prisma.photo.count({ where: { reviewStatus: 'pending' } }),
    prisma.contentCandidate.count({ where: { status: { in: ['submitted', 'reviewing'] } } }),
    prisma.job.count({ where: { status: { in: ['failed', 'completed_with_errors'] } } }),
    prisma.job.count({ where: { status: { in: ['pending', 'running'] } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, action: true, resourceType: true, resourceId: true, createdAt: true, userId: true } }),
  ])
  const ids = recentAudit.map(item => item.userId).filter((id): id is number => id !== null)
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true } }) : []
  const names = new Map(users.map(item => [item.id, item.name || item.username]))
  return { success: true, data: { pendingPhotos, pendingCandidates, failedJobs, runningJobs, origin: getAccessOrigin(event, user), recentAudit: recentAudit.map(item => ({ ...item, actor: item.userId ? names.get(item.userId) || '未知账户' : '系统' })) } }
})
