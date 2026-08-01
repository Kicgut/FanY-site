<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)
const user = ref<any>(null)
const localTrusted = ref(false)
const overview = ref<any>(null)

onMounted(() => {
  try { user.value = JSON.parse(localStorage.getItem('user') || 'null') } catch { user.value = null }
  if (user.value?.role === 'admin' || user.value?.role === 'superadmin') {
    useAuthFetch()('/api/admin/access-origin').then((res: any) => { localTrusted.value = res.data?.origin === 'local_trusted' }).catch(() => {})
    useAuthFetch()('/api/admin/overview').then((res: any) => { overview.value = res.data }).catch(() => {})
  }
})

type NavItem = { path: string; label: string; icon: string; badge?: () => number }
const groups: { label: string; items: NavItem[] }[] = [
  { label: '概览', items: [{ path: '/admin', label: '控制室', icon: '◈' }] },
  { label: '内容', items: [{ path: '/admin/articles', label: '文章', icon: '▤' }, { path: '/admin/portfolio', label: '作品', icon: '◇' }, { path: '/admin/photos', label: '照片', icon: '▧', badge: () => overview.value?.pendingPhotos || 0 }, { path: '/admin/albums', label: '相册', icon: '▦' }] },
  { label: '流程', items: [{ path: '/admin/content-pipeline', label: '内容流水线', icon: '↝', badge: () => overview.value?.pendingCandidates || 0 }, { path: '/admin/jobs', label: '任务中心', icon: '◌', badge: () => overview.value?.failedJobs || 0 }, { path: '/admin/hermes', label: 'AI 与技能', icon: '✦' }] },
  { label: '系统', items: [{ path: '/admin/storage', label: '存储', icon: '▱' }, { path: '/admin/audit', label: '审计日志', icon: '≡' }, { path: '/admin/users', label: '用户与分组', icon: '◉' }, { path: '/admin/security', label: '账户安全', icon: '◇' }] },
]
const menuGroups = computed(() => {
  const allowed = user.value?.role === 'superadmin' ? null : user.value?.role === 'admin' ? new Set(['/admin', '/admin/portfolio', '/admin/photos', '/admin/albums', '/admin/security']) : new Set(['/admin', '/admin/security'])
  return groups.map(group => ({ ...group, items: group.items.filter(item => !allowed || allowed.has(item.path)) })).filter(group => group.items.length)
})
const currentLabel = computed(() => groups.flatMap(group => group.items).find(item => item.path === route.path)?.label || (route.path === '/admin/local-ops' ? '本地高权限' : '页面'))
function navigate(path: string) { mobileOpen.value = false; router.push(path) }
function navigateLocalOps() { if (localTrusted.value) navigate('/admin/local-ops') }
async function logout() {
  try { await useAuthFetch()('/api/auth/logout', { method: 'POST' }) } catch { /* token may already be invalid */ }
  localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); router.push('/admin/login')
}
</script>

