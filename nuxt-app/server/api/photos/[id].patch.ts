import { requireLogin, ROLES, canManageScopedResource } from '~/server/utils/permission'
import type { Prisma } from '@prisma/client'
import { logAudit } from '~/server/services/audit'
import { approvePhoto, rejectPhoto, requestPhotoEdit } from '~/server/services/photo-review'
import { updatePhotoState } from '~/server/services/photo-sync'
import { presentPhoto } from '~/server/utils/photo-presentation'

export default defineEventHandler(async (event) => {
  const actor = await requireLogin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (!id || Number.isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid photo ID' })
  const photo = await prisma.photo.findUnique({ where: { id }, include: { albums: { include: { album: true } } } })
  if (!photo) throw createError({ statusCode: 404, message: 'Photo not found' })
  const isAdmin = actor.role === ROLES.ADMIN || actor.role === ROLES.SUPERADMIN
  if (!isAdmin && photo.uploadedBy !== actor.id) throw createError({ statusCode: 403, message: '只能管理自己上传的照片' })
  if (isAdmin && !canManageScopedResource(actor, photo.uploadedBy, photo.visibleTo) && !photo.albums.some(({ album }) => canManageScopedResource(actor, album.createdBy, album.visibleTo, false))) {
    throw createError({ statusCode: 403, message: 'Photo is outside your management groups' })
  }
  const data: Prisma.PhotoUpdateInput = {}
  if (!isAdmin) {
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 200)
    if (body.description !== undefined) data.description = String(body.description).slice(0, 2000)
    if (body.tags !== undefined) data.suggestedTags = JSON.stringify(body.tags)
  }
  if (isAdmin && body.status && ['published', 'hidden', 'archived'].includes(body.status)) data.status = body.status
  if (isAdmin && body.visibility && ['public', 'friends', 'private', 'groups'].includes(body.visibility)) data.visibility = body.visibility
  if (isAdmin && body.visibleTo !== undefined) {
    const groups: string[] = Array.isArray(body.visibleTo) ? [...new Set<string>(body.visibleTo.map(String).map((v: string) => v.replace(/^group:/, '').trim()).filter(Boolean))] : []
    if (await prisma.group.count({ where: { name: { in: groups } } }) !== groups.length) throw createError({ statusCode: 400, message: 'Selected group does not exist' })
    if (actor.role !== ROLES.SUPERADMIN && groups.some((group) => !actor.groups.includes(group))) throw createError({ statusCode: 403, message: 'Admins can only use their own groups' })
    data.visibleTo = JSON.stringify(groups.map((group) => `group:${group}`))
  }
  let updated
  if (isAdmin && body.reviewStatus === 'approved') {
    updated = await approvePhoto(id, {
      visibility: body.visibility || photo.visibility,
      visibleTo: body.visibleTo !== undefined ? JSON.stringify(body.visibleTo) : photo.visibleTo || undefined,
      status: body.status || 'published',
      allowOriginalDownload: body.allowOriginalDownload,
      title: body.title,
      description: body.description,
      location: body.location,
      tags: body.tags,
      albumIds: body.albumIds,
    }, actor)
  } else if (isAdmin && body.reviewStatus === 'rejected') {
    updated = await rejectPhoto(id, String(body.reviewNote || ''), actor)
  } else if (isAdmin && body.reviewStatus === 'needs_edit') {
    updated = await requestPhotoEdit(id, String(body.reviewNote || ''), actor)
  } else {
    if (isAdmin && ['pending', 'approved', 'rejected', 'needs_edit'].includes(body.reviewStatus)) {
      data.reviewStatus = body.reviewStatus
      data.reviewNote = body.reviewNote ? String(body.reviewNote) : null
      data.reviewedBy = actor.id
      data.reviewedAt = new Date()
    }
    updated = await updatePhotoState(id, data)
  }
  await logAudit(event, 'photo_update', 'photo', id, photo, updated)
  return { success: true, photo: presentPhoto(updated, { includeOriginal: isAdmin, includeAdminMeta: isAdmin }) }
})
