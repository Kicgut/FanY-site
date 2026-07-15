import { prisma } from '~/server/utils/db'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SkillFrontmatter {
  name: string
  description?: string
  category?: string
  author?: string
  project?: string
  triggers?: string[]
  tags?: string[]
  related_skills?: string[]
  metadata?: {
    hermes?: {
      tags?: string[]
      related_skills?: string[]
    }
  }
}

interface RemoteSkill {
  name: string
  category: string
  description: string
  status: string
  riskLevel: string
  path: string
}

interface SkillFilters {
  category?: string
  status?: string
  author?: string
  project?: string
  tag?: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * 本地 Skills API 地址（通过 frp 隧道）
 * frpc 配置：customDomains = "skills.local"，vhostHTTPPort = 7080
 * ECS 容器内通过 frps 访问：http://skills.local:7080/
 */
function getSkillsApiUrl(): string {
  // ECS 容器内访问 frps 的 vhostHTTPPort
  return process.env.SKILLS_API_URL || 'http://skills.local:7080'
}

// ─── Frontmatter Parser ──────────────────────────────────────────────────────

/**
 * 解析 SKILL.md 的 YAML frontmatter
 * 简易解析器，避免引入 yaml 依赖
 */
function parseFrontmatter(content: string): SkillFrontmatter | null {
  if (!content.startsWith('---')) return null
  const endIdx = content.indexOf('\n---', 3)
  if (endIdx === -1) return null

  const yamlStr = content.slice(4, endIdx)
  const result: any = {}

  for (const line of yamlStr.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Simple key: value parsing
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim()
    let value: any = trimmed.slice(colonIdx + 1).trim()

    // Handle inline array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
    }
    // Handle quoted string
    else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    // Handle YAML list items (skip - lines, they belong to previous key)
    else if (value === '' || value === 'null') {
      value = null
    }

    if (key === 'name' || key === 'description' || key === 'author' || key === 'project') {
      result[key] = value
    }
    else if (key === 'tags' && Array.isArray(value)) {
      result.tags = value
    }
    else if (key === 'triggers' && Array.isArray(value)) {
      result.triggers = value
    }
  }

  return result as SkillFrontmatter
}

// ─── Remote Skills API ───────────────────────────────────────────────────────

/**
 * 从本地 Skills API（通过 frp 隧道）获取所有 skills 列表
 */
async function fetchRemoteSkills(): Promise<RemoteSkill[]> {
  const url = getSkillsApiUrl()
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      console.error(`[skill-registry] Remote API returned ${response.status}`)
      return []
    }
    const data = await response.json() as { success: boolean; data: RemoteSkill[] }
    if (!data.success || !Array.isArray(data.data)) {
      console.error('[skill-registry] Invalid response from remote API')
      return []
    }
    return data.data
  } catch (err: any) {
    console.error(`[skill-registry] Failed to fetch from ${url}: ${err.message}`)
    return []
  }
}

/**
 * 获取单个 skill 的完整内容（含 frontmatter）
 */
async function fetchSkillContent(skillName: string): Promise<string> {
  const baseUrl = getSkillsApiUrl()
  const url = `${baseUrl}/skills/${encodeURIComponent(skillName)}`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return ''
    const data = await response.json() as { success: boolean; data: { content?: string } }
    return data?.data?.content || ''
  } catch {
    return ''
  }
}

// ─── Batch Fetch with Concurrency ────────────────────────────────────────────

/**
 * 并发获取所有 skill 的 content，提取 frontmatter
 */
