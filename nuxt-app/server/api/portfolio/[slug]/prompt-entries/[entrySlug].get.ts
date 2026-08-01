import { getPublicPromptEntry } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const entrySlug = String(getRouterParam(event, 'entrySlug') || '')
  const entry = await getPublicPromptEntry(slug, entrySlug)
  if (!entry) throw createError({ statusCode: 404, message: '提示词条目不存在' })
  return { success: true, data: entry }
})
