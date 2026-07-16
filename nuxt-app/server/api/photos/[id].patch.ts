import { requireAdmin } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (!id || Number.isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid photo ID' })
  const data: Record<string, string> = {}
  if (body.status && ['published', 'hidden', 'archived'].includes(body.status)) data.status = body.status
  if (body.visibility && ['public', 'friends', 'private'].includes(body.visibility)) data.visibility = body.visibility
  try { return { success: true, photo: await prisma.photo.update({ where: { id }, data }) } }
  catch (error: any) { if (error.code === 'P2025') throw createError({ statusCode: 404, message: 'Photo not found' }); throw createError({ statusCode: 500, message: 'Failed to update photo' }) }
})
