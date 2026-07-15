<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()
const activeMenu = computed(() => route.path)
const currentYear = computed(() => new Date().getFullYear())
const siteName = 'Your Name'

const hasAiAccess = ref(false)
const currentUser = ref<{ name: string; role: string } | null>(null)

onMounted(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user) {
      currentUser.value = user
      hasAiAccess.value = user?.aiAccess === true
    }
  } catch {
    currentUser.value = null
    hasAiAccess.value = false
  }
})

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  currentUser.value = null
  hasAiAccess.value = false
  navigateTo('/')
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- Navigation -->
    <header class="nav-header">
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        :ellipsis="false"
        class="nav-menu"
        router
      >
        <div class="nav-brand">Portfolio</div>
        <div class="nav-spacer" />
        <el-menu-item index="/">
          首页
        </el-menu-item>
        <el-menu-item index="/blog">
          博客
        </el-menu-item>
        <el-menu-item index="/portfolio">
          作品集
        </el-menu-item>
        <el-menu-item index="/blog/archive">
          归档
        </el-menu-item>
        <el-menu-item index="/albums">
          照片相册
        </el-menu-item>
        <el-menu-item index="/skills">
          Skills
        </el-menu-item>
        <el-menu-item v-if="hasAiAccess" index="/ai">
          AI 助手
        </el-menu-item>
        <!-- 已登录状态 -->
        <template v-if="currentUser">
          <el-sub-menu index="user-menu">
            <template #title>
              <span class="user-greeting">👤 {{ currentUser.name }}</span>
            </template>
            <el-menu-item index="/admin">
              🔧 管理后台
            </el-menu-item>
            <el-menu-item @click="handleLogout">
              🚪 退出登录
            </el-menu-item>
          </el-sub-menu>
        </template>
        <!-- 未登录状态 -->
        <el-menu-item v-else index="/admin/login">
          🔐 登录
        </el-menu-item>
      </el-menu>
    </header>

    <!-- Page Content -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="site-footer">
      <p>© {{ currentYear }} {{ siteName }}. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped>
.layout-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--color-text);
  font-family: var(--font-family);
}

/* Navigation */
.nav-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-bg);
  box-shadow: var(--shadow-light);
}

.nav-menu {
  max-width: var(--max-width);
  margin: 0 auto;
  border-bottom: none !important;
}

.nav-brand {
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}

.nav-spacer {
  flex: 1;
}

/* Main Content */
.main-content {
  flex: 1;
}

/* Footer */
.site-footer {
  text-align: center;
  padding: 24px 20px;
  background: var(--color-text);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-top: auto;
}

.site-footer p {
  margin: 0;
}

.user-greeting {
  font-size: 14px;
  color: var(--color-primary);
}
</style>
