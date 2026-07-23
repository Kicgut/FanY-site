import { writeFile, unlink, mkdir, rename } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'

const BLOG_MD_DIR = resolve(process.cwd(), 'data', 'blog-md')

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

async function writeArticleMd(slug: string, article: any) {
  await ensureDir(BLOG_MD_DIR)

  const tags = article.tags?.map((t: any) => t.name) || []
  const publishedAt = article.publishedAt || article.createdAt

  const frontmatter = [
    '---',
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `slug: "${slug}"`,
    article.description ? `description: "${article.description.replace(/"/g, '\\"')}"` : null,
    `tags: [${tags.join(', ')}]`,
    `status: ${article.status}`,
    `publishedAt: ${publishedAt}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n')

  const content = frontmatter + '\n\n' + article.content
  const filePath = join(BLOG_MD_DIR, `${slug}.md`)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

async function deleteArticleMd(slug: string) {
  const filePath = join(BLOG_MD_DIR, `${slug}.md`)
  try {
    await unlink(filePath)
  } catch {
    // 文件不存在忽略
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid article ID' })
  }

  const body = await readBody(event)

  try {
    const existing = await prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Article not found' })
    }

    const data: any = {}
    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) data.content = body.content
    if (body.description !== undefined) data.description = body.description
    if (body.status !== undefined) {
      data.status = body.status
      if (body.status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date()
      }
    }
    if (body.coverImage !== undefined) data.coverImage = body.coverImage

    if (body.tags) {
      data.tags = {
        set: [],
        connectOrCreate: body.tags.map((name: string) => ({
          where: { name },
          create: { name },
        })),
      }
    }

    const article = await prisma.article.update({
      where: { id },
      data,
      include: { tags: true },
    })

    // 同步 md 文件
    const oldSlug = existing.slug
    const newSlug = article.slug

    // 如果 slug 变了，删除旧文件
    if (oldSlug !== newSlug) {
      await deleteArticleMd(oldSlug)
    }

    // 只有 published 状态才写 md 文件
    if (article.status === 'published') {
      await writeArticleMd(newSlug, article)
    } else {
      // 如果状态改为非 published，删除 md 文件
      await deleteArticleMd(newSlug)
    }

    await logAudit(event, 'article_update', 'article', id, existing, article)

    return article
  } catch (error: any) {
    if (error.statusCode) throw error
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Article not found' })
    }
    throw createError({ statusCode: 500, message: 'Failed to update article' })
  }
})
