import { requireLogin } from '~/server/utils/permission'
import { generateTotpSecret } from '~/server/utils/totp'

export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  const secret = generateTotpSecret()
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorPendingSecret: secret } })
  const issuer = encodeURIComponent(process.env.TOTP_ISSUER || 'FanY Site')
  const account = encodeURIComponent(user.username)
  return { success: true, data: { secret, otpauthUrl: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` } }
})
