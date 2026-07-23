/**
 * 全局 Auth 插件 — 自动给所有请求附加 Bearer token
 * 
 * Nuxt 3 中，组件内直接使用的 $fetch 是自动导入的全局 ofetch 实例，
 * 不会自动使用 provide 注入的版本。
 * 
 * 解决方案：
 * 1. /admin/** 路由关闭 SSR（nuxt.config.ts routeRules）
 * 2. 此插件通过 provide 注入带认证的 fetch
 * 3. composables/useAuthFetch.ts 提供 useAuthFetch() 供 admin 页面使用
 */
export default defineNuxtPlugin(() => {
  const authFetch = $fetch.create({
    onRequest({ options }) {
      if (import.meta.server) return

      const token = localStorage.getItem('token')
      if (token) {
        const existingHeaders = options.headers as unknown
        if (existingHeaders instanceof Headers) {
          const obj: Record<string, string> = {}
          existingHeaders.forEach((v, k) => { obj[k] = v })
          options.headers = obj as unknown as typeof options.headers
        } else if (!existingHeaders) {
          options.headers = {} as typeof options.headers
        }
        ;(options.headers as unknown as Record<string, string>).Authorization = `Bearer ${token}`
      }
    },
    onResponseError() {
      if (import.meta.server) return
      // 只在 401（未授权）时清除 token 并跳转登录
      // 500 等其他错误不应触发登出
      // useAuthFetch performs one refresh-and-retry before handling 401.
    },
  })

  return {
    provide: {
      authFetch,
    },
  }
})
