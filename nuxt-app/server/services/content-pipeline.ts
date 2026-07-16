import { prisma } from '~/server/utils/db'
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

export const CANDIDATE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export const CONTENT_PIPELINE_ROOT = resolve(process.cwd(), 'data', 'content-pipeline')
export const INBOX_DIR = join(CONTENT_PIPELINE_ROOT, '00_inbox')
export const RAW_DIR = join(CONTENT_PIPELINE_ROOT, '01_raw')
export const PROCESSED_DIR = join(CONTENT_PIPELINE_ROOT, '02_processed')
export const CANDIDATES_DIR = join(CONTENT_PIPELINE_ROOT, '03_candidates')
export const REVIEW_DIR = join(CONTENT_PIPELINE_ROOT, '04_review')
export const PUBLISHED_DIR = join(CONTENT_PIPELINE_ROOT, '05_published')
export const ARCHIVE_DIR = join(CONTENT_PIPELINE_ROOT, '06_archive')
export const SYSTEM_DIR = join(CONTENT_PIPELINE_ROOT, '_system')

export const CANDIDATE_SOURCE = {
  AI_CHAT: 'ai_chat',
  HERMES: 'hermes',
  MANUAL: 'manual',
  IMPORT: 'import',
} as const

export const CONTENT_TYPE = {
  BLOG: 'blog',
  PORTFOLIO: 'portfolio',
  KNOWLEDGE: 'knowledge',
} as const

export const REVIEW_ACTION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_CHANGES: 'request_changes',
} as const

export const APPROVE_TARGET = {
  BLOG: 'blog',
  PORTFOLIO: 'portfolio',
} as const

export interface CandidateInput {
  title: string
  content: string
  description?: string
  slug?: string
  contentType?: string
  source?: string
  tags?: string[]
  sourceRef?: string
  suggestedVisibility?: string
  riskLevel?: string
}

export interface CandidateFilters {
  status?: string
  source?: string
  contentType?: string
  createdBy?: number
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled'
}

function tagsJson(tags?: string[]): string | null {
  return tags?.length ? JSON.stringify([...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]) : null
}

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

async function ensurePipelineDirectories() {
  await Promise.all([
    INBOX_DIR,
    RAW_DIR,
    PROCESSED_DIR,
    CANDIDATES_DIR,
    REVIEW_DIR,
    PUBLISHED_DIR,
    ARCHIVE_DIR,
    SYSTEM_DIR,
    join(INBOX_DIR, 'conversations'),
  ].map((directory) => mkdir(directory, { recursive: true })))
}

function safePipelineName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'untitled.md'
}

function renderFrontmatter(data: Record<string, string | number | string[] | null | undefined>, body: string) {
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? JSON.stringify(value) : JSON.stringify(value)}`)
  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`
}

