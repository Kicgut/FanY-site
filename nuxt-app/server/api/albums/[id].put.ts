import jwt from 'jsonwebtoken'
import { getJwtSecret } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  try {
    jwt.verify(authHeader.slice(7), getJwtSecret())
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid album ID' })
  }

  const body = await readBody(event)

  try {
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.coverUrl !== undefined) updateData.coverUrl = body.coverUrl
    if (body.visibility !== undefined && ['public', 'friends', 'private'].includes(body.visibility)) {
      updateData.visibility = body.visibility
    }
    if (body.visibleTo !== undefined) updateData.visibleTo = body.visibleTo

    const album = await prisma.album.update({
      where: { id },
      data: updateData,
    })

    return album
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Album not found' })
    }
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'An album with this name already exists' })
    }
    throw createError({ statusCode: 500, message: 'Failed to update album' })
  }
})
