<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from '#imports'

const router = useRouter()
const route = useRoute()
const isCollapse = ref(false)
const user = ref<{ name: string; role: string } | null>(null)

onMounted(() => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    user.value = null
  }
})

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/admin/login')
}

// 侧边栏菜单项
const menuItems = [
  { index: '/admin', icon: '📊', label: '仪表盘' },
  { index: '/admin/articles', icon: '📝', label: '文章管理' },
  { index: '/admin/photos', icon: '📷', label: '照片管理' },
  { index: '/admin/albums', icon: '📁', label: '相册管理' },
  { index: '/admin/users', icon: '👥', label: '用户管理' },
  { index: '/admin/storage', icon: '💾', label: '存储管理' },
  { index: '/admin/audit', icon: '📋', label: '审计日志' },
  { index: '/admin/content-pipeline', icon: '🔄', label: '内容流水线' },
  { index: '/admin/hermes', icon: '🤖', label: 'Hermes AI' },
]

function handleMenuSelect(index: string) {
  router.push(index)
}
</script>

<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="admin-aside">
      <div class="logo-area" @click="router.push('/admin')">
        <span v-if="!isCollapse" class="logo-text">🔧 Admin</span>
        <span v-else class="logo-text">🔧</span>
      </div>

      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        class="admin-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.index"
          :index="item.index"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>

      <div class="collapse-btn" @click="isCollapse = !isCollapse">
        {{ isCollapse ? '▶' : '◀' }}
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 顶部栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">管理后台</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path !== '/admin'">
              {{ menuItems.find(m => m.index === route.path)?.label || '页面' }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span v-if="user" class="user-info">
            {{ user.name }} ({{ user.role }})
          </span>
          <el-button text @click="router.push('/')">🌐 前台</el-button>
          <el-button text type="danger" @click="handleLogout">🚪 退出</el-button>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="admin-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-aside {
  background: #1e1e2d;
  color: #fff;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo-area {
  padding: 20px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.admin-menu {
  flex: 1;
  border: none;
  background: transparent;
}

.admin-menu .el-menu-item {
  color: #a2a3b7;
  height: 48px;
  line-height: 48px;
}

.admin-menu .el-menu-item:hover,
.admin-menu .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu-icon {
  margin-right: 8px;
  font-size: 16px;
}

.collapse-btn {
  padding: 12px;
  text-align: center;
  cursor: pointer;
  color: #a2a3b7;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.collapse-btn:hover {
  color: #fff;
}

.main-container {
  background: #f5f7fa;
}

.admin-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  font-size: 14px;
  color: #606266;
}

.admin-main {
  padding: 20px;
}
</style>
