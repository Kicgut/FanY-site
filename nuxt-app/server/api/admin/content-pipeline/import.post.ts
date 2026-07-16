import { requireAdmin } from '~/server/utils/permission'
import { importTextCandidate, CONTENT_TYPE } from '~/server/services/content-pipeline'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file' && part.filename)
  if (!file?.data) throw createError({ statusCode: 400, message: 'file is required' })

  const typePart = parts?.find((part) => part.name === 'contentType')
  const contentType = typePart?.data?.toString('utf8') || CONTENT_TYPE.BLOG
  if (![CONTENT_TYPE.BLOG, CONTENT_TYPE.PORTFOLIO].map(String).includes(contentType)) {
    throw createError({ statusCode: 400, message: 'Invalid contentType' })
  }

  const candidate = await importTextCandidate(
    file.filename || 'import.txt',
    file.data.toString('utf8'),
    user.id,
    { contentType },
  )

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'import_content_candidate',
      resourceType: 'content_candidate',
      resourceId: String(candidate.id),
      afterJson: JSON.stringify({ filename: file.filename, contentType }),
    },
  })

  return { success: true, data: candidate }
})
