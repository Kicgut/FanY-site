import { prisma } from '~/server/utils/db'

export const PORTFOLIO_TYPES = ['project', 'visual', 'tool'] as const
export const PORTFOLIO_STATUSES = ['draft', 'published', 'archived'] as const
export const REVIEW_STATUSES = ['pending', 'submitted', 'reviewing', 'approved', 'rejected', 'changes_requested'] as const

type PortfolioType = typeof PORTFOLIO_TYPES[number]

function jsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean)
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function jsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith('/')) return value.startsWith('//') ? null : value
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const allowed = (process.env.PORTFOLIO_RESOURCE_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
    if (allowed.length && !allowed.includes(url.hostname.toLowerCase())) return null
    return url.toString()
  } catch {
    return null
  }
}

function isPublicItem(item: any) {
  return item?.status === 'published' && item?.reviewStatus === 'approved'
}

function publicMedia(media: any) {
  const url = safeExternalUrl(media.publicUrl)
  if (!url || media.status !== 'ready') return null
  return {
    id: media.id,
    kind: media.kind,
    url,
    poster: safeExternalUrl(media.posterUrl),
    alt: media.alt || '',
    caption: media.caption || null,
    width: media.width || null,
    height: media.height || null,
    duration: media.duration || null,
    sortOrder: media.sortOrder,
  }
}

function publicResource(resource: any) {
  const url = safeExternalUrl(resource.url)
  if (!url) return null
  return {
    id: resource.id,
    kind: resource.kind,
    label: resource.label,
    url,
    external: resource.external,
    isPrimary: resource.isPrimary,
    sortOrder: resource.sortOrder,
  }
}

function publicBlock(block: any) {
  if (block.visibility !== 'published') return null
  let payload: unknown = {}
  try { payload = JSON.parse(block.payloadJson) } catch { return null }
  if (block.kind === 'embed' && (payload as any).url) {
    try {
      const host = new URL(String((payload as any).url)).hostname.toLowerCase()
      const allowed = (process.env.PORTFOLIO_EMBED_HOSTS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
      if (!allowed.length || !allowed.includes(host)) return null
    } catch { return null }
  }
  return { id: block.id, kind: block.kind, anchor: block.anchor, title: block.title, payload, sortOrder: block.sortOrder }
}

function capabilities(item: any, media: any[], blocks: any[], resources: any[], prompts: any[]) {
  const values = new Set<string>()
  if (blocks.some((block) => block.kind === 'code')) values.add('code')
  if (blocks.some((block) => block.kind === 'embed') || resources.some((resource) => resource.kind === 'demo')) values.add('interactive-demo')
  if (media.some((asset) => asset.kind === 'video')) values.add('video')
  if (media.some((asset) => ['image', 'gif'].includes(asset.kind))) values.add('gallery')
  if (item.type === 'tool' && prompts.length) { values.add('search'); values.add('copy') }
  if (resources.some((resource) => resource.kind === 'download')) values.add('download')
  return [...values]
}

function listItem(item: any) {
  const media = (item.media || []).map(publicMedia).filter(Boolean)
  const blocks = (item.blocks || []).map(publicBlock).filter(Boolean)
  const resources = (item.resources || []).map(publicResource).filter(Boolean)
  const prompts = (item.promptEntries || []).filter((entry: any) => entry.status === 'published')
  const cover = media.find((asset: any) => asset.kind === 'cover') || media[0] || null
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    type: PORTFOLIO_TYPES.includes(item.type as PortfolioType) ? item.type : 'project',
    cover,
    featured: item.featured,
    publishedAt: item.publishedAt || item.updatedAt || item.createdAt,
    updatedAt: item.updatedAt,
    labels: jsonArray(item.tags),
    capabilities: capabilities(item, media, blocks, resources, prompts),
    mediaSummary: { imageCount: media.filter((asset: any) => asset.kind === 'image').length, videoCount: media.filter((asset: any) => asset.kind === 'video').length, promptCount: prompts.length },
  }
}

