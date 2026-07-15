import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '~/server/utils/jwt'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  // Auth check
  const authHeader = getRequestHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  try {
    jwt.verify(authHeader.slice(7), getJwtSecret())
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  const formData = await readMultipartFormData(event)

  if (!formData?.length) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find((f) => f.name === 'file' || f.filename)
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'No file field found' })
  }

  const mimeType = file.type || ''
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw createError({
      statusCode: 400,
      message: 'Only jpg, png, gif, and webp files are allowed',
    })
  }

  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'File size exceeds 10MB limit' })
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  const ext = extMap[mimeType] || 'jpg'
  const filename = `${randomUUID()}.${ext}`

  const uploadDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const filePath = join(uploadDir, filename)
  await writeFile(filePath, file.data)

  return { url: `/uploads/${filename}` }
})
