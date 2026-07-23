import { requireLogin } from '~/server/utils/permission'
import { verifyTotp } from '~/server/utils/totp'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  const code = String((await readBody(event))?.code || '')
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true, twoFactorSecret: true } })
  if (current?.twoFactorEnabled && !verifyTotp(current.twoFactorSecret || '', code)) throw createError({ statusCode: 400, message: 'Invalid two-factor code' })
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorPendingSecret: null, tokenVersion: { increment: 1 } } })
  return { success: true }
})
