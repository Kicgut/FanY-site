import { requireAdmin } from '~/server/utils/permission'
import { getSkillTree, getSkillCategories, getSkillAuthors, getSkillProjects } from '~/server/services/skill-registry'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [tree, categories, authors, projects] = await Promise.all([
    getSkillTree(),
    getSkillCategories(),
    getSkillAuthors(),
    getSkillProjects(),
  ])

  return {
    success: true,
    data: { tree, categories, authors, projects },
  }
})
