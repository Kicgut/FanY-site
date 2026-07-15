/**
 * 公开 Skills API — 无需认证
 * 数据从数据库读取，内容通过 frp 隧道从本地获取
 */
import { listSkills } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const filters: any = {}
  if (query.category) filters.category = query.category as string
  if (query.status) filters.status = query.status as string
  if (query.author) filters.author = query.author as string
  if (query.project) filters.project = query.project as string
  if (query.tag) filters.tag = query.tag as string

  const skills = await listSkills(Object.keys(filters).length ? filters : undefined)
  return { success: true, data: skills }
})
