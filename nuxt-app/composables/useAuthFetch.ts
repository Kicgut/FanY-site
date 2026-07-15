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
  return $authFetch || $fetch
}