function parseTextDocument(filename: string, content: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  const frontmatter: Record<string, string> = {}
  let body = content
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(':')
      if (separator < 1) continue
      const key = line.slice(0, separator).trim()
      let value = line.slice(separator + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      frontmatter[key] = value
    }
    body = match[2]
  }
  const title = frontmatter.title?.trim() || basename(filename, extname(filename)).replace(/[-_]+/g, ' ').trim() || 'Imported content'
  const tags = frontmatter.tags
    ? frontmatter.tags.replace(/[\[\]"]/g, '').split(',').map((tag) => tag.trim()).filter(Boolean)
    : []
  return { title, description: frontmatter.description, contentType: frontmatter.type || frontmatter.contentType, tags, body: body.trim() }
}

export async function writeCandidateArtifact(candidate: any) {
  await ensurePipelineDirectories()
  const filename = `candidate-${candidate.id}.md`
  const file = join(CANDIDATES_DIR, filename)
  await writeFile(file, renderFrontmatter({
    id: candidate.id,
    title: candidate.title,
    type: candidate.contentType,
    source: candidate.source,
    status: candidate.status,
    version: candidate.version,
    suggestedVisibility: candidate.suggestedVisibility,
    riskLevel: candidate.riskLevel,
    createdAt: candidate.createdAt?.toISOString?.() || candidate.createdAt,
    updatedAt: candidate.updatedAt?.toISOString?.() || candidate.updatedAt,
  }, candidate.content), 'utf8')
  return file
}

export async function saveConversationMarkdown(
  userId: number,
  conversationId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
) {
  await ensurePipelineDirectories()
  const safeId = safePipelineName(conversationId)
  const body = messages.map((message) => `## ${message.role === 'user' ? 'User' : 'Assistant'}\n\n${message.content.trim()}`).join('\n\n')
  const file = join(INBOX_DIR, 'conversations', `${safeId}.md`)
  await writeFile(file, renderFrontmatter({
    conversationId,
    userId,
    source: CANDIDATE_SOURCE.AI_CHAT,
    status: 'raw',
    private: 'true',
    updatedAt: new Date().toISOString(),
  }, body), 'utf8')
  return file
}

export interface InboxProcessResult {
  processed: number
  skipped: number
  candidates: number[]
  errors: Array<{ file: string; message: string }>
}

export async function processInbox(actorId?: number): Promise<InboxProcessResult> {
  await ensurePipelineDirectories()
  const result: InboxProcessResult = { processed: 0, skipped: 0, candidates: [], errors: [] }
  const sources = [
    { directory: INBOX_DIR, moveToRaw: true },
    { directory: RAW_DIR, moveToRaw: false },
  ]
  for (const source of sources) {
    const entries = await readdir(source.directory, { withFileTypes: true })
    for (const entry of entries) {
    if (!entry.isFile() || !/\.(md|markdown|txt)$/i.test(entry.name)) continue
    const sourcePath = join(source.directory, entry.name)
    const safeName = safePipelineName(entry.name)
    const rawPath = join(RAW_DIR, safeName)
    try {
      const original = await readFile(sourcePath, 'utf8')
      const parsed = parseTextDocument(entry.name, original)
      if (!parsed.body) {
        result.skipped++
        continue
      }

      const sourceRef = `raw:${safeName}`
      const existing = await prisma.contentCandidate.findFirst({
        where: { OR: [{ sourceRef }, { sourceRef: `inbox:${entry.name}` }] },
      })
      if (source.moveToRaw) await rename(sourcePath, rawPath)
      await writeFile(join(PROCESSED_DIR, safeName), renderFrontmatter({
        title: parsed.title,
        type: parsed.contentType || CONTENT_TYPE.BLOG,
        source: CANDIDATE_SOURCE.HERMES,
        status: 'processed',
        rawFile: safeName,
        processedAt: new Date().toISOString(),
      }, parsed.body), 'utf8')
      if (!existing) {
        const candidate = await createCandidate({
          title: parsed.title,
          content: parsed.body,
          description: parsed.description,
          contentType: parsed.contentType || CONTENT_TYPE.BLOG,
          source: CANDIDATE_SOURCE.HERMES,
          sourceRef,
          tags: parsed.tags,
          suggestedVisibility: 'private',
          riskLevel: 'medium',
        }, actorId)
        await writeCandidateArtifact(candidate)
        result.candidates.push(candidate.id)
        result.processed++
      } else {
        result.processed++
      }
    } catch (error: any) {
      result.errors.push({ file: relative(CONTENT_PIPELINE_ROOT, sourcePath), message: error?.message || 'Processing failed' })
    }
    }
  }
  return result
}

export async function enqueueInboxProcessingJob(actorId?: number) {
  return prisma.job.create({
    data: {
      type: 'content_pipeline_daily',
      status: 'pending',
      payload: JSON.stringify({ source: 'admin', directories: ['00_inbox', '01_raw'] }),
      createdBy: actorId || null,
      availableAt: new Date(),
    },
  })
}

export async function runInboxProcessingJob(jobId: number, actorId?: number) {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job || job.type !== 'content_pipeline_daily') {
    throw createError({ statusCode: 404, message: 'Content pipeline job not found' })
  }
  if (job.status === 'completed') return job

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'running', attempts: { increment: 1 }, startedAt: new Date(), error: null },
  })
  try {
    const result = await processInbox(actorId || job.createdBy || undefined)
    return prisma.job.update({
      where: { id: jobId },
      data: { status: result.errors.length ? 'completed_with_errors' : 'completed', result: JSON.stringify(result), finishedAt: new Date() },
    })
  } catch (error: any) {
    return prisma.job.update({
      where: { id: jobId },
      data: { status: 'failed', error: error?.message || 'Content pipeline job failed', finishedAt: new Date() },
    })
  }
}

