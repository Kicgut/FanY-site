/**
 * GET /api/hermes/skills
 * 获取 Hermes Skills 列表（本地文件读取 + 可选缓存）
 */
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '~/server/utils/permission'

interface SkillMeta {
  name: string
  version?: string
  description?: string
  category?: string
  author?: string
  tags?: string[]
  enabled?: boolean
}

export default defineEventHandler(async (event) => {
  // 权限校验
  await requireAdmin(event)

  const query = getQuery(event)
  const category = query.category as string | undefined

  // 读取本地 skills 目录
  const skillsDir = join(process.cwd(), '.hermes', 'skills')
  const skills: SkillMeta[] = []

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = join(skillsDir, entry.name)
      try {
        // 尝试读取 SKILL.md 或 skill.json
        const mdPath = join(skillPath, 'SKILL.md')
        const jsonPath = join(skillPath, 'skill.json')

        let meta: SkillMeta = { name: entry.name }

        try {
          const content = await readFile(mdPath, 'utf-8')
          // 解析 YAML frontmatter
          const match = content.match(/^---\n([\s\S]*?)\n---/)
          if (match) {
            const yaml = match[1]
            const nameMatch = yaml.match(/name:\s*(.+)/)
            const descMatch = yaml.match(/description:\s*(.+)/)
            const versionMatch = yaml.match(/version:\s*(.+)/)
            const categoryMatch = yaml.match(/category:\s*(.+)/)
            const tagsMatch = yaml.match(/tags:\s*\[([^\]]+)\]/)

            if (nameMatch) meta.name = nameMatch[1].trim()
            if (descMatch) meta.description = descMatch[1].trim()
            if (versionMatch) meta.version = versionMatch[1].trim()
            if (categoryMatch) meta.category = categoryMatch[1].trim()
            if (tagsMatch) meta.tags = tagsMatch[1].split(',').map(t => t.trim())
          }
        } catch {
          try {
            const json = JSON.parse(await readFile(jsonPath, 'utf-8'))
            meta = { ...meta, ...json }
          } catch {
            // 使用默认 meta
          }
        }

        // 如果指定了 category，过滤
        if (category && meta.category !== category) continue

        skills.push(meta)
      } catch {
        // 跳过无法读取的目录
      }
    }
  } catch (err: any) {
    // skills 目录不存在
    if (err.code === 'ENOENT') {
      return { success: true, data: { skills: [], total: 0 } }
    }
    throw createError({ statusCode: 500, message: '读取 skills 失败' })
  }

  return {
    success: true,
    data: {
      skills,
      total: skills.length
    }
  }
})
