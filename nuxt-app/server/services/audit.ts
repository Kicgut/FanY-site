import { prisma } from '~/server/utils/db'
import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { getRequestUser } from '~/server/utils/permission'

/**
 * Log an audit event. Extracts userId, ip, userAgent from the H3 event context.
 */
export async function logAudit(
  event: H3Event,
  action: string,
  resourceType: string,
  resourceId?: string | number,
  before?: unknown,
  after?: unknown,
) {
  const user = await getRequestUser(event)
  const ip = getClientIp(event)
  const userAgent = getRequestHeader(event, 'user-agent') || null

  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action,
        resourceType,
        resourceId: resourceId != null ? String(resourceId) : null,
        beforeJson: before != null ? JSON.stringify(before) : null,
        afterJson: after != null ? JSON.stringify(after) : null,
        ip,
        userAgent,
      },
    })
  } catch (err) {
    // Audit logging should never crash the request
    console.error('[audit] Failed to write audit log:', err)
  }
}

function getClientIp(event: H3Event): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }
  const remote = getRequestHeader(event, 'x-real-ip') || ''
  if (remote) return remote
  const nodeReq = event.node?.req
  const addr = nodeReq?.socket?.remoteAddress || nodeReq?.connection?.remoteAddress || ''
  if (addr.startsWith('::ffff:')) return addr.slice(7)
  return addr || '127.0.0.1'
}

export interface AuditLogFilters {
  action?: string
  resourceType?: string
  userId?: number
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

/**
 * Query audit logs with filters and pagination.
 */
export async function getAuditLogs(filters: AuditLogFilters) {
  const page = Math.max(1, filters.page || 1)
  const limit = Math.min(100, Math.max(1, filters.limit || 20))
  const skip = (page - 1) * limit

  const where: any = {}

  if (filters.action) {
    where.action = filters.action
  }
  if (filters.resourceType) {
    where.resourceType = filters.resourceType
  }
  if (filters.userId) {
    where.userId = filters.userId
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate)
    }
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  // Resolve user names for display
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as number[]
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const logsWithUser = logs.map((log) => ({
    ...log,
    user: log.userId ? userMap.get(log.userId) || null : null,
  }))

  return { logs: logsWithUser, total, page, limit }
}

/**
 * Get action count statistics grouped by action type.
 */
export async function getAuditLogStats() {
  const stats = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
  })

  return stats.map((s) => ({
    action: s.action,
    count: s._count.action,
  }))
}
