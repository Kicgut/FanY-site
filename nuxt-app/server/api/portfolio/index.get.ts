import { getPublicPortfolioList } from '~/server/services/portfolio'

export default defineEventHandler(async (event) => {
  const data = await getPublicPortfolioList(getQuery(event))
  return { success: true, data }
})
