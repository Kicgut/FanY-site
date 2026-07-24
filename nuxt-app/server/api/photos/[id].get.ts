import { canManagePhoto, canViewPhoto, getRequestUser, getAccessOrigin } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: '照片 ID 无效' })
  const photo = await prisma.photo.findUnique({ where: { id }, include: { tags: true, albums: { include: { album: true } } } })
  if (!photo) throw createError({ statusCode: 404, message: '照片不存在' })
  const user = await getRequestUser(event)
  const adminAllowed = Boolean(user && canManagePhoto(user, photo))
  const allowed = adminAllowed || (user && getAccessOrigin(event, user) === 'local_trusted') || canViewPhoto(user, photo)
  if (!allowed) throw createError({ statusCode: 404, message: '照片不存在' })
  const isPrivileged = adminAllowed || getAccessOrigin(event, user) === 'local_trusted'
  return presentPhoto(photo, { includeOriginal: isPrivileged, includeAdminMeta: isPrivileged })
})
