import { requireAdmin } from '~/server/utils/permission'
import { prisma } from '~/server/utils/db'
import { logAudit } from '~/server/services/audit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const blockId = Number(getRouterParam(event, 'blockId'))
  await prisma.portfolioBlock.delete({ where: { id: blockId } })
  await logAudit(event, 'delete_portfolio_block', 'portfolio_block', blockId)
  return { success: true }
})
