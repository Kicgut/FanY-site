import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
  const body = await readBody(event)

  if (!body.title || !body.content) {
    throw createError({ statusCode: 400, message: 'Title and content are required' })
  }

  const slug = slugify(body.title)
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Title must contain alphanumeric characters' })
  }

  try {
    const tagOperations = body.tags?.length
      ? {
          tags: {
            connectOrCreate: body.tags.map((name: string) => ({
              where: { name },
              create: { name },
            })),
          },
        }
      : {}

    const article = await prisma.article.create({
      data: {
        title: body.title,
        slug,
        content: body.content,
        description: body.description || null,
        status: body.status || 'draft',
        publishedAt: body.status === 'published' ? new Date() : null,
        ...tagOperations,
      },
      include: { tags: true },
    })

    // 写 MD 备份文件（所有状态都写）
    await writeArticleMd(slug, article)

    return article
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'An article with this title already exists' })
    }
    throw createError({ statusCode: 500, message: 'Failed to create article' })
  }
})
