<script setup lang="ts">
const router = useRouter(); const route = useRoute(); const collapsed = ref(false); const mobileOpen = ref(false); const user = ref<any>(null)
onMounted(() => { try { user.value = JSON.parse(localStorage.getItem('user') || 'null') } catch {} })
const menu = [['/admin','仪表盘'],['/admin/articles','文章管理'],['/admin/photos','照片管理'],['/admin/albums','相册管理'],['/admin/users','用户管理'],['/admin/storage','存储管理'],['/admin/audit','审计日志'],['/admin/content-pipeline','内容流水线'],['/admin/hermes','AI 与技能']]
function navigate(path:string){ mobileOpen.value=false; router.push(path) }
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');router.push('/admin/login')}
</script>
<template>
  <el-container class="admin-layout">
    <div v-if="mobileOpen" class="mobile-scrim" @click="mobileOpen=false" />
    <el-aside :width="collapsed ? '76px' : '236px'" :class="['admin-aside',{ 'mobile-open': mobileOpen }]">
      <div class="admin-brand" @click="navigate('/admin')"><span class="brand-dot">✳</span><span v-if="!collapsed">CONTROL / ROOM</span></div>
      <div class="aside-caption" v-if="!collapsed">PERSONAL ARCHIVE</div>
      <el-menu :default-active="route.path" class="admin-menu" @select="navigate"><el-menu-item v-for="([path,label]) in menu" :key="path" :index="path"><span class="menu-index">{{ String(menu.findIndex(item => item[0] === path)+1).padStart(2,'0') }}</span><span v-if="!collapsed">{{ label }}</span></el-menu-item></el-menu>
      <button class="collapse" @click="collapsed=!collapsed">{{ collapsed ? '→' : '收起侧栏' }}</button>
    </el-aside>
    <el-container><el-header class="admin-header"><button class="mobile-menu" aria-label="打开后台菜单" @click="mobileOpen=true">☰</button><el-breadcrumb><el-breadcrumb-item :to="{path:'/admin'}">管理后台</el-breadcrumb-item><el-breadcrumb-item v-if="route.path!=='/admin'">{{ menu.find(item=>item[0]===route.path)?.[1] || '页面' }}</el-breadcrumb-item></el-breadcrumb><div class="header-actions"><span v-if="user" class="user-name">{{ user.name || user.username }}</span><el-button text @click="navigate('/')">查看前台</el-button><el-button text type="danger" @click="logout">退出</el-button></div></el-header><el-main class="admin-main"><slot /></el-main></el-container>
  </el-container>
</template>
<style scoped>
.admin-layout{min-height:100vh;background:var(--color-bg);color:var(--color-text)}.admin-aside{position:relative;z-index:20;display:flex;flex-direction:column;background:#20251f;color:#e7e3da}.admin-brand{display:flex;align-items:center;gap:10px;height:76px;padding:0 20px;border-bottom:1px solid #3d463d;cursor:pointer;font:700 12px var(--font-mono);letter-spacing:.1em;white-space:nowrap}.brand-dot{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#d7c6a8;color:#20251f}.aside-caption{padding:24px 20px 9px;color:#91a08f;font:10px var(--font-mono);letter-spacing:.12em}.admin-menu{flex:1;border:0;background:transparent}.admin-menu :deep(.el-menu-item){height:46px;color:#adb8ac;padding-left:20px!important;gap:11px}.admin-menu :deep(.el-menu-item.is-active),.admin-menu :deep(.el-menu-item:hover){background:#39443a;color:#f5f1e8}.menu-index{font:10px var(--font-mono);color:#879681}.collapse{margin:12px;border:1px solid #495548;border-radius:4px;padding:10px;background:transparent;color:#cbd5c6;cursor:pointer}.admin-header{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border);background:var(--color-surface)}.header-actions{display:flex;align-items:center;gap:8px}.user-name{font-size:13px;color:var(--color-text-secondary)}.admin-main{background:var(--color-bg);padding:clamp(18px,3vw,32px)}.mobile-menu{display:none;border:0;background:none;font-size:20px;color:var(--color-text);margin-right:10px}.mobile-scrim{display:none}@media(max-width:760px){.admin-aside{position:fixed;inset:0 auto 0 0;width:236px!important;transform:translateX(-100%);transition:transform .2s}.admin-aside.mobile-open{transform:none}.mobile-scrim{display:block;position:fixed;inset:0;z-index:10;background:#1e211d88}.mobile-menu{display:block}.admin-header{padding:0 12px}.admin-header :deep(.el-breadcrumb){display:none}.header-actions .user-name,.header-actions :deep(.el-button:first-of-type){display:none}.admin-main{padding:16px}}
</style>
