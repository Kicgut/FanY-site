// ─── Content Pipeline Service ────────────────────────────────────────────────
// Manages content candidates (AI-generated, manual, or imported markdown).
// Per AGENTS.md: AI can generate candidates but cannot auto-publish.
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

// ─── Constants ───────────────────────────────────────────────────────────────

export const PIPELINE_DIR = resolve(process.cwd(), 'data', 'content-pipeline')
export const CANDIDATES_DIR = join(PIPELINE_DIR, 'candidates')
export const PUBLISHED_DIR = join(PIPELINE_DIR, 'published')
export const ARCHIVED_DIR = join(PIPELINE_DIR, 'archived')

export const CANDIDATE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export const CANDIDATE_SOURCE = {
  AI_CHAT: 'ai_chat',
  MANUAL: 'manual',
  IMPORT: 'import',
} as const

export const APPROVE_TARGET = {
  BLOG: 'blog',
  PORTFOLIO: 'portfolio',
} as const

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CandidateMeta {
  id: string
  title: string
  source: string
  status: string
  tags: string[]
  description?: string
  createdAt: string
  updatedAt: string
  rejectReason?: string
}

export interface CandidateInput {
  title: string
  content: string
  description?: string
  tags?: string[]
}

export interface ListFilters {
  status?: string
  source?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFrontmatter(meta: CandidateMeta): string {
  const lines = [
    '---',
    `id: ${meta.id}`,
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `source: ${meta.source}`,
    `status: ${meta.status}`,
    `tags: [${meta.tags.join(', ')}]`,
  ]
  if (meta.description) {
    lines.push(`description: "${meta.description.replace(/"/g, '\\"')}"`)
  }
  lines.push(`createdAt: ${meta.createdAt}`)
  lines.push(`updatedAt: ${meta.updatedAt}`)
  if (meta.rejectReason) {
    lines.push(`rejectReason: "${meta.rejectReason.replace(/"/g, '\\"')}"`)
  }
  lines.push('---')
  return lines.join('\n')
}

function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }

  const metaBlock = match[1]
  const body = match[2].trim()
  const meta: Record<string, any> = {}

  for (const line of metaBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    let val: any = line.slice(colonIdx + 1).trim()

    // Strip quotes
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1)
    }
    // Parse arrays like [a, b]
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }

    meta[key] = val
  }

  return { meta, body }
}

function ensureDir(dir: string) {
  return mkdir(dir, { recursive: true })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a new content candidate.
 * The file is stored in candidates/ with YAML frontmatter metadata.
 */
export async function createCandidate(
  input: CandidateInput,
  source: string
): Promise<CandidateMeta> {
  await ensureDir(CANDIDATES_DIR)

  const now = new Date().toISOString()
  const id = randomUUID().slice(0, 8)

  const meta: CandidateMeta = {
    id,
    title: input.title,
    source,
    status: CANDIDATE_STATUS.DRAFT,
    tags: input.tags || [],
    description: input.description,
    createdAt: now,
    updatedAt: now,
  }

  const fileContent = buildFrontmatter(meta) + '\n\n' + input.content
  const filePath = join(CANDIDATES_DIR, `${id}.md`)
  await writeFile(filePath, fileContent, 'utf-8')

  return meta
}

/**
 * List all candidates, optionally filtered by status/source.
 * Reads all .md files in candidates/ and parses their frontmatter.
 */
export async function listCandidates(filters?: ListFilters): Promise<CandidateMeta[]> {
  await ensureDir(CANDIDATES_DIR)

  let files: string[]
  try {
    files = (await readdir(CANDIDATES_DIR)).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }

  const candidates: CandidateMeta[] = []

  for (const file of files) {
    const raw = await readFile(join(CANDIDATES_DIR, file), 'utf-8')
    const { meta } = parseFrontmatter(raw)

    if (filters?.status && meta.status !== filters.status) continue
    if (filters?.source && meta.source !== filters.source) continue

    candidates.push({
      id: meta.id || file.replace('.md', ''),
      title: meta.title || '(untitled)',
      source: meta.source || 'manual',
      status: meta.status || CANDIDATE_STATUS.DRAFT,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description,
      createdAt: meta.createdAt || '',
      updatedAt: meta.updatedAt || '',
      rejectReason: meta.rejectReason,
    })
  }

  // Sort by createdAt descending
  candidates.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  return candidates
}

/**
 * Get full content (frontmatter + body) for a single candidate.
 */
export async function getCandidateContent(candidateId: string): Promise<{
  meta: CandidateMeta
  content: string
} | null> {
  const filePath = join(CANDIDATES_DIR, `${candidateId}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return null
  }

  const { meta, body } = parseFrontmatter(raw)
  return {
    meta: {
      id: meta.id || candidateId,
      title: meta.title || '(untitled)',
      source: meta.source || 'manual',
      status: meta.status || CANDIDATE_STATUS.DRAFT,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description,
      createdAt: meta.createdAt || '',
      updatedAt: meta.updatedAt || '',
      rejectReason: meta.rejectReason,
    },
    content: body,
  }
}

/**
 * Approve a candidate: update status to 'approved' and move to published/.
 * Returns the file content for downstream use (e.g. creating Article/Portfolio).
 */
export async function approveCandidate(
  candidateId: string,
  target: string
): Promise<{ meta: CandidateMeta; content: string; target: string } | null> {
  const filePath = join(CANDIDATES_DIR, `${candidateId}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return null
  }

  const { meta: rawMeta, body } = parseFrontmatter(raw)
  const now = new Date().toISOString()

  const meta: CandidateMeta = {
    id: rawMeta.id || candidateId,
    title: rawMeta.title || '(untitled)',
    source: rawMeta.source || 'manual',
    status: CANDIDATE_STATUS.APPROVED,
    tags: Array.isArray(rawMeta.tags) ? rawMeta.tags : [],
    description: rawMeta.description,
    createdAt: rawMeta.createdAt || now,
    updatedAt: now,
    rejectReason: undefined,
  }

  // Write updated file
  const updatedContent = buildFrontmatter(meta) + '\n\n' + body
  const publishedPath = join(PUBLISHED_DIR, `${candidateId}.md`)
  await ensureDir(PUBLISHED_DIR)
  await writeFile(publishedPath, updatedContent, 'utf-8')

  // Remove from candidates
  try {
    await unlink(filePath)
  } catch {
    // Ignore if already gone
  }

  return { meta, content: body, target }
}

/**
 * Reject a candidate: update status to 'rejected' and move to archived/.
 */
export async function rejectCandidate(
  candidateId: string,
  reason: string
): Promise<CandidateMeta | null> {
  const filePath = join(CANDIDATES_DIR, `${candidateId}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return null
  }

  const { meta: rawMeta, body } = parseFrontmatter(raw)
  const now = new Date().toISOString()

  const meta: CandidateMeta = {
    id: rawMeta.id || candidateId,
    title: rawMeta.title || '(untitled)',
    source: rawMeta.source || 'manual',
    status: CANDIDATE_STATUS.REJECTED,
    tags: Array.isArray(rawMeta.tags) ? rawMeta.tags : [],
    description: rawMeta.description,
    createdAt: rawMeta.createdAt || now,
    updatedAt: now,
    rejectReason: reason,
  }

  const updatedContent = buildFrontmatter(meta) + '\n\n' + body
  const archivedPath = join(ARCHIVED_DIR, `${candidateId}.md`)
  await ensureDir(ARCHIVED_DIR)
  await writeFile(archivedPath, updatedContent, 'utf-8')

  try {
    await unlink(filePath)
  } catch {
    // Ignore
  }

  return meta
}
