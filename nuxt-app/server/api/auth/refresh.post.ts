import jwt from 'jsonwebtoken'
import { getJwtSecret } from '~/server/utils/jwt'
import { prisma } from '~/server/utils/db'
import { createRefreshToken, hashRefreshToken } from '~/server/utils/refresh-token'
import { parseGroups, STATUS } from '~/server/utils/permission'
import { getCookie, setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supplied = typeof body?.refreshToken === 'string' ? body.refreshToken : getCookie(event, 'refresh_token') || ''
  if (!supplied) throw createError({ statusCode: 400, message: 'Refresh token is required' })

  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashRefreshToken(supplied) }, include: { user: true } })
  await prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status === STATUS.DISABLED) {
    throw createError({ statusCode: 401, message: 'Invalid or expired refresh token' })
  }

  const groups = parseGroups(session.user.groups)
  const accessToken = jwt.sign({ id: session.user.id, role: session.user.role, status: session.user.status, groups, aiAccess: session.user.aiAccess, aiAccessLevel: session.user.aiAccessLevel, tokenVersion: session.user.tokenVersion }, getJwtSecret(), { expiresIn: '24h' })
  const next = createRefreshToken()
  await prisma.$transaction([
    prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
    prisma.authSession.create({ data: { userId: session.user.id, tokenHash: next.hash, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }),
  ])
  setCookie(event, 'refresh_token', next.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return { success: true, data: { token: accessToken } }
})
