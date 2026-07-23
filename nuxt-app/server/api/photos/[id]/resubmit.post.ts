import { requireLogin } from '~/server/utils/permission'
import { updatePhotoState } from '~/server/services/photo-sync'
import { logAudit } from '~/server/services/audit'
import { presentPhoto } from '~/server/utils/photo-presentation'

/** Resubmit an owned rejected/needs-edit photo for moderation without charging quota again. */
export default defineEventHandler(async (event) => {
  const user = await requireLogin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid photo ID' })

  const photo = await prisma.photo.findUnique({ where: { id } })
  if (!photo) throw createError({ statusCode: 404, message: 'Photo not found' })
  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  if (!isAdmin && photo.uploadedBy !== user.id) throw createError({ statusCode: 403, message: 'Forbidden' })
  if (!['rejected', 'needs_edit'].includes(photo.reviewStatus)) {
    throw createError({ statusCode: 409, message: 'Only rejected or needs-edit photos can be resubmitted' })
  }

  const updated = await updatePhotoState(id, {
    status: 'hidden',
    reviewStatus: 'pending',
    syncStatus: 'pending',
    syncError: null,
  })
  await logAudit(event, 'photo_resubmit', 'photo', id, photo, updated)

  return { success: true, data: presentPhoto(updated, { includeAdminMeta: true }), message: 'Photo resubmitted for review' }
})