const publicInclude = {
  media: { where: { status: 'ready' }, orderBy: { sortOrder: 'asc' as const } },
  resources: { orderBy: { sortOrder: 'asc' as const } },
  blocks: { where: { visibility: 'published' }, orderBy: { sortOrder: 'asc' as const } },
  promptEntries: { where: { status: 'published' }, include: { tags: true }, orderBy: { sortOrder: 'asc' as const } },
}

const adminInclude = {
  media: { orderBy: { sortOrder: 'asc' as const } },
  resources: { orderBy: { sortOrder: 'asc' as const } },
  blocks: { orderBy: { sortOrder: 'asc' as const } },
  promptEntries: { include: { tags: true }, orderBy: { sortOrder: 'asc' as const } },
}

export async function getPublicPortfolioList(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(24, Math.max(1, Number(query.pageSize) || 12))
  const q = String(query.q || '').trim()
  const type = String(query.type || '').trim()
  const year = Number(query.year) || undefined
  const media = String(query.media || '').trim()
  const tag = String(query.tag || '').trim()
  const where: any = { status: 'published', reviewStatus: 'approved' }
  if (PORTFOLIO_TYPES.includes(type as PortfolioType)) where.type = type
  if (year) where.year = year
  if (tag) where.tags = { contains: tag }
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }, { tags: { contains: q } }, { techStackJson: { contains: q } }, { type: { contains: q } }]
  if (media === 'video' || media === 'image' || media === 'gif') where.media = { some: { kind: media, status: 'ready' } }
  if (media === 'code' || media === 'embed') where.blocks = { some: { kind: media, visibility: 'published' } }
  const sort = String(query.sort || 'featured')
  const orderBy = sort === 'updated'
    ? [{ updatedAt: 'desc' as const }, { id: 'desc' as const }]
    : sort === 'published'
      ? [{ publishedAt: 'desc' as const }, { id: 'desc' as const }]
      : [{ featured: 'desc' as const }, { order: 'asc' as const }, { updatedAt: 'desc' as const }]
  const [items, total] = await prisma.$transaction([
    prisma.portfolio.findMany({ where, include: publicInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.portfolio.count({ where }),
  ])
  const facetItems: any[] = await prisma.portfolio.findMany({ where, select: { type: true, year: true, tags: true, media: { where: { status: 'ready' }, select: { kind: true } } } })
  const typeCounts = new Map<string, number>()
  const mediaCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  const years = new Set<number>()
  for (const facet of facetItems) {
    if (facet.type) typeCounts.set(facet.type, (typeCounts.get(facet.type) || 0) + 1)
    if (facet.year) years.add(facet.year)
    for (const tagName of jsonArray(facet.tags)) tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1)
    for (const asset of facet.media || []) mediaCounts.set(asset.kind, (mediaCounts.get(asset.kind) || 0) + 1)
  }
  return { items: items.map(listItem), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, filters: { types: [...typeCounts].map(([value, count]) => ({ value, count })), media: [...mediaCounts].map(([value, count]) => ({ value, count })), years: [...years].sort((a, b) => b - a), tags: [...tagCounts].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count })) } }
}

export async function getPublicPortfolio(slug: string) {
  const item: any = await prisma.portfolio.findFirst({ where: { slug, status: 'published', reviewStatus: 'approved' }, include: publicInclude })
  if (!item || !isPublicItem(item)) return null
  const media = (item.media || []).map(publicMedia).filter(Boolean)
  const blocks = (item.blocks || []).map(publicBlock).filter(Boolean)
  const resources = (item.resources || []).map(publicResource).filter(Boolean)
  const prompts = (item.promptEntries || []).filter((entry: any) => entry.status === 'published').map((entry: any) => ({ id: entry.id, slug: entry.slug, title: entry.title, category: entry.category, summary: entry.summary, tags: (entry.tags || []).map((tag: any) => tag.name), updatedAt: entry.updatedAt }))
  const tags = jsonArray(item.tags)
  const relatedRaw: any[] = await prisma.portfolio.findMany({ where: { status: 'published', reviewStatus: 'approved', id: { not: item.id }, type: item.type }, include: publicInclude, orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }], take: 3 })
  return {
    ...listItem(item),
    status: item.displayStatus || 'experiment',
    facts: { period: item.year ? String(item.year) : undefined, roles: jsonArray(item.rolesJson), techStack: jsonArray(item.techStackJson), medium: jsonArray(item.mediumJson), location: item.location || undefined },
    resources,
    blocks,
    media,
    promptVault: item.type === 'tool' ? { mode: item.toolMode || 'prompt_vault', count: prompts.length, categories: [...new Set(prompts.map((entry: any) => entry.category).filter(Boolean))], entries: prompts } : undefined,
    tags,
    related: relatedRaw.map(listItem),
  }
}

