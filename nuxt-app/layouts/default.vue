<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()
const menuOpen = ref(false)
const hasAiAccess = ref(false)
const currentUser = ref<{ name: string; role: string } | null>(null)
const currentYear = computed(() => new Date().getFullYear())
const links = [
  { to: '/', label: '首页' }, { to: '/blog', label: '博客' },
  { to: '/portfolio', label: '作品' }, { to: '/albums', label: '照片' },
]
const activePath = computed(() => route.path)
watch(() => route.path, () => { menuOpen.value = false })
onMounted(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user) { currentUser.value = user; hasAiAccess.value = user?.aiAccess === true }
  } catch { currentUser.value = null }
})
function handleLogout() { localStorage.removeItem('token'); localStorage.removeItem('user'); currentUser.value = null; navigateTo('/') }
</script>
<template>
  <div class="site-shell">
    <header class="site-header">
      <NuxtLink to="/" class="brand"><span class="brand-symbol">✳</span><span>FAN / Y</span></NuxtLink>
      <button class="menu-toggle" :aria-expanded="menuOpen" aria-label="打开导航" @click="menuOpen = !menuOpen"><span /><span /></button>
      <nav :class="['site-nav', { open: menuOpen }]" aria-label="主导航">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" :class="{ active: activePath === link.to || (link.to !== '/' && activePath.startsWith(link.to)) }">{{ link.label }}</NuxtLink>
        <NuxtLink to="/blog/archive" :class="{ active: activePath === '/blog/archive' }">归档</NuxtLink>
        <NuxtLink to="/skills" :class="{ active: activePath.startsWith('/skills') }">Skills</NuxtLink>
        <NuxtLink v-if="hasAiAccess" to="/ai">AI</NuxtLink>
        <span class="nav-rule" />
        <template v-if="currentUser"><NuxtLink to="/admin">后台</NuxtLink><button class="logout-link" @click="handleLogout">退出</button></template>
        <NuxtLink v-else to="/admin/login">登录</NuxtLink>
      </nav>
    </header>
    <main class="main-content"><Transition name="page" mode="out-in"><slot /></Transition></main>
    <footer class="site-footer"><span>© {{ currentYear }} FAN / Y</span><span class="footer-note">A small archive of work, notes and light.</span></footer>
  </div>
</template>
<style scoped>
.site-shell{min-height:100vh;display:flex;flex-direction:column;background:var(--color-bg);font-family:var(--font-family)}.site-header{position:sticky;top:0;z-index:100;display:flex;align-items:center;max-width:var(--max-width);width:100%;margin:0 auto;padding:0 24px;height:76px;background:rgba(242,239,232,.86);backdrop-filter:blur(18px);border-bottom:1px solid rgba(213,208,197,.78)}.brand{display:flex;align-items:center;gap:10px;color:var(--color-text);font:700 13px var(--font-mono);letter-spacing:.1em;text-decoration:none;white-space:nowrap}.brand-symbol{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--color-text);color:var(--color-bg);font-size:15px}.site-nav{display:flex;align-items:center;gap:22px;margin-left:auto}.site-nav a,.logout-link{color:var(--color-text-secondary);font-size:13px;text-decoration:none;background:none;border:0;cursor:pointer;padding:8px 0}.site-nav a:hover,.site-nav a.active,.logout-link:hover{color:var(--color-accent)}.nav-rule{width:1px;height:20px;background:var(--color-border)}.menu-toggle{display:none;margin-left:auto;border:0;background:transparent;width:42px;height:42px;padding:10px}.menu-toggle span{display:block;width:22px;height:1px;background:var(--color-text);margin:6px 0}.main-content{flex:1}.site-footer{display:flex;justify-content:space-between;gap:20px;max-width:var(--max-width);width:100%;margin:0 auto;padding:26px 24px 32px;color:var(--color-text-muted);font:11px var(--font-mono);border-top:1px solid var(--color-border)}.footer-note{color:var(--color-text-secondary)}@media(max-width:720px){.site-header{height:64px;padding:0 16px}.menu-toggle{display:block}.site-nav{position:absolute;top:64px;left:0;right:0;display:none;flex-direction:column;align-items:stretch;gap:0;padding:10px 16px 18px;background:rgba(242,239,232,.97);border-bottom:1px solid var(--color-border);box-shadow:var(--shadow-light)}.site-nav.open{display:flex}.site-nav a,.logout-link{padding:12px 4px;border-bottom:1px solid rgba(213,208,197,.6)}.nav-rule{display:none}.site-footer{flex-direction:column;padding:22px 16px}.footer-note{font-size:10px}}
</style>
