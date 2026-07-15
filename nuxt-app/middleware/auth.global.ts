/**
 * Auth 中间件 — 保护需要登录的路由
 * 
 * 受保护路由：/admin/**, /skills
 * 公开路由：/, /about, /blog, /portfolio, /admin/login, /ai
 * 
 * 检查 localStorage 中是否有 token，没有则跳转到登录页。
 * 仅在客户端生效（使用 import.meta.client 判断）。
 */
export default defineNuxtRouteMiddleware((to) => {
  // 只在客户端检查（SSR 时没有 localStorage）
  if (import.meta.server) return

  // 登录页不需要检查
  if (to.path === '/admin/login') return

  // 只保护 /admin 和 /skills 路由
  const protectedPrefixes = ['/admin', '/skills']
  const isProtected = protectedPrefixes.some(prefix => 
    to.path === prefix || to.path.startsWith(prefix + '/')
  )
  if (!isProtected) return

  const token = localStorage.getItem('token')
  if (!token) {
    return navigateTo('/admin/login')
  }
})
