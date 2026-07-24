<script setup lang="ts">
import { computed, ref } from 'vue'

definePageMeta({ layout: 'admin' })
const authFetch = useAuthFetch()
const { data, status, error, refresh } = await useAsyncData('storage', () => authFetch<any>('/api/admin/storage'))
const stats = computed(() => data.value?.data || {})
const totalBytes = computed(() => stats.value.totalBytes || 0)
const count = (key: 'syncStatus' | 'thumbnailStatus' | 'visibility', value: string) => stats.value[key]?.[value] || 0
const gb = computed(() => (totalBytes.value / 1024 / 1024 / 1024).toFixed(2))
const consistency = ref<any>(null)
const checking = ref(false)

async function checkConsistency() {
  checking.value = true
  try { consistency.value = (await authFetch<any>('/api/admin/storage/consistency')).data } finally { checking.value = false }
}
</script>

<template>
  <div class="page">
    <div class="page-header"><div><h2>存储管理</h2><p>查看照片数量、文件大小和同步状态。</p></div><el-button @click="refresh">刷新</el-button></div>
    <el-alert v-if="error" type="error" title="加载存储统计失败" :description="error.message" show-icon />
    <div v-loading="status === 'pending'" class="grid">
      <el-card><template #header>照片总数</template><strong>{{ stats.photoCount || 0 }}</strong><small>张</small></el-card>
      <el-card><template #header>估算占用空间</template><strong>{{ gb }}</strong><small>GB</small></el-card>
      <el-card><template #header>原图回流</template><p>已回流：{{ count('syncStatus', 'synced') }}</p><p>待回流：{{ count('syncStatus', 'pending') }}</p><p>失败：{{ count('syncStatus', 'failed') }}</p></el-card>
      <el-card><template #header>缩略图同步</template><p>已完成：{{ count('thumbnailStatus', 'ready') }}</p><p>待处理：{{ count('thumbnailStatus', 'pending') }}</p><p>失败：{{ count('thumbnailStatus', 'failed') }}</p></el-card>
      <el-card><template #header>可见范围</template><p>公开：{{ count('visibility', 'public') }}</p><p>朋友：{{ count('visibility', 'friends') }}</p><p>私有：{{ count('visibility', 'private') }}</p></el-card>
    </div>
    <div class="ops"><el-button :loading="checking" @click="checkConsistency">扫描存储一致性</el-button><el-alert v-if="consistency" :type="consistency.healthy ? 'success' : 'warning'" :title="consistency.healthy ? `扫描 ${consistency.scanned} 项，未发现缺失文件` : `发现 ${consistency.missingOriginals.length + consistency.missingThumbnails.length} 个缺失文件`" :closable="false" /></div>
    <el-alert class="note" type="info" title="运维提示" description="原图回流由 Ubuntu 定时任务执行；一致性扫描只读，不会自动删除文件。" show-icon :closable="false" />
  </div>
</template>

<style scoped>
.page{width:100%}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.page-header h2{margin:0 0 6px}.page-header p{margin:0;color:#909399}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.grid strong{font-size:32px}.grid small{margin-left:6px;color:#909399}.grid p{margin:8px 0}.ops{display:flex;align-items:center;gap:14px;margin-top:20px}.ops .el-alert{flex:1}.note{margin-top:20px}
</style>
