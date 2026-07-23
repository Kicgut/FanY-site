import { requireAdmin } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [aggregate, sync, thumbnails, visibility] = await Promise.all([
    prisma.photo.aggregate({ _count: { _all: true }, _sum: { fileSize: true } }),
    prisma.photo.groupBy({ by: ['syncStatus'], _count: { _all: true } }),
    prisma.photo.groupBy({ by: ['thumbnailStatus'], _count: { _all: true } }),
    prisma.photo.groupBy({ by: ['visibility'], _count: { _all: true } }),
  ])
  const counts = (rows: Array<{ [key: string]: any }>, key: string) => Object.fromEntries(rows.map((row) => [row[key], row._count._all]))
  return { success: true, data: { photoCount: aggregate._count._all, totalBytes: aggregate._sum.fileSize || 0, syncStatus: counts(sync, 'syncStatus'), thumbnailStatus: counts(thumbnails, 'thumbnailStatus'), visibility: counts(visibility, 'visibility') } }
})
