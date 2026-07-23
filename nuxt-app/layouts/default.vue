<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const route = useRoute()
const menuOpen = ref(false)
const hasAiAccess = ref(false)
const currentUser = ref<{ name: string; role: string } | null>(null)
const currentYear = computed(() => new Date().getFullYear())

const links = [
  { to: '/', label: '首页' },
  { to: '/blog', label: '博客' },
  { to: '/portfolio', label: '作品' },
  { to: '/albums', label: '照片' },
]

const activePath = computed(() => route.path)

watch(() => route.path, () => {
  menuOpen.value = false
})

onMounted(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user) {
      currentUser.value = user
      hasAiAccess.value = user?.aiAccess === true
    }
  } catch {
    currentUser.value = null
  }
})

async function handleLogout() {
  try { await useAuthFetch()('/api/auth/logout', { method: 'POST' }) } catch { /* token may already be invalid */ }
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  currentUser.value = null
  navigateTo('/')
}
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="返回首页">
          <span class="brand-mark">FY</span>
          <span class="brand-text">
            <strong>FAN / Y</strong>
            <small>personal archive</small>
          </span>
        </NuxtLink>

        <button
          class="menu-toggle"
          :aria-expanded="menuOpen"
          aria-label="打开导航"
          @click="menuOpen = !menuOpen"
        >
          <span />
          <span />
          <span />
        </button>

        <nav :class="['site-nav', { open: menuOpen }]" aria-label="主导航">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :class="{ active: activePath === link.to || (link.to !== '/' && activePath.startsWith(link.to)) }"
          >
            {{ link.label }}
          </NuxtLink>
          <NuxtLink
            to="/blog/archive"
            :class="{ active: activePath === '/blog/archive' }"
          >
            归档
          </NuxtLink>
          <NuxtLink
            to="/skills"
            :class="{ active: activePath.startsWith('/skills') }"
          >
            Skills
          </NuxtLink>
          <NuxtLink v-if="hasAiAccess" to="/ai">AI</NuxtLink>
          <span class="nav-divider" />
          <NuxtLink v-if="currentUser" to="/admin" class="nav-pill">后台</NuxtLink>
          <button
            v-if="currentUser"
            class="nav-action"
            type="button"
            @click="handleLogout"
          >
            退出
          </button>
          <NuxtLink v-else to="/admin/login" class="nav-pill">登录</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <Transition name="page" mode="out-in">
        <slot />
      </Transition>
    </main>

    <footer class="site-footer">
      <span>© {{ currentYear }} FAN / Y</span>
      <span class="footer-note">A personal archive of work, notes, and images.</span>
    </footer>
  </div>
</template>

<style scoped>
.site-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(208, 213, 221, .72);
  background: rgba(244, 247, 251, .82);
  backdrop-filter: blur(18px);
}

.header-inner,
.site-footer {
  max-width: var(--max-width);
  width: 100%;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.header-inner {
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text);
  text-decoration: none;
  min-width: 0;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(145deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font: 700 12px var(--font-mono);
  letter-spacing: .08em;
  box-shadow: var(--shadow-light);
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-text strong {
  font-size: 13px;
  line-height: 1.15;
  letter-spacing: .02em;
}

.brand-text small {
  font: 11px var(--font-mono);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.menu-toggle {
  display: none;
  margin-left: auto;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 0 11px;
  cursor: pointer;
  box-shadow: 0 1px 1px rgba(16, 24, 40, .03);
}

.menu-toggle span {
  display: block;
  height: 1.5px;
  margin: 5px 0;
  border-radius: 999px;
  background: var(--color-text);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.site-nav a,
.nav-action {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 13px;
  line-height: 1;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
}

.site-nav a:hover,
.site-nav a.active,
.nav-action:hover,
.nav-pill {
  color: var(--color-text);
  background: rgba(255, 255, 255, .8);
  border-color: rgba(208, 213, 221, .9);
  box-shadow: 0 1px 1px rgba(16, 24, 40, .04);
}

.nav-divider {
  width: 1px;
  height: 18px;
  background: var(--color-border);
  margin: 0 4px;
}

.main-content {
  flex: 1;
}

.site-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 22px;
  padding-bottom: 28px;
  border-top: 1px solid rgba(208, 213, 221, .72);
  color: var(--color-text-muted);
  font: 12px var(--font-mono);
}

.footer-note {
  color: var(--color-text-secondary);
}

@media (max-width: 780px) {
  .header-inner {
    min-height: 64px;
  }

  .menu-toggle {
    display: inline-block;
  }

  .site-nav {
    position: absolute;
    top: 64px;
    left: 16px;
    right: 16px;
    z-index: 120;
    display: none;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    background: rgba(255, 255, 255, .96);
    box-shadow: var(--shadow-medium);
  }

  .site-nav.open {
    display: flex;
  }

  .site-nav a,
  .nav-action {
    justify-content: flex-start;
    width: 100%;
    padding: 13px 14px;
  }

  .nav-divider {
    width: 100%;
    height: 1px;
    margin: 8px 0;
  }

  .site-footer {
    flex-direction: column;
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
