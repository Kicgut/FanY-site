import { getRequestUser } from '~/server/utils/permission'

export default defineEventHandler(async (event) => {
  const user = await getRequestUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        groups: user.groups,
        status: user.status,
        aiAccess: user.aiAccess,
        aiAccessLevel: user.aiAccessLevel,
        uploadQuotaMb: user.uploadQuotaMb,
      },
    },
  }
})
