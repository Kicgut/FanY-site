import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { requireLocalTrusted } from '~/server/utils/permission'

function slugify(text: string): string {
  // 处理中文：转拼音风格的 slug
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // 保留中文、字母、数字、空格、连字符
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled'
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
    if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1)
    }
    // Parse arrays like [a, b]
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    }

    meta[key] = val
  }

  return { meta, body }
}

export default defineEventHandler(async (event) => {
  await requireLocalTrusted(event)
  const body = await readBody(event)

  if (!body.filePath) {
    throw createError({ statusCode: 400, message: 'filePath is required' })
  }

  try {
    const filePath = resolve(process.cwd(), body.filePath)
    const allowedRoot = await realpath(resolve(process.cwd(), 'data'))
    const resolvedFilePath = await realpath(filePath)
    if (resolvedFilePath !== allowedRoot && !resolvedFilePath.startsWith(`${allowedRoot}${sep}`)) {
      throw createError({ statusCode: 400, message: 'filePath must be inside the data directory' })
    }
    const raw = await readFile(resolvedFilePath, 'utf-8')
    const { meta, body: content } = parseFrontmatter(raw)

    // 提取 slug：优先使用 frontmatter 中的 slug，否则从 title 生成
    const title = meta.title || 'Untitled'
    const slug = meta.slug || slugify(title)
    const description = meta.description || null
    const tags = Array.isArray(meta.tags) ? meta.tags : []
    const status = meta.status || 'published'

    // 检查是否已存在
    const existing = await prisma.article.findFirst({
      where: { slug },
    })

    if (existing) {
      throw createError({ statusCode: 409, message: `Article with slug "${slug}" already exists` })
    }

    const tagOperations = tags.length
      ? {
          tags: {
            connectOrCreate: tags.map((name: string) => ({
              where: { name },
              create: { name },
            })),
          },
        }
      : {}

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        description,
        status,
        publishedAt: status === 'published' ? new Date() : null,
        ...tagOperations,
      },
      include: { tags: true },
    })

    return { success: true, data: article }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Failed to import article: ' + error.message })
  }
})