<template>
  <el-container class="admin-layout">
    <div v-if="mobileOpen" class="mobile-scrim" @click="mobileOpen = false" />
    <el-aside :width="collapsed ? '84px' : '264px'" :class="['admin-aside', { 'mobile-open': mobileOpen, collapsed }]">
      <div class="admin-brand" @click="navigate('/admin')"><span class="brand-mark">FY</span><span v-if="!collapsed" class="brand-copy"><strong>CONTROL / ROOM</strong><small>personal archive</small></span></div>
      <div v-if="!collapsed" class="aside-caption">内容审核、状态追踪与受控运维</div>
      <el-menu :default-active="route.path" class="admin-menu" @select="navigate">
        <template v-for="group in menuGroups" :key="group.label">
          <div v-if="!collapsed" class="menu-group-label">{{ group.label }}</div>
          <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path"><span class="menu-icon" aria-hidden="true">{{ item.icon }}</span><span v-if="!collapsed" class="menu-label">{{ item.label }}</span><span v-if="!collapsed && item.badge?.()" class="menu-badge">{{ Math.min(item.badge?.() || 0, 99) }}<template v-if="(item.badge?.() || 0) > 99">+</template></span></el-menu-item>
        </template>
      </el-menu>
      <button v-if="user?.role === 'superadmin'" :class="['local-ops-link', { disabled: !localTrusted }]" type="button" :title="localTrusted ? '打开本地高权限操作' : '仅限本地受信任网络访问'" @click="navigateLocalOps"><span aria-hidden="true">⌑</span><span v-if="!collapsed">本地高权限</span><small v-if="!collapsed">{{ localTrusted ? '可用' : '远程受限' }}</small></button>
      <button class="collapse" type="button" @click="collapsed = !collapsed">{{ collapsed ? '展开侧栏' : '收起侧栏' }}</button>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <button class="mobile-menu" aria-label="打开后台菜单" @click="mobileOpen = true">☰</button>
        <el-breadcrumb><el-breadcrumb-item :to="{ path: '/admin' }">管理后台</el-breadcrumb-item><el-breadcrumb-item v-if="route.path !== '/admin'">{{ currentLabel }}</el-breadcrumb-item></el-breadcrumb>
        <div class="header-actions"><span v-if="user" :class="['environment', { trusted: localTrusted }]">{{ localTrusted ? '本地受信任' : '远程受限' }}</span><NuxtLink class="todo-link" to="/admin/photos?review=pending" aria-label="查看待审核照片">待办 <b>{{ (overview?.pendingPhotos || 0) + (overview?.pendingCandidates || 0) }}</b></NuxtLink><span v-if="user" class="user-name">{{ user.name || user.username }}</span><el-button text @click="navigate('/')">查看前台</el-button><el-button text type="danger" @click="logout">退出</el-button></div>
      </el-header>
      <el-main class="admin-main"><slot /></el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout { min-height: 100vh; color: #e8f2f7; background: #08111e; }
.admin-aside { position: relative; z-index: 20; display: flex; flex-direction: column; border-right: 1px solid rgba(148,184,214,.18); background: linear-gradient(180deg,#0c1828,#091421); color:#e5e7eb; box-shadow:18px 0 40px rgba(0,0,0,.16); }
.admin-brand { display:flex; align-items:center; gap:12px; height:72px; padding:0 18px; border-bottom:1px solid rgba(148,163,184,.18); cursor:pointer; }.brand-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(137,222,243,.74);border-radius:11px;background:rgba(62,190,222,.15);color:#d9f8ff;font:700 12px var(--font-mono)}.brand-copy{display:flex;flex-direction:column}.brand-copy strong{font-size:12px;letter-spacing:.08em}.brand-copy small{font:11px var(--font-mono);color:#94a3b8;letter-spacing:.08em}.aside-caption{padding:18px 18px 2px;color:#91a9b8;font:11px var(--font-mono);letter-spacing:.04em}.admin-menu{flex:1;border:0;background:transparent}.menu-group-label{margin:20px 18px 6px;color:#71869a;font:10px var(--font-mono);letter-spacing:.14em}.admin-menu :deep(.el-menu-item){height:46px;margin:4px 10px;border-radius:10px;color:#cbd5e1;gap:10px;padding-left:14px!important;padding-right:14px}.admin-menu :deep(.el-menu-item.is-active),.admin-menu :deep(.el-menu-item:hover){color:#fff;background:rgba(59,179,211,.14)}.menu-icon{width:22px;color:#8da6b9;font:15px/1 var(--font-mono);text-align:center}.menu-label{flex:1}.menu-badge{min-width:20px;padding:1px 6px;border-radius:999px;color:#b8f0fb;background:rgba(73,201,230,.14);font:10px var(--font-mono);text-align:center}.local-ops-link{display:flex;align-items:center;gap:10px;margin:12px;padding:11px 12px;border:1px solid rgba(220,172,93,.36);border-radius:10px;color:#edcf9d;background:rgba(143,100,36,.11);cursor:pointer;text-align:left}.local-ops-link small{margin-left:auto;color:#c8a66c;font:10px var(--font-mono)}.local-ops-link.disabled{opacity:.75;cursor:not-allowed}.collapse{margin:12px;border:1px solid rgba(148,184,214,.26);border-radius:10px;padding:10px 12px;background:rgba(15,23,42,.35);color:#e5e7eb;cursor:pointer}.admin-header{height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(148,184,214,.18);background:rgba(11,21,35,.78);backdrop-filter:blur(16px)}.header-actions{display:flex;align-items:center;gap:10px}.environment,.todo-link{display:inline-flex;align-items:center;min-height:30px;padding:0 9px;border:1px solid rgba(201,155,82,.35);border-radius:999px;color:#e0b86d;background:rgba(144,97,30,.12);font-size:12px;text-decoration:none}.environment.trusted{border-color:rgba(68,196,174,.35);color:#7fe3cf;background:rgba(34,136,118,.12)}.todo-link{border-color:rgba(148,184,214,.23);color:#c8dce8;background:rgba(148,184,214,.08);gap:6px}.todo-link b{color:#91e7f8;font:11px var(--font-mono)}.user-name{font-size:13px;color:#a9c0cf}.admin-main{padding:clamp(18px,3vw,32px)}.mobile-menu{display:none;border:1px solid rgba(148,184,214,.3);background:#0e1a2a;border-radius:10px;width:42px;height:42px;font-size:18px;color:#e8f2f7}.mobile-scrim{display:none}@media(max-width:760px){.admin-aside{position:fixed;inset:0 auto 0 0;width:282px!important;transform:translateX(-100%);transition:transform .2s ease}.admin-aside.mobile-open{transform:none}.mobile-scrim{display:block;position:fixed;inset:0;z-index:10;background:rgba(2,8,14,.7)}.mobile-menu{display:inline-grid;place-items:center}.admin-header{padding:0 12px}.admin-header :deep(.el-breadcrumb){display:none}.header-actions .user-name,.header-actions :deep(.el-button),.environment{display:none}.todo-link{min-height:34px}.admin-main{padding:16px}}
</style>
