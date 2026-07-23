import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { prisma } from '~/server/utils/db'
import { requireAdmin } from '~/server/utils/permission'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled'
}

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

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  // 必须有 title 和 content
  if (!body.title || !body.content) {
    throw createError({ statusCode: 400, message: 'title and content are required' })
  }

  const title = body.title
  const slug = body.slug || slugify(title)
  const content = body.content
  const description = body.description || null
  const tags = Array.isArray(body.tags) ? body.tags : []
  const status = body.status || 'published'

  try {
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

    // 写 MD 备份文件到 ECS 容器内
    await writeArticleMd(slug, article)

    return { success: true, data: article }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Failed to import article: ' + error.message })
  }
})
