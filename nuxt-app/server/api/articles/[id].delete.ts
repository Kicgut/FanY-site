import { prisma } from '~/server/utils/db'
import { requireAdmin } from '~/server/utils/permission'
import { logAudit } from '~/server/services/audit'
import { unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const BLOG_MD_DIR = resolve(process.cwd(), 'data', 'blog-md')

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

  // Fetch article before delete for audit and md cleanup
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) {
    throw createError({ statusCode: 404, message: 'Article not found' })
  }

  try {
    await prisma.article.delete({ where: { id } })

    // 删除对应的 md 文件
    await deleteArticleMd(article.slug)

    await logAudit(event, 'article_delete', 'article', id, { title: article.title, slug: article.slug })
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Article not found' })
    }
    throw createError({ statusCode: 500, message: 'Failed to delete article' })
  }
})
