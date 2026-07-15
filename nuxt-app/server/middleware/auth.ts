import jwt from 'jsonwebtoken'
import { getJwtSecret } from '~/server/utils/jwt'
import { prisma } from '~/server/utils/db'
import { toAuthUser, STATUS } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only intercept /api/admin/* and /api/ai/* routes
  if (!path.startsWith('/api/admin') && !path.startsWith('/api/ai')) return

  const authHeader = getRequestHeader(event, 'Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: number; role: string }

    // Fetch full user from DB to get current status and permissions
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } })

    if (!dbUser) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    // Disabled users cannot access protected endpoints
    if (dbUser.status === STATUS.DISABLED) {
      throw createError({ statusCode: 403, message: 'Account is disabled' })
    }

    // Inject full AuthUser into context for downstream handlers
    event.context.auth = { id: decoded.id, role: decoded.role }
    event.context.authUser = toAuthUser(dbUser)
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }
})
