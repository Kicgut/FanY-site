import { canAccessVisibleTo, canManageScopedResource, getRequestUser, getAccessOrigin, ROLES } from '~/server/utils/permission'
import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: '照片 ID 无效' })
  const photo = await prisma.photo.findUnique({ where: { id }, include: { tags: true, albums: { include: { album: true } } } })
  if (!photo) throw createError({ statusCode: 404, message: '照片不存在' })
  const user = await getRequestUser(event)
  const adminAllowed = Boolean(user && canManageScopedResource(user, photo.uploadedBy, photo.visibleTo)) || Boolean(user && photo.albums.some(({ album }) => canManageScopedResource(user, album.createdBy, album.visibleTo, false)))
  const allowed = adminAllowed || (user && getAccessOrigin(event, user) === 'local_trusted') || (
    photo.status === 'published' && photo.reviewStatus === 'approved' && (
      photo.visibility === 'public' ||
      (user && photo.visibility === 'friends' && canAccessVisibleTo(photo.visibleTo, user)) ||
      (user && photo.visibility === 'private' && photo.uploadedBy === user.id)
    )
  )
  if (!allowed) throw createError({ statusCode: 404, message: '照片不存在' })
  const isPrivileged = adminAllowed || getAccessOrigin(event, user) === 'local_trusted'
  return presentPhoto(photo, { includeOriginal: isPrivileged, includeAdminMeta: isPrivileged })
})
