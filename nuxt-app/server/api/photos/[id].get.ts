import { canAccessVisibleTo, getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: '照片 ID 无效' })
  const photo = await prisma.photo.findUnique({ where: { id }, include: { tags: true, albums: { include: { album: true } } } })
  if (!photo) throw createError({ statusCode: 404, message: '照片不存在' })
  const user = await getRequestUser(event)
  const allowed = (user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN) || (user && getAccessOrigin(event, user) === 'local_trusted') || (
    photo.status === 'published' && photo.reviewStatus === 'approved' && (
      photo.visibility === 'public' ||
      (user && photo.visibility === 'friends' && canAccessVisibleTo(photo.visibleTo, user)) ||
      (user && photo.visibility === 'private' && photo.uploadedBy === user.id)
    )
  )
  if (!allowed) throw createError({ statusCode: 404, message: '照片不存在' })
  const isPrivileged = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN || getAccessOrigin(event, user) === 'local_trusted'
  return presentPhoto(photo, { includeOriginal: isPrivileged, includeAdminMeta: isPrivileged })
})
