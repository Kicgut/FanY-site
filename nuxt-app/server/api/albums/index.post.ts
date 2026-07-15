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

  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Album name is required' })
  }

  try {
    const album = await prisma.album.create({
      data: {
        name: body.name,
        description: body.description || null,
        coverUrl: body.coverUrl || null,
      },
    })

    return album
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'An album with this name already exists' })
    }
    throw createError({ statusCode: 500, message: 'Failed to create album' })
  }
})
