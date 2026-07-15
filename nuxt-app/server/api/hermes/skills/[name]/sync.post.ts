/**
 * POST /api/hermes/skills/:name/sync
 * 同步单个 skill 到 ECS
 */
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireLocalTrusted } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  // 需要本地管理员权限
  const { user, origin } = await requireLocalTrusted(event)

  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, message: '缺少 skill 名称' })
  }

  // TODO: 实现同步逻辑
  return {
    success: true,
    data: { message: `Skill ${name} 同步功能待实现` }
  }
})
