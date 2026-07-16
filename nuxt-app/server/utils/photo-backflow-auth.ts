import { getRequestHeader } from 'h3'
import { getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'

export async function requirePhotoBackflowAccess(event: any) {
  const configuredToken = process.env.PHOTO_BACKFLOW_TOKEN
  if (configuredToken && getRequestHeader(event, 'x-photo-backflow-token') === configuredToken) return
  const user = await getRequestUser(event)
  if (user?.role === ROLES.ADMIN || getAccessOrigin(event, user) === 'local_trusted') return
  throw createError({ statusCode: 403, message: '回流接口未授权' })
}
