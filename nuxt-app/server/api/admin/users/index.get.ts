import { prisma } from '~/server/utils/db'
import { requireAdmin, parseGroups } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const where: any = {}

  if (query.status) where.status = query.status
  if (query.role) where.role = query.role

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      groups: true,
      status: true,
      aiAccess: true,
      aiAccessLevel: true,
      uploadQuotaMb: true,
      usedQuotaMb: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    success: true,
    data: {
      users: users.map((u) => ({ ...u, groups: parseGroups(u.groups) })),
    },
  }
})
