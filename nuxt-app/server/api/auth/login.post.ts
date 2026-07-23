import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getJwtSecret } from '~/server/utils/jwt'
import { prisma } from '~/server/utils/db'
import { STATUS } from '~/server/utils/permission'
import { createRefreshToken } from '~/server/utils/refresh-token'
import { setCookie } from 'h3'
import { verifyTotp } from '~/server/utils/totp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password, otp } = body

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
    if (user.twoFactorEnabled && !verifyTotp(user.twoFactorSecret || '', String(otp || ''))) {
      throw createError({ statusCode: 401, message: 'Two-factor code required or invalid', data: { requiresTwoFactor: true } })
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
        tokenVersion: user.tokenVersion,
      },
      getJwtSecret(),
      { expiresIn: '24h' },
    )
    const refresh = createRefreshToken()
    await prisma.authSession.create({
      data: { userId: user.id, tokenHash: refresh.hash, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    })
    setCookie(event, 'refresh_token', refresh.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

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
