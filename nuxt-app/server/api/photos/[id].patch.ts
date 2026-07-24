import { requireLogin, ROLES, canManageAlbum, canManagePhoto, isPhotoCompatibleWithAlbum } from '~/server/utils/permission'
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
  if (isAdmin && !canManagePhoto(actor, photo)) {
    throw createError({ statusCode: 403, message: 'Photo is outside your management groups' })
  }
  const data: Prisma.PhotoUpdateInput = {}
  if (!isAdmin) {
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 200)
    if (body.description !== undefined) data.description = String(body.description).slice(0, 2000)
    if (body.tags !== undefined) data.suggestedTags = JSON.stringify(body.tags)
  }
  if (isAdmin && body.status && ['published', 'hidden', 'archived'].includes(body.status)) data.status = body.status
  if (isAdmin && body.visibility && ['public', 'private', 'groups'].includes(body.visibility)) data.visibility = body.visibility
  if (isAdmin && body.visibleTo !== undefined) {
    const groups: string[] = Array.isArray(body.visibleTo) ? [...new Set<string>(body.visibleTo.map(String).map((v: string) => v.replace(/^group:/, '').trim()).filter(Boolean))] : []
    if (await prisma.group.count({ where: { name: { in: groups } } }) !== groups.length) throw createError({ statusCode: 400, message: 'Selected group does not exist' })
    if (actor.role !== ROLES.SUPERADMIN && groups.some((group) => !actor.groups.includes(group))) throw createError({ statusCode: 403, message: 'Admins can only use their own groups' })
    data.visibleTo = JSON.stringify(groups.map((group) => `group:${group}`))
  }
  let removeFromAlbums = false
  if (isAdmin && (body.visibility !== undefined || body.visibleTo !== undefined)) {
    const nextPhoto = {
      visibility: String(body.visibility || photo.visibility),
      visibleTo: data.visibleTo === undefined ? photo.visibleTo : String(data.visibleTo),
    }
    if (nextPhoto.visibility === 'private') {
      removeFromAlbums = true
    } else if (photo.albums.some(({ album }) => !isPhotoCompatibleWithAlbum(nextPhoto, album))) {
      throw createError({ statusCode: 400, message: 'Photo groups are incompatible with one or more current albums; remove it from those albums first' })
    }
  }
  let updated
  if (isAdmin && body.reviewStatus === 'approved') {
    if (body.albumIds !== undefined) {
      if (!Array.isArray(body.albumIds)) throw createError({ statusCode: 400, message: 'albumIds must be an array' })
      const albumIds: number[] = [...new Set((body.albumIds as unknown[]).map(Number).filter((albumId) => Number.isInteger(albumId) && albumId > 0))]
      const albums = await prisma.album.findMany({ where: { id: { in: albumIds } } })
      if (albums.length !== albumIds.length || albums.some((album) => !canManageAlbum(actor, album))) throw createError({ statusCode: 403, message: 'One or more albums are outside your management scope' })
    }
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
    updated = await updatePhotoState(id, data, { removeFromAlbums })
  }
  await logAudit(event, 'photo_update', 'photo', id, photo, updated)
  return { success: true, photo: presentPhoto(updated, { includeOriginal: isAdmin, includeAdminMeta: isAdmin }) }
})
