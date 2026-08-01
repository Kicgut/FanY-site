import { getPublicPortfolio, getPublicPromptEntry } from '~/server/services/portfolio'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const item = await getPublicPortfolio(slug)
  if (!item || item.type !== 'tool') throw createError({ statusCode: 404, message: '工具作品不存在' })
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(24, Math.max(1, Number(query.pageSize) || 12))
  const q = String(query.q || '').trim()
  const category = String(query.category || '').trim()
  const tag = String(query.tag || '').trim()
  const where: any = { status: 'published', portfolio: { slug, type: 'tool', status: 'published', reviewStatus: 'approved' } }
  if (category) where.category = category
  if (tag) where.tags = { some: { name: tag } }
  if (q) where.OR = [{ title: { contains: q } }, { summary: { contains: q } }, { body: { contains: q } }, { tags: { some: { name: { contains: q } } } }]
  const [entries, total] = await prisma.$transaction([
    prisma.portfolioPromptEntry.findMany({ where, include: { tags: true }, orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.portfolioPromptEntry.count({ where }),
  ])
  return { success: true, data: { items: entries.map((entry: any) => ({ id: entry.id, slug: entry.slug, title: entry.title, category: entry.category, summary: entry.summary, tags: entry.tags.map((entryTag: any) => entryTag.name), updatedAt: entry.updatedAt })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } } }
})