export async function getPublicPromptEntry(slug: string, entrySlug: string) {
  const entry: any = await prisma.portfolioPromptEntry.findFirst({ where: { slug: entrySlug, status: 'published', portfolio: { slug, type: 'tool', status: 'published', reviewStatus: 'approved' } }, include: { tags: true } })
  if (!entry) return null
  return { id: entry.id, slug: entry.slug, title: entry.title, category: entry.category, summary: entry.summary, body: entry.body, variables: jsonObject(entry.variablesJson), examples: jsonObject(entry.examplesJson), riskLevel: entry.riskLevel, tags: entry.tags.map((tag: any) => tag.name), updatedAt: entry.updatedAt }
}

export async function getPublicPortfolioMedia(slug: string, query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(48, Math.max(1, Number(query.pageSize) || 18))
  const portfolio = await prisma.portfolio.findFirst({ where: { slug, type: 'visual', status: 'published', reviewStatus: 'approved' }, select: { id: true } })
  if (!portfolio) return null
  const where = { portfolioId: portfolio.id, status: 'ready' }
  const [rows, total] = await prisma.$transaction([
    prisma.portfolioMedia.findMany({ where, orderBy: { sortOrder: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.portfolioMedia.count({ where }),
  ])
  return { items: rows.map(publicMedia).filter(Boolean), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}

export async function createPortfolioDraft(input: any, actorId: number) {
  const title = String(input.title || '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'title is required' })
  const type = PORTFOLIO_TYPES.includes(input.type) ? input.type : 'project'
  const slug = String(input.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 120) || `portfolio-${Date.now()}`
  const item = await prisma.portfolio.create({ data: { title, slug, type, status: 'draft', reviewStatus: 'pending', createdBy: String(actorId), version: 1 } })
  return item
}

export async function listAdminPortfolios(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  const where: any = {}
  const q = String(query.q || '').trim()
  if (q) where.OR = [{ title: { contains: q } }, { slug: { contains: q } }]
  if (query.type && PORTFOLIO_TYPES.includes(String(query.type) as PortfolioType)) where.type = String(query.type)
  if (query.status && PORTFOLIO_STATUSES.includes(String(query.status) as any)) where.status = String(query.status)
  if (query.reviewStatus && REVIEW_STATUSES.includes(String(query.reviewStatus) as any)) where.reviewStatus = String(query.reviewStatus)
  const [items, total] = await prisma.$transaction([
    prisma.portfolio.findMany({ where, include: adminInclude, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.portfolio.count({ where }),
  ])
  return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}

export async function getAdminPortfolio(id: number) {
  return prisma.portfolio.findUnique({ where: { id }, include: adminInclude })
}

function publishValidation(item: any) {
  const errors: string[] = []
  if (!item.title?.trim()) errors.push('title is required')
  if (!item.slug?.trim()) errors.push('slug is required')
  if (!PORTFOLIO_TYPES.includes(item.type as PortfolioType)) errors.push('type is invalid')
  const readyMedia = (item.media || []).filter((media: any) => media.status === 'ready' && safeExternalUrl(media.publicUrl))
  if (!readyMedia.length) errors.push('cover or ready media is required')
  if (item.type === 'visual' && !readyMedia.some((media: any) => ['image', 'video', 'gif'].includes(media.kind))) errors.push('visual work needs public media')
  for (const media of readyMedia) {
    if (!media.alt) errors.push(`media ${media.id} needs alt text`)
    if (!media.mimeType || !media.sizeBytes || media.sizeBytes <= 0) errors.push(`media ${media.id} needs MIME type and file size`)
    if (media.derivativeStatus !== 'ready') errors.push(`media ${media.id} derivatives are not ready`)
    if (['image', 'gif'].includes(media.kind) && (!media.width || !media.height)) errors.push(`media ${media.id} needs dimensions`)
    if (['video', 'gif'].includes(media.kind) && !media.posterUrl) errors.push(`media ${media.id} needs poster`)
    if (media.kind === 'video' && !media.duration) errors.push(`video ${media.id} needs duration`)
  }
  if (item.type === 'tool' && !(item.promptEntries || []).some((entry: any) => entry.status === 'published')) errors.push('tool work needs at least one published entry')
  if (item.type === 'project' && !(item.blocks || []).some((block: any) => block.kind === 'richText' && block.visibility === 'published')) errors.push('project work needs narrative content')
  const anchors = new Set<string>()
  for (const block of item.blocks || []) {
    let payload: any = {}
    try { payload = JSON.parse(block.payloadJson || '{}') } catch { errors.push(`block ${block.id} has invalid JSON`); continue }
    if (block.anchor) { if (anchors.has(block.anchor)) errors.push(`duplicate block anchor: ${block.anchor}`); anchors.add(block.anchor) }
    if (block.kind === 'code' && (!payload.language || !payload.filename)) errors.push(`code block ${block.id} needs language and filename`)
    if (block.kind === 'comparison' && (!payload.beforeMediaId || !payload.afterMediaId)) errors.push(`comparison block ${block.id} needs before/after media`)
    if (block.kind === 'embed' && payload.url) {
      try { const host = new URL(payload.url).hostname.toLowerCase(); const allowed = (process.env.PORTFOLIO_EMBED_HOSTS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean); if (allowed.length && !allowed.includes(host)) errors.push(`embed host is not allowlisted: ${host}`) } catch { errors.push(`embed block ${block.id} has invalid URL`) }
    }
  }
  return errors
}

export async function transitionPortfolio(id: number, action: string, note?: string) {
  const item: any = await getAdminPortfolio(id)
  if (!item) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  if (action === 'submit') {
    if (item.status !== 'draft' || !['pending', 'changes_requested'].includes(item.reviewStatus)) throw createError({ statusCode: 409, message: 'Portfolio cannot be submitted from its current state' })
    return prisma.portfolio.update({ where: { id }, data: { reviewStatus: 'submitted', version: { increment: 1 } } })
  }
  if (action === 'approve' || action === 'reject' || action === 'request_changes') {
    if (!['submitted', 'reviewing'].includes(item.reviewStatus)) throw createError({ statusCode: 409, message: 'Portfolio is not awaiting review' })
    return prisma.portfolio.update({ where: { id }, data: { reviewStatus: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested', version: { increment: 1 } } })
  }
  if (action === 'publish') {
    if (item.reviewStatus !== 'approved' || item.status !== 'draft') throw createError({ statusCode: 409, message: 'Only an approved draft can be published' })
    const errors = publishValidation(item)
    if (errors.length) throw createError({ statusCode: 422, message: 'Portfolio is not ready to publish', data: { errors } })
    return prisma.portfolio.update({ where: { id }, data: { status: 'published', publishedAt: new Date(), archivedAt: null, version: { increment: 1 } } })
  }
  if (action === 'unpublish') {
    if (item.status !== 'published') throw createError({ statusCode: 409, message: 'Portfolio is not published' })
    return prisma.portfolio.update({ where: { id }, data: { status: 'draft', publishedAt: null, reviewStatus: 'approved', version: { increment: 1 } } })
  }
  if (action === 'archive') return prisma.portfolio.update({ where: { id }, data: { status: 'archived', archivedAt: new Date(), publishedAt: null, version: { increment: 1 } } })
  throw createError({ statusCode: 400, message: `Unsupported portfolio action: ${action}` })
}

export async function savePortfolioDraft(id: number, input: any) {
  const current: any = await prisma.portfolio.findUnique({ where: { id }, include: { resources: true, blocks: true } })
  if (!current) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  if (input.version != null && Number(input.version) !== current.version) throw createError({ statusCode: 409, message: 'Portfolio has changed; reload before saving' })
  const type = PORTFOLIO_TYPES.includes(input.type) ? input.type : current.type
  const update: any = {
    title: String(input.title ?? current.title).trim(), slug: String(input.slug ?? current.slug).trim(), description: input.description ?? current.description,
    tags: Array.isArray(input.tags) ? input.tags.join(',') : (input.tags ?? current.tags), category: input.category ?? current.category,
    featured: input.featured == null ? current.featured : Boolean(input.featured), order: input.order == null ? current.order : Number(input.order), type,
    displayStatus: input.displayStatus ?? current.displayStatus, year: input.year == null ? current.year : Number(input.year), rolesJson: JSON.stringify(input.roles || jsonArray(current.rolesJson)), techStackJson: JSON.stringify(input.techStack || jsonArray(current.techStackJson)), mediumJson: JSON.stringify(input.medium || jsonArray(current.mediumJson)), location: input.location ?? current.location, toolMode: type === 'tool' ? (input.toolMode || current.toolMode || 'prompt_vault') : null,
    version: { increment: 1 },
  }
  const item = await prisma.portfolio.update({ where: { id }, data: update })
  return item
}

export async function createPortfolioMedia(portfolioId: number, input: any) {
  const portfolio = await prisma.portfolio.findUnique({ where: { id: portfolioId }, select: { id: true } })
  if (!portfolio) throw createError({ statusCode: 404, message: 'Portfolio not found' })
  const publicUrl = safeExternalUrl(input.publicUrl)
  if (!publicUrl) throw createError({ statusCode: 422, message: 'publicUrl must be a safe http(s) or local URL' })
  const kind = ['image', 'video', 'gif', 'cover'].includes(String(input.kind)) ? String(input.kind) : 'image'
  const alt = String(input.alt || '').trim()
  const validReady = input.status === 'ready' && alt && input.mimeType && Number(input.sizeBytes) > 0 && input.derivativeStatus === 'ready' && ((kind === 'video' && input.posterUrl && Number(input.duration) > 0) || (['image', 'gif'].includes(kind) && Number(input.width) > 0 && Number(input.height) > 0 && (kind === 'image' || input.posterUrl)) || kind === 'cover')
  const status = validReady ? 'ready' : 'draft'
  return prisma.portfolioMedia.create({ data: {
    portfolioId, kind, publicUrl, mimeType: input.mimeType ? String(input.mimeType).trim() : null, sizeBytes: input.sizeBytes == null ? null : Number(input.sizeBytes), derivativeStatus: input.derivativeStatus || 'pending', posterUrl: safeExternalUrl(input.posterUrl), alt: String(input.alt || '').trim() || null,
    caption: String(input.caption || '').trim() || null, width: input.width == null ? null : Number(input.width), height: input.height == null ? null : Number(input.height),
    duration: input.duration == null ? null : Number(input.duration), sortOrder: Number(input.sortOrder) || 0, status,
  } })
}

export async function updatePortfolioMedia(id: number, input: any) {
  const current = await prisma.portfolioMedia.findUnique({ where: { id } })
  if (!current) throw createError({ statusCode: 404, message: 'Media not found' })
  const publicUrl = input.publicUrl == null ? current.publicUrl : safeExternalUrl(input.publicUrl)
  if (!publicUrl) throw createError({ statusCode: 422, message: 'publicUrl must be a safe http(s) or local URL' })
  const alt = input.alt == null ? current.alt : String(input.alt).trim() || null
  const kind = current.kind
  const mimeType = input.mimeType == null ? current.mimeType : String(input.mimeType).trim() || null
  const sizeBytes = input.sizeBytes == null ? current.sizeBytes : Number(input.sizeBytes)
  const derivativeStatus = input.derivativeStatus == null ? current.derivativeStatus : input.derivativeStatus
  const validReady = input.status === 'ready' && alt && mimeType && Number(sizeBytes) > 0 && derivativeStatus === 'ready' && ((kind === 'video' && (input.posterUrl || current.posterUrl) && Number(input.duration || current.duration) > 0) || (['image', 'gif'].includes(kind) && Number(input.width || current.width) > 0 && Number(input.height || current.height) > 0 && (kind === 'image' || input.posterUrl || current.posterUrl)) || kind === 'cover')
  const status = validReady ? 'ready' : (input.status === 'draft' ? 'draft' : current.status)
  return prisma.portfolioMedia.update({ where: { id }, data: { publicUrl, mimeType, sizeBytes, derivativeStatus, posterUrl: input.posterUrl == null ? current.posterUrl : safeExternalUrl(input.posterUrl), alt, caption: input.caption == null ? current.caption : String(input.caption).trim() || null, status, sortOrder: input.sortOrder == null ? current.sortOrder : Number(input.sortOrder) } })
}

export async function listAdminPromptEntries(portfolioId: number) {
  return prisma.portfolioPromptEntry.findMany({ where: { portfolioId }, include: { tags: true }, orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }] })
}

export async function listAdminBlocks(portfolioId: number) { return prisma.portfolioBlock.findMany({ where: { portfolioId }, orderBy: { sortOrder: 'asc' } }) }
export async function saveAdminBlock(portfolioId: number, input: any, id?: number) {
  const data = { kind: input.kind, anchor: input.anchor || null, title: input.title || null, payloadJson: JSON.stringify(input.payload || {}), sortOrder: Number(input.sortOrder) || 0, visibility: input.visibility || 'draft' }
  if (id) return prisma.portfolioBlock.update({ where: { id }, data })
  return prisma.portfolioBlock.create({ data: { ...data, portfolioId } })
}
export async function saveAdminResource(portfolioId: number, input: any, id?: number) {
  const url = safeExternalUrl(input.url)
  if (!url) throw createError({ statusCode: 422, message: 'Resource URL is not allowlisted' })
  const data = { kind: input.kind, label: input.label, url, external: input.external !== false, sortOrder: Number(input.sortOrder) || 0, isPrimary: Boolean(input.isPrimary) }
  return prisma.$transaction(async (tx) => {
    if (data.isPrimary) await tx.portfolioResource.updateMany({ where: { portfolioId, ...(id ? { id: { not: id } } : {}) }, data: { isPrimary: false } })
    if (id) return tx.portfolioResource.update({ where: { id }, data })
    return tx.portfolioResource.create({ data: { ...data, portfolioId } })
  })
}

export async function saveAdminPromptEntry(portfolioId: number, input: any, id?: number) {
  const data = { title: input.title, slug: input.slug, category: input.category || null, summary: input.summary || null, body: input.body, variablesJson: input.variables ? JSON.stringify(input.variables) : null, examplesJson: input.examples ? JSON.stringify(input.examples) : null, riskLevel: input.riskLevel || 'low', sortOrder: Number(input.sortOrder) || 0, status: input.status || 'draft' }
  const entry: any = id
    ? await prisma.portfolioPromptEntry.update({ where: { id }, data })
    : await prisma.portfolioPromptEntry.create({ data: { ...data, portfolioId } })
  if (Array.isArray(input.tags)) {
    await prisma.portfolioPromptTag.deleteMany({ where: { promptEntryId: entry.id } })
    if (input.tags.length) await prisma.portfolioPromptTag.createMany({ data: input.tags.map((name: string) => ({ promptEntryId: entry.id, name })) })
  }
  return prisma.portfolioPromptEntry.findUnique({ where: { id: entry.id }, include: { tags: true } })
}
