<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

definePageMeta({ layout: 'admin' })
const authFetch = useAuthFetch()
const jobs = ref<any[]>([])
const loading = ref(false)

async function loadJobs() {
  loading.value = true
  try { jobs.value = (await authFetch<any>('/api/admin/content-pipeline/jobs')).data || [] }
  catch (error: any) { ElMessage.error(error?.data?.message || '加载任务失败') }
  finally { loading.value = false }
}

async function action(job: any, operation: 'run' | 'retry' | 'cancel') {
  try {
    await authFetch(`/api/admin/content-pipeline/jobs/${job.id}`, { method: 'PATCH', body: { action: operation } })
    ElMessage.success(operation === 'run' ? '任务已执行' : operation === 'retry' ? '任务已重新排队' : '任务已取消')
    await loadJobs()
  } catch (error: any) { ElMessage.error(error?.data?.message || '任务操作失败') }
}

onMounted(loadJobs)
</script>

<template>
  <div class="page">
    <div class="header"><div><h2>Jobs 运维</h2><p>查看内容流水线任务，执行、重试或取消操作。</p></div><el-button :loading="loading" @click="loadJobs">刷新</el-button></div>
    <el-table v-loading="loading" :data="jobs" stripe border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="type" label="类型" min-width="190" />
      <el-table-column prop="status" label="状态" width="170" />
      <el-table-column prop="attempts" label="尝试次数" width="110" />
      <el-table-column prop="createdAt" label="创建时间" width="190" />
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" type="primary" text @click="action(row, 'run')">执行</el-button>
          <el-button v-if="['failed', 'completed_with_errors', 'cancelled'].includes(row.status)" type="warning" text @click="action(row, 'retry')">重试</el-button>
          <el-button v-if="['pending', 'running'].includes(row.status)" type="danger" text @click="action(row, 'cancel')">取消</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>.page{width:100%}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.header h2{margin:0 0 6px}.header p{margin:0;color:#667085}</style>
