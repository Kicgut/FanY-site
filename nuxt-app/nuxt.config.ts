export default defineNuxtConfig({
  compatibilityDate: '2025-07-04',
  ssr: true,
  modules: ['@element-plus/nuxt'],
  css: ['~/assets/css/variables.css'],
  app: {
    head: {
      title: 'Personal Portfolio',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A personal portfolio website showcasing projects, skills, and blog posts.' },
      ],
    },
  },
  // Production optimizations
  nitro: {
    compressPublicAssets: true,
    minify: true,
  },
  // Route rules for caching
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { swr: 3600 },
    '/portfolio/**': { swr: 3600 },
    '/api/**': { cors: true },
    '/admin/**': { ssr: false },
  },
})
