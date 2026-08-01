import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const entryId = Number(getRouterParam(event, 'entryId'))
  const entry = await prisma.portfolioPromptEntry.findUnique({ where: { id: entryId }, select: { id: true, portfolioId: true } })
  if (!entry) throw createError({ statusCode: 404, message: 'Prompt entry not found' })
  await prisma.portfolioPromptEntry.delete({ where: { id: entryId } })
  await logAudit(event, 'delete_portfolio_prompt_entry', 'portfolio_prompt_entry', entryId, entry, null)
  return { success: true }
})
