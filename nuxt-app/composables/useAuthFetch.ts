/**
 * 带认证的 fetch composable
 * 
 * 在 admin 页面中替代 $fetch，自动附加 JWT token。
 * 基于 auth.client.ts 插件注入的 $authFetch。
 * 
 * 用法：
 *   const authFetch = useAuthFetch()
 *   const data = await authFetch('/api/admin/users')
 */
export function useAuthFetch() {
  const { $authFetch } = useNuxtApp()
  
  // 如果插件已加载（客户端），使用带认证的 fetch
  // 如果插件未加载（SSR 降级），使用普通 $fetch（会被 middleware 拦截返回 401，但 admin 路由已关闭 SSR）
  const baseFetch: any = $authFetch || $fetch
  if (!import.meta.client) return baseFetch
  return async (request: any, options: any = {}) => {
    try {
      return await baseFetch(request, options)
    } catch (error: any) {
      const status = error?.response?.status ?? error?.statusCode
      const refreshToken = localStorage.getItem('refreshToken')
      if (status !== 401 || String(request).includes('/api/auth/refresh')) throw error
      try {
        const refreshed: any = await $fetch('/api/auth/refresh', refreshToken
          ? { method: 'POST', body: { refreshToken } }
          : { method: 'POST' })
        const nextToken = refreshed?.data?.token
        if (!nextToken) throw error
        localStorage.setItem('token', nextToken)
        if (refreshed?.data?.refreshToken) localStorage.setItem('refreshToken', refreshed.data.refreshToken)
        return await baseFetch(request, options)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        await navigateTo('/admin/login')
        throw error
      }
    }
  }
}
