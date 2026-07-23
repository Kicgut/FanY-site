import { requireLogin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { deleteCookie } from 'h3'

/** Revoke all currently issued tokens for the authenticated account. */
export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } }),
    prisma.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
  await logAudit(event, 'auth_logout', 'user', user.id)
  deleteCookie(event, 'refresh_token', { path: '/' })
  return { success: true }
})
