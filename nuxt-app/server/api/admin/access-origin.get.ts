import { requireAdmin, getAccessOrigin } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const origin = getAccessOrigin(event, user)

  // Extract client IP for display (same logic as permission.ts)
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  let ip = 'unknown'
  if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else {
    const remote = getRequestHeader(event, 'x-real-ip')
    if (remote) {
      ip = remote
    } else {
      const nodeReq = event.node?.req
      const addr = nodeReq?.socket?.remoteAddress || nodeReq?.connection?.remoteAddress || ''
      if (addr.startsWith('::ffff:')) ip = addr.slice(7)
      else ip = addr || '127.0.0.1'
    }
  }

  return {
    success: true,
    data: {
      origin,
      ip,
    },
  }
})