function publicCandidate(candidate: any) {
  return {
    ...candidate,
    tags: parseTags(candidate.tagsJson),
    tagsJson: undefined,
  }
}

function assertInput(input: CandidateInput) {
  if (!input.title?.trim()) throw createError({ statusCode: 400, message: 'title is required' })
  if (!input.content?.trim()) throw createError({ statusCode: 400, message: 'content is required' })
  if (input.content.length > 200_000) {
    throw createError({ statusCode: 400, message: 'content is too large' })
  }
  if (input.contentType && !Object.values(CONTENT_TYPE).includes(input.contentType as any)) {
    throw createError({ statusCode: 400, message: 'invalid contentType' })
  }
}

export async function createCandidate(input: CandidateInput, actorId?: number) {
  assertInput(input)
  const candidate = await prisma.$transaction(async (tx) => {
    const created = await tx.contentCandidate.create({
      data: {
        title: input.title.trim(),
        slug: input.slug?.trim() || slugify(input.title),
        content: input.content,
        description: input.description?.trim() || null,
        contentType: input.contentType || CONTENT_TYPE.BLOG,
        source: input.source || CANDIDATE_SOURCE.MANUAL,
        status: CANDIDATE_STATUS.DRAFT,
        tagsJson: tagsJson(input.tags),
        sourceRef: input.sourceRef || null,
        suggestedVisibility: input.suggestedVisibility || 'private',
        riskLevel: input.riskLevel || 'low',
        createdBy: actorId || null,
      },
    })

    await tx.contentRevision.create({
      data: {
        candidateId: created.id,
        version: 1,
        title: created.title,
        slug: created.slug,
        content: created.content,
        description: created.description,
        tagsJson: created.tagsJson,
        createdBy: actorId || null,
      },
    })

    return created
  })

  await writeCandidateArtifact(candidate)
  return publicCandidate(candidate)
}

