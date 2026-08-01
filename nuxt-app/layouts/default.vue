<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const route = useRoute()
const menuOpen = ref(false)
const currentUser = ref<{ name: string; role: string } | null>(null)
const soundOn = ref(false)
const currentYear = computed(() => new Date().getFullYear())

const links = [
  { to: '/', label: '首页' },
  { to: '/blog', label: '博客' },
  { to: '/portfolio', label: '作品' },
  { to: '/albums', label: '影像' },
  { to: '/about', label: '关于' },
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
  <div :class="['site-shell', { 'is-home': route.path === '/', 'is-blog': route.path.startsWith('/blog'), 'is-portfolio': route.path.startsWith('/portfolio'), 'is-about': route.path === '/about', 'is-archive': route.path.startsWith('/albums') || route.path.startsWith('/photos'), 'has-public-nav': !route.path.startsWith('/photos/'), 'is-viewer': route.path.startsWith('/photos/') }]">
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="返回首页">
          <span class="brand-mark">FY</span>
          <span class="brand-text">
            <strong>FAN / Y</strong>
            <small>ARCHIVE</small>
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
          <div class="primary-nav">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :class="{ active: activePath === link.to || (link.to !== '/' && activePath.startsWith(link.to)) }"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
          <div class="nav-tools">
            <button class="sound-toggle" type="button" :aria-pressed="soundOn" aria-label="切换声音" @click="soundOn = !soundOn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
                <path v-if="soundOn" d="M16 9.5c1.5 1.4 1.5 3.6 0 5M18.5 7c2.8 2.5 2.8 7.5 0 10" />
                <path v-else d="m17 9 4 6m0-6-4 6" />
              </svg>
            </button>
            <span class="online-status" aria-label="站点在线"><i /> ONLINE</span>
            <span class="nav-divider" />
            <NuxtLink v-if="currentUser" to="/admin" class="nav-tool">后台</NuxtLink>
            <button v-if="currentUser" class="nav-action nav-tool" type="button" @click="handleLogout">退出</button>
            <NuxtLink v-else to="/admin/login" class="nav-tool">登录</NuxtLink>
          </div>
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

    <ProductionFloatPanel />
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
  flex: 1;
  margin-left: auto;
}

.primary-nav,
.nav-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tools {
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

.site-shell.is-home {
  background: #07121f;
}

.site-shell.has-public-nav .site-header {
  position: fixed;
  left: 50%;
  top: 24px;
  width: min(1600px, calc(100% - 76px));
  transform: translateX(-50%);
  border: 1px solid rgba(211, 218, 220, .34);
  border-radius: 16px;
  background: rgba(91, 101, 106, .31);
  box-shadow: 0 18px 40px rgba(0, 0, 0, .2);
  backdrop-filter: blur(24px) saturate(.72);
}

.site-shell.has-public-nav .header-inner {
  max-width: none;
  min-height: 66px;
  padding-left: 32px;
  padding-right: 28px;
}

.site-shell.has-public-nav .brand,
.site-shell.has-public-nav .site-nav a,
.site-shell.has-public-nav .nav-action {
  color: #c7d6df;
}

.site-shell.has-public-nav .brand-mark {
  width: auto;
  height: auto;
  background: none;
  box-shadow: none;
  color: #edf5f8;
  font-size: 25px;
  font-weight: 400;
}

.site-shell.has-public-nav .brand-text strong { display: none; }
.site-shell.has-public-nav .brand-text small { color: #8fa2af; font-size: 13px; letter-spacing: .18em; }
.site-shell.has-public-nav .site-nav { position: relative; justify-content: center; gap: 0; }
.site-shell.has-public-nav .primary-nav { justify-content: center; gap: 12px; }
.site-shell.has-public-nav .nav-tools { position: absolute; right: 0; gap: 8px; }
.site-shell.has-public-nav .primary-nav a { border-radius: 0; padding: 22px 15px; }
.site-shell.has-public-nav .primary-nav a:hover,
.site-shell.has-public-nav .primary-nav a.active { color: #f1f7fa; background: transparent; border-color: transparent; box-shadow: inset 0 -2px #55c9ef; }
.site-shell.has-public-nav .nav-divider { background: rgba(174, 206, 219, .25); }
.site-shell.has-public-nav .nav-tool { align-self: center; display: inline-flex; align-items: center; justify-content: center; min-height: 34px; padding: 6px 17px; border: 1px solid rgba(210, 219, 221, .48); border-radius: 10px; background: rgba(145, 153, 157, .14); line-height: 1; }
.site-shell.has-public-nav .sound-toggle { display: inline-grid; place-items: center; width: 36px; height: 34px; padding: 5px 8px; border: 0; color: #d6e3e9; background: transparent; cursor: pointer; }
.site-shell.has-public-nav .sound-toggle svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.site-shell.has-public-nav .online-status { display: inline-flex; align-items: center; gap: 6px; color: #a6bac5; font: 10px var(--font-mono); letter-spacing: .08em; }
.site-shell.has-public-nav .online-status i { width: 8px; height: 8px; border-radius: 50%; background: #5bd2f3; box-shadow: 0 0 12px #5bd2f3; }
.site-shell.has-public-nav .site-footer { border-top-color: rgba(163, 196, 211, .2); color: #77909f; }
.site-shell.has-public-nav .footer-note { color: #8ca3b0; }
.site-shell.is-portfolio,
.site-shell.is-about { background: #061321; color: #dce9ee; }

.site-shell.is-blog { background: #061322; color: #e9f2f5; }
.site-shell.is-archive { background: #061321; color: #dce9ee; }
.site-shell.is-viewer .site-header,
.site-shell.is-viewer .site-footer { display: none; }
.site-shell.is-viewer { background: #050f1c; }

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

  .primary-nav,
  .nav-tools {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .nav-tools {
    margin-left: 0;
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

  .site-shell.has-public-nav .site-header { top: 12px; width: calc(100% - 24px); }
  .site-shell.has-public-nav .header-inner { padding-left: 18px; padding-right: 12px; }
  .site-shell.has-public-nav .site-nav { top: 64px; background: rgba(8, 22, 35, .96); }
  .site-shell.has-public-nav .primary-nav { gap: 6px; }
  .site-shell.has-public-nav .nav-tools { position: static; }
  .site-shell.has-public-nav .primary-nav a { padding: 13px 14px; }
  .site-shell.has-public-nav .online-status,
  .site-shell.has-public-nav .sound-toggle,
  .site-shell.has-public-nav .nav-divider { display: none; }
}
</style>