async function fetchAllFrontmatters(
  skills: RemoteSkill[],
  concurrency = 10
): Promise<Map<string, SkillFrontmatter>> {
  const result = new Map<string, SkillFrontmatter>()
  const queue = [...skills]

  async function worker() {
    while (queue.length > 0) {
      const skill = queue.shift()!
      const content = await fetchSkillContent(skill.name)
      if (content) {
        const fm = parseFrontmatter(content)
        if (fm) {
          result.set(skill.name, fm)
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, skills.length) }, () => worker())
  await Promise.all(workers)
  return result
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * 从本地 Skills API（frp 隧道）获取 skills 并同步到数据库
 * 同时提取 frontmatter 中的 author / project 字段
 */
export async function syncSkillsToDb(): Promise<{
  synced: number
  total: number
}> {
  const remoteSkills = await fetchRemoteSkills()

  // 并发获取所有 skill 的 frontmatter
  const frontmatters = await fetchAllFrontmatters(remoteSkills)

  let synced = 0

  for (const skill of remoteSkills) {
    try {
      const fm = frontmatters.get(skill.name)
      // Determine category from path structure:
      // ~/.hermes/skills/{cat}/{name}/SKILL.md → category = cat
      // ~/.hermes/skills/{name}/SKILL.md → category = 'base' (directly under skills/)
      let category = 'base'
      const skillsMatch = skill.path.match(/\/\.hermes\/skills\/(.+)$/)
      if (skillsMatch) {
        const parts = skillsMatch[1].split('/')
        if (parts.length >= 3) {
          // cat/name/SKILL.md → cat is the category
          category = parts[0]
        }
        // parts.length == 2 → name/SKILL.md → base
      } else {
        category = skill.category || 'base'
      }

      await prisma.hermesSkill.upsert({
        where: { name: skill.name },
        create: {
          name: skill.name,
          category,
          description: skill.description || null,
          path: skill.path,
          author: fm?.author || null,
          project: fm?.project || null,
          status: skill.status || 'active',
          riskLevel: skill.riskLevel || 'low',
        },
        update: {
          category,
          description: skill.description || null,
          path: skill.path,
          author: fm?.author || null,
          project: fm?.project || null,
          status: skill.status || 'active',
          riskLevel: skill.riskLevel || 'low',
          updatedAt: new Date(),
        },
      })
      synced++
    } catch {
      // Skip on error (e.g. unique constraint race)
    }
  }

  return { synced, total: remoteSkills.length }
}

/**
 * 获取单个 skill 详情
 * 元数据从数据库读取，SKILL.md 内容从本地 API 获取
 */
export async function getSkillDetails(
  skillName: string
): Promise<{ skill: any; content: string } | null> {
  const skill = await prisma.hermesSkill.findUnique({
    where: { name: skillName },
    include: { tags: true },
  })
  if (!skill) return null

  // 从本地 API 通过 frp 隧道获取 SKILL.md 完整内容
  let content = ''
  try {
    const baseUrl = getSkillsApiUrl()
    const url = `${baseUrl}/skills/${encodeURIComponent(skillName)}`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const data = await response.json() as { success: boolean; data: { content: string } }
      if (data.success && data.data?.content) {
        content = data.data.content
      }
    }
    if (!content) {
      // fallback: 用元数据拼接摘要
      content = `# ${skill.name}\n\n`
      content += `**Category:** ${skill.category || 'uncategorized'}\n`
      content += `**Status:** ${skill.status}\n`
      content += `**Risk Level:** ${skill.riskLevel}\n\n`
      if (skill.description) {
        content += `## Description\n\n${skill.description}\n\n`
      }
      content += `\n\n⚠️ Could not fetch full SKILL.md content from local server.`
    }
  } catch {
    content = `# ${skill.name}\n\n⚠️ Unable to fetch skill details — local Skills API may be offline.`
  }

  return { skill, content }
}

/** List skills from DB with optional filters */
export async function listSkills(filters?: SkillFilters) {
  const where: any = {}
  if (filters?.category) where.category = filters.category
  if (filters?.status) where.status = filters.status
  if (filters?.author) where.author = filters.author
  if (filters?.project) where.project = filters.project
  if (filters?.tag) {
    where.tags = { some: { tag: filters.tag } }
  }

  const skills = await prisma.hermesSkill.findMany({
    where,
    include: { tags: true },
    orderBy: { name: 'asc' },
  })

  return skills
}

/** Get all distinct categories */
export async function getSkillCategories(): Promise<string[]> {
  const rows = await prisma.hermesSkill.findMany({
    where: { category: { not: null } },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  })
  return rows.map((r: any) => r.category!).filter(Boolean)
}

/** Get all distinct authors */
export async function getSkillAuthors(): Promise<string[]> {
  const rows = await prisma.hermesSkill.findMany({
    where: { author: { not: null } },
    distinct: ['author'],
    select: { author: true },
    orderBy: { author: 'asc' },
  })
  return rows.map((r: any) => r.author!).filter(Boolean)
}

/** Get all distinct projects */
export async function getSkillProjects(): Promise<string[]> {
  const rows = await prisma.hermesSkill.findMany({
    where: { project: { not: null } },
    distinct: ['project'],
    select: { project: true },
    orderBy: { project: 'asc' },
  })
  return rows.map((r: any) => r.project!).filter(Boolean)
}

// ─── Tag Management ──────────────────────────────────────────────────────────

/** Preset tag categories */
export const PRESET_TAGS = {
  quality: ['优质', '需优化', '待评估'],
  source: ['官方内置', '用户生成', '社区'],
  usage: ['通用', '项目专用', '高频使用'],
} as const

/** Add a tag to a skill */
export async function addSkillTag(
  skillName: string,
  tag: string,
  tagType: string = 'custom'
) {
  return prisma.hermesSkillTag.create({
    data: { skillName, tag, tagType },
  })
}

/** Remove a tag from a skill */
export async function removeSkillTag(skillName: string, tag: string) {
  return prisma.hermesSkillTag.deleteMany({
    where: { skillName, tag },
  })
}

/** Get all unique tags across all skills */
export async function getAllTags() {
  const rows = await prisma.hermesSkillTag.findMany({
    distinct: ['tag', 'tagType'],
    select: { tag: true, tagType: true },
    orderBy: { tag: 'asc' },
  })
  return rows
}

/** Get skills grouped by category (for directory tree) */
export async function getSkillTree() {
  const skills = await prisma.hermesSkill.findMany({
    include: { tags: true },
    orderBy: { name: 'asc' },
  })

  const tree: Record<string, typeof skills> = {}
  for (const skill of skills) {
    const cat = skill.category || 'uncategorized'
    if (!tree[cat]) tree[cat] = []
    tree[cat].push(skill)
  }
  return tree
}
