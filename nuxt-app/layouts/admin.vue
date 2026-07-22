<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)
const user = ref<any>(null)
const localTrusted = ref(false)

onMounted(() => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    user.value = null
  }
  if (user.value?.role === 'admin') {
    useAuthFetch()('/api/admin/access-origin').then((res: any) => { localTrusted.value = res.data?.origin === 'local_trusted' }).catch(() => {})
  }
})

const allMenu = [
  ['/admin', '仪表盘'],
  ['/admin/articles', '文章管理'],
  ['/admin/photos', '照片管理'],
  ['/admin/albums', '相册管理'],
  ['/admin/users', '用户管理'],
  ['/admin/storage', '存储管理'],
  ['/admin/audit', '审计日志'],
  ['/admin/content-pipeline', '内容流水线'],
  ['/admin/hermes', 'AI 与技能'],
] as const

const menu = computed(() => {
  if (user.value?.role === 'admin') return localTrusted.value ? [...allMenu, ['/admin/local-ops', '本地高权限'] as const] : allMenu
  return allMenu.filter(([path]) => ['/admin', '/admin/photos', '/admin/storage'].includes(path))
})

const currentLabel = computed(
  () => menu.value.find(item => item[0] === route.path)?.[1] || '页面',
)

function navigate(path: string) {
  mobileOpen.value = false
  router.push(path)
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/admin/login')
}
</script>

<template>
  <el-container class="admin-layout">
    <div v-if="mobileOpen" class="mobile-scrim" @click="mobileOpen = false" />

    <el-aside
      :width="collapsed ? '84px' : '248px'"
      :class="['admin-aside', { 'mobile-open': mobileOpen, collapsed }]"
    >
      <div class="admin-brand" @click="navigate('/admin')">
        <span class="brand-mark">FY</span>
        <span v-if="!collapsed" class="brand-copy">
          <strong>CONTROL / ROOM</strong>
          <small>personal archive</small>
        </span>
      </div>

      <div v-if="!collapsed" class="aside-caption">
        管理相册、文章、存储与自动化流水线
      </div>

      <el-menu :default-active="route.path" class="admin-menu" @select="navigate">
        <el-menu-item
          v-for="([path, label], index) in menu"
          :key="path"
          :index="path"
        >
          <span class="menu-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span v-if="!collapsed">{{ label }}</span>
        </el-menu-item>
      </el-menu>

      <button class="collapse" type="button" @click="collapsed = !collapsed">
        {{ collapsed ? '展开侧栏' : '收起侧栏' }}
      </button>
    </el-aside>

    <el-container>
      <el-header class="admin-header">
        <button class="mobile-menu" aria-label="打开后台菜单" @click="mobileOpen = true">
          ☰
        </button>
        <el-breadcrumb>
          <el-breadcrumb-item :to="{ path: '/admin' }">管理后台</el-breadcrumb-item>
          <el-breadcrumb-item v-if="route.path !== '/admin'">
            {{ currentLabel }}
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="header-actions">
          <span v-if="user" class="user-name">{{ user.name || user.username }}</span>
          <el-tag v-if="user && user.role !== 'admin'" size="small" type="info">普通用户</el-tag>
          <el-tag v-if="user && user.role === 'admin'" size="small" type="warning">远程管理员</el-tag>
          <el-button text @click="navigate('/')">查看前台</el-button>
          <el-button text type="danger" @click="logout">退出</el-button>
        </div>
      </el-header>

      <el-main class="admin-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: transparent;
  color: var(--color-text);
}

.admin-aside {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(208, 213, 221, .9);
  background:
    linear-gradient(180deg, rgba(17, 24, 39, .98), rgba(15, 23, 42, .98));
  color: #e5e7eb;
  box-shadow: 18px 0 40px rgba(15, 23, 42, .12);
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 72px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(148, 163, 184, .18);
  cursor: pointer;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(145deg, #38bdf8, #2563eb);
  color: #fff;
  font: 700 12px var(--font-mono);
  box-shadow: 0 10px 24px rgba(37, 99, 235, .24);
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-copy strong {
  font-size: 12px;
  letter-spacing: .08em;
}

.brand-copy small {
  font: 11px var(--font-mono);
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.aside-caption {
  padding: 18px 18px 10px;
  color: #94a3b8;
  font: 11px var(--font-mono);
  letter-spacing: .08em;
}

.admin-menu {
  flex: 1;
  border: 0;
  background: transparent;
}

.admin-menu :deep(.el-menu-item) {
  height: 46px;
  margin: 4px 10px;
  border-radius: 12px;
  color: #cbd5e1;
  gap: 10px;
  padding-left: 14px !important;
  padding-right: 14px;
}

.admin-menu :deep(.el-menu-item.is-active),
.admin-menu :deep(.el-menu-item:hover) {
  color: #fff;
  background: rgba(59, 130, 246, .16);
}

.menu-index {
  width: 22px;
  font: 10px var(--font-mono);
  color: #94a3b8;
}

.collapse {
  margin: 12px;
  border: 1px solid rgba(148, 163, 184, .26);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, .35);
  color: #e5e7eb;
  cursor: pointer;
}

.admin-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(208, 213, 221, .9);
  background: rgba(255, 255, 255, .82);
  backdrop-filter: blur(16px);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.admin-main {
  padding: clamp(18px, 3vw, 32px);
}

.mobile-menu {
  display: none;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 12px;
  width: 42px;
  height: 42px;
  font-size: 18px;
  color: var(--color-text);
}

.mobile-scrim {
  display: none;
}

@media (max-width: 760px) {
  .admin-aside {
    position: fixed;
    inset: 0 auto 0 0;
    width: 252px !important;
    transform: translateX(-100%);
    transition: transform .2s ease;
  }

  .admin-aside.mobile-open {
    transform: none;
  }

  .mobile-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 10;
    background: rgba(16, 24, 40, .52);
  }

  .mobile-menu {
    display: inline-grid;
    place-items: center;
  }

  .admin-header {
    padding: 0 12px;
  }

  .admin-header :deep(.el-breadcrumb) {
    display: none;
  }

  .header-actions .user-name,
  .header-actions :deep(.el-button) { display: inline-flex; padding: 6px; }

  .admin-main {
    padding: 16px;
  }
}
</style>
