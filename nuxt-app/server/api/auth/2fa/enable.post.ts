import { requireLogin } from '~/server/utils/permission'
import { generateRecoveryCodes, verifyTotp } from '~/server/utils/totp'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  const code = String((await readBody(event))?.code || '')
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorPendingSecret: true } })
  if (!current?.twoFactorPendingSecret || !verifyTotp(current.twoFactorPendingSecret, code)) throw createError({ statusCode: 400, message: 'Invalid two-factor code' })
  const recovery = generateRecoveryCodes()
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true, twoFactorSecret: current.twoFactorPendingSecret, twoFactorPendingSecret: null, twoFactorRecoveryCodes: JSON.stringify(recovery.hashed), tokenVersion: { increment: 1 } } })
  return { success: true, data: { recoveryCodes: recovery.plain } }
})
