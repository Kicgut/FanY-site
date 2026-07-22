import { requireLogin, ROLES } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  const actor = await requireLogin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (!id || Number.isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid photo ID' })
  const photo = await prisma.photo.findUnique({ where: { id } })
  if (!photo) throw createError({ statusCode: 404, message: 'Photo not found' })
  const isAdmin = actor.role === ROLES.ADMIN || actor.role === ROLES.SUPERADMIN
  if (!isAdmin && photo.uploadedBy !== actor.id) throw createError({ statusCode: 403, message: '只能管理自己上传的照片' })
  const data: Record<string, any> = {}
  if (!isAdmin) {
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 200)
    if (body.description !== undefined) data.description = String(body.description).slice(0, 2000)
    if (body.tags !== undefined) data.suggestedTags = JSON.stringify(body.tags)
  }
  if (isAdmin && body.status && ['published', 'hidden', 'archived'].includes(body.status)) data.status = body.status
  if (isAdmin && body.visibility && ['public', 'friends', 'private', 'groups'].includes(body.visibility)) data.visibility = body.visibility
  if (isAdmin && body.visibleTo !== undefined) data.visibleTo = JSON.stringify(body.visibleTo)
  if (isAdmin && ['pending', 'approved', 'rejected', 'needs_edit'].includes(body.reviewStatus)) {
    data.reviewStatus = body.reviewStatus
    data.reviewNote = body.reviewNote ? String(body.reviewNote) : null
    data.reviewedBy = actor.id
    data.reviewedAt = new Date()
    if (body.reviewStatus === 'approved') data.status = 'published'
    if (body.reviewStatus === 'rejected' || body.reviewStatus === 'needs_edit') data.status = 'hidden'
  }
  try { return { success: true, photo: await prisma.photo.update({ where: { id }, data }) } }
  catch (error: any) { if (error.code === 'P2025') throw createError({ statusCode: 404, message: 'Photo not found' }); throw createError({ statusCode: 500, message: 'Failed to update photo' }) }
})
