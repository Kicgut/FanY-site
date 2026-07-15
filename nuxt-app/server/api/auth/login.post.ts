import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getJwtSecret } from '~/server/utils/jwt'
import { prisma } from '~/server/utils/db'
import { STATUS } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'Username and password are required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }

    // Check user status — disabled users cannot login
    if (user.status === STATUS.DISABLED) {
      throw createError({ statusCode: 403, message: 'Account is disabled' })
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Build JWT with full permission context
    let groups: string[] = []
    if (user.groups) {
      try { groups = JSON.parse(user.groups) } catch { groups = [] }
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        status: user.status,
        groups,
        aiAccess: user.aiAccess,
        aiAccessLevel: user.aiAccessLevel,
      },
      getJwtSecret(),
      { expiresIn: '24h' },
    )

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          groups,
          status: user.status,
          aiAccess: user.aiAccess,
          aiAccessLevel: user.aiAccessLevel,
          uploadQuotaMb: user.uploadQuotaMb,
        },
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Login failed' })
  }
})