export async function importTextCandidate(
  filename: string,
  content: string,
  actorId?: number,
  metadata: Partial<CandidateInput> = {},
) {
  if (!filename || !content.trim()) {
    throw createError({ statusCode: 400, message: 'A non-empty text file is required' })
  }
  if (content.length > 200_000) {
    throw createError({ statusCode: 400, message: 'Import file is too large' })
  }

  await mkdir(INBOX_DIR, { recursive: true })
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'import.txt'
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`
  await writeFile(join(INBOX_DIR, storedName), content, 'utf8')

  const title = metadata.title || filename.replace(/\.(md|markdown|txt)$/i, '') || 'Imported content'
  return createCandidate({
    ...metadata,
    title,
    content,
    source: CANDIDATE_SOURCE.IMPORT,
    sourceRef: `inbox:${storedName}`,
    contentType: metadata.contentType || CONTENT_TYPE.BLOG,
  }, actorId)
}

export async function listCandidates(filters: CandidateFilters = {}) {
  const where: any = {}
  if (filters.status) where.status = filters.status
  if (filters.source) where.source = filters.source
  if (filters.contentType) where.contentType = filters.contentType
  if (filters.createdBy) where.createdBy = filters.createdBy

  const candidates = await prisma.contentCandidate.findMany({
    where,
    include: { publications: true },
    orderBy: { updatedAt: 'desc' },
  })
  return candidates.map(publicCandidate)
}

export async function getCandidate(candidateId: number) {
  const candidate = await prisma.contentCandidate.findUnique({
    where: { id: candidateId },
    include: {
      revisions: { orderBy: { version: 'desc' } },
      publications: true,
    },
  })
  return candidate ? publicCandidate(candidate) : null
}

export async function updateCandidate(candidateId: number, input: CandidateInput, actorId?: number) {
  assertInput(input)
  const current = await prisma.contentCandidate.findUnique({ where: { id: candidateId } })
  if (!current) throw createError({ statusCode: 404, message: 'Candidate not found' })
  if (![CANDIDATE_STATUS.DRAFT, CANDIDATE_STATUS.CHANGES_REQUESTED].includes(current.status as any)) {
    throw createError({ statusCode: 409, message: 'Only draft candidates can be edited' })
  }

  const version = current.version + 1
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.contentCandidate.update({
      where: { id: candidateId },
      data: {
        title: input.title.trim(),
        slug: input.slug?.trim() || slugify(input.title),
        content: input.content,
        description: input.description?.trim() || null,
        contentType: input.contentType || current.contentType,
        tagsJson: tagsJson(input.tags),
        version,
        status: CANDIDATE_STATUS.DRAFT,
        reviewNote: null,
      },
    })
    await tx.contentRevision.create({
      data: {
        candidateId,
        version,
        title: result.title,
        slug: result.slug,
        content: result.content,
        description: result.description,
        tagsJson: result.tagsJson,
        createdBy: actorId || null,
      },
    })
    return result
  })

  await writeCandidateArtifact(updated)
  return publicCandidate(updated)
}

export async function submitCandidate(candidateId: number, actorId?: number) {
  const candidate = await prisma.contentCandidate.findUnique({ where: { id: candidateId } })
  if (!candidate) throw createError({ statusCode: 404, message: 'Candidate not found' })
  if (![CANDIDATE_STATUS.DRAFT, CANDIDATE_STATUS.CHANGES_REQUESTED].includes(candidate.status as any)) {
    throw createError({ statusCode: 409, message: 'Candidate cannot be submitted from its current state' })
  }
  const updated = await prisma.contentCandidate.update({
    where: { id: candidateId },
    data: { status: CANDIDATE_STATUS.SUBMITTED, createdBy: candidate.createdBy || actorId || null },
  })
  await writeCandidateArtifact(updated)
  return publicCandidate(updated)
}

export async function reviewCandidate(
  candidateId: number,
  action: string,
  actorId: number,
  note?: string,
) {
  const candidate = await prisma.contentCandidate.findUnique({ where: { id: candidateId } })
  if (!candidate) throw createError({ statusCode: 404, message: 'Candidate not found' })
  if (![CANDIDATE_STATUS.SUBMITTED, CANDIDATE_STATUS.REVIEWING].includes(candidate.status as any)) {
    throw createError({ statusCode: 409, message: 'Candidate is not awaiting review' })
  }

  const status = action === REVIEW_ACTION.APPROVE
    ? CANDIDATE_STATUS.APPROVED
    : action === REVIEW_ACTION.REJECT
      ? CANDIDATE_STATUS.REJECTED
      : action === REVIEW_ACTION.REQUEST_CHANGES
        ? CANDIDATE_STATUS.CHANGES_REQUESTED
        : null
  if (!status) throw createError({ statusCode: 400, message: 'Invalid review action' })

  const updated = await prisma.contentCandidate.update({
    where: { id: candidateId },
    data: {
      status,
      reviewedBy: actorId,
      reviewNote: note?.trim() || null,
    },
  })
  await writeCandidateArtifact(updated)
  return publicCandidate(updated)
}

export async function publishCandidate(candidateId: number, target: string, actorId: number) {
  if (![APPROVE_TARGET.BLOG, APPROVE_TARGET.PORTFOLIO].includes(target as any)) {
    throw createError({ statusCode: 400, message: 'Invalid publish target' })
  }

  const candidate = await prisma.contentCandidate.findUnique({ where: { id: candidateId } })
  if (!candidate) throw createError({ statusCode: 404, message: 'Candidate not found' })
  if (candidate.status !== CANDIDATE_STATUS.APPROVED) {
    throw createError({ statusCode: 409, message: 'Only approved candidates can be published' })
  }

  const slug = candidate.slug || slugify(candidate.title)
  const tags = parseTags(candidate.tagsJson)

  const existing = target === APPROVE_TARGET.BLOG
    ? await prisma.article.findUnique({ where: { slug } })
    : await prisma.portfolio.findUnique({ where: { slug } })
  if (existing) {
    throw createError({ statusCode: 409, message: `Slug already exists: ${slug}` })
  }

  return prisma.$transaction(async (tx) => {
    if (target === APPROVE_TARGET.BLOG) {
      const article = await tx.article.create({
        data: {
          title: candidate.title,
          slug,
          content: candidate.content,
          description: candidate.description,
          status: 'draft',
          tags: tags.length ? {
            connectOrCreate: tags.map((name) => ({ where: { name }, create: { name } })),
          } : undefined,
        },
      })
      await tx.contentPublication.create({
        data: { candidateId, targetType: target, targetId: article.id, status: 'draft', publishedBy: actorId },
      })
      const updated = await tx.contentCandidate.update({
        where: { id: candidateId },
        data: { status: CANDIDATE_STATUS.PUBLISHED, publishedType: target, publishedId: article.id },
      })
      await writeCandidateArtifact(updated)
      return { candidate: publicCandidate(updated), published: { type: target, id: article.id, slug, status: 'draft' } }
    }

    const portfolio = await tx.portfolio.create({
      data: {
        title: candidate.title,
        slug,
        description: candidate.description,
        content: candidate.content,
        tags: candidate.tagsJson,
        status: 'draft',
        reviewStatus: 'approved',
        createdBy: String(actorId),
      },
    })
    await tx.contentPublication.create({
      data: { candidateId, targetType: target, targetId: portfolio.id, status: 'draft', publishedBy: actorId },
    })
    const updated = await tx.contentCandidate.update({
      where: { id: candidateId },
      data: { status: CANDIDATE_STATUS.PUBLISHED, publishedType: target, publishedId: portfolio.id },
    })
    await writeCandidateArtifact(updated)
    return { candidate: publicCandidate(updated), published: { type: target, id: portfolio.id, slug, status: 'draft' } }
  })
}

export async function archiveCandidate(candidateId: number, actorId: number) {
  const candidate = await prisma.contentCandidate.findUnique({ where: { id: candidateId } })
  if (!candidate) throw createError({ statusCode: 404, message: 'Candidate not found' })
  const updated = await prisma.contentCandidate.update({
    where: { id: candidateId },
    data: { status: CANDIDATE_STATUS.ARCHIVED, reviewedBy: actorId },
  })
  await writeCandidateArtifact(updated)
  return publicCandidate(updated)
}

export async function unpublishCandidate(candidateId: number, actorId: number) {
  const candidate = await prisma.contentCandidate.findUnique({
    where: { id: candidateId },
    include: { publications: true },
  })
  if (!candidate) throw createError({ statusCode: 404, message: 'Candidate not found' })
  if (candidate.status !== CANDIDATE_STATUS.PUBLISHED) {
    throw createError({ statusCode: 409, message: 'Only published candidates can be unpublished' })
  }

  return prisma.$transaction(async (tx) => {
    for (const publication of candidate.publications.filter((item) => item.status !== 'archived')) {
      if (publication.targetType === APPROVE_TARGET.BLOG) {
        await tx.article.update({ where: { id: publication.targetId }, data: { status: 'draft', publishedAt: null } })
      } else if (publication.targetType === APPROVE_TARGET.PORTFOLIO) {
        await tx.portfolio.update({ where: { id: publication.targetId }, data: { status: 'draft' } })
      }
      await tx.contentPublication.update({
        where: { id: publication.id },
        data: { status: 'archived', unpublishedAt: new Date() },
      })
    }
    const updated = await tx.contentCandidate.update({
      where: { id: candidateId },
      data: { status: CANDIDATE_STATUS.ARCHIVED, reviewedBy: actorId },
    })
    await writeCandidateArtifact(updated)
    return publicCandidate(updated)
  })
}

export { parseTags }
