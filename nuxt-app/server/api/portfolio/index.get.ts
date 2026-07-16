export default defineEventHandler(async () => {
  const items = await prisma.portfolio.findMany({
    where: { status: 'published', reviewStatus: 'approved' },
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
  })
  return { success: true, data: items }
})
