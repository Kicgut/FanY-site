<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const authFetch = useAuthFetch()
const route = useRoute()
const router = useRouter()

definePageMeta({ layout: 'admin' })

interface AuditLogEntry {
  id: number
  userId: number | null
  action: string
  resourceType: string
  resourceId: string | null
  beforeJson: string | null
  afterJson: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
  user: { id: number; username: string; name: string } | null
}

interface StatsEntry {
  action: string
  count: number
}

const loading = ref(false)
const logs = ref<AuditLogEntry[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const stats = ref<StatsEntry[]>([])

// Filters
const filters = reactive({
  action: typeof route.query.action === 'string' ? route.query.action : '',
  resourceType: typeof route.query.resourceType === 'string' ? route.query.resourceType : '',
  userId: typeof route.query.userId === 'string' ? route.query.userId : '',
  startDate: typeof route.query.startDate === 'string' ? route.query.startDate : '',
  endDate: typeof route.query.endDate === 'string' ? route.query.endDate : '',
})

// Detail dialog
const detailVisible = ref(false)
const selectedLog = ref<AuditLogEntry | null>(null)

const actionOptions = [
  'photo_approve',
  'photo_reject',
  'photo_upload',
  'user_update',
  'article_delete',
]

const resourceTypeOptions = ['photo', 'user', 'article']

async function fetchLogs() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('limit', String(limit.value))
    if (filters.action) params.set('action', filters.action)
    if (filters.resourceType) params.set('resourceType', filters.resourceType)
    if (filters.userId) params.set('userId', filters.userId)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)

    const res = await authFetch<any>(`/api/admin/audit-logs?${params.toString()}`)
    if (res.success) {
      logs.value = res.data.logs
      total.value = res.data.total
    }
  } catch (err: any) {
    ElMessage.error('Failed to load audit logs')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await authFetch<any>('/api/admin/audit-logs/stats')
    if (res.success) {
      stats.value = res.data
    }
  } catch {
    // silent
  }
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchLogs()
}

function handleSizeChange(newSize: number) {
  limit.value = newSize
  page.value = 1
  fetchLogs()
}

function handleSearch() {
  page.value = 1
  const query: Record<string, string> = {}
  if (filters.action) query.action = filters.action
  if (filters.resourceType) query.resourceType = filters.resourceType
  if (filters.userId) query.userId = filters.userId
  if (filters.startDate) query.startDate = filters.startDate
  if (filters.endDate) query.endDate = filters.endDate
  router.replace({ query })
  fetchLogs()
}

function handleReset() {
  filters.action = ''
  filters.resourceType = ''
  filters.userId = ''
  filters.startDate = ''
  filters.endDate = ''
  page.value = 1
  fetchLogs()
}

function showDetail(log: AuditLogEntry) {
  selectedLog.value = log
  detailVisible.value = true
}

function formatJson(str: string | null): string {
  if (!str) return '(none)'
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  fetchLogs()
  fetchStats()
})
</script>

<template>
  <div class="audit-page">
    <header class="page-header"><div><p class="kicker">SYSTEM / AUDIT</p><h1>审计日志</h1><p>按资源、操作者、行为和时间追溯关键操作；详情仅展示脱敏影响摘要。</p></div></header>

    <!-- Stats -->
    <el-card v-if="stats.length" class="stats-card" shadow="never">
      <template #header>
        <span>近期行为摘要</span>
      </template>
      <el-tag
        v-for="s in stats"
        :key="s.action"
        class="stat-tag"
        type="info"
      >
        {{ s.action }}: {{ s.count }}
      </el-tag>
    </el-card>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="行为">
          <el-select v-model="filters.action" clearable placeholder="全部行为" style="width: 160px">
            <el-option v-for="a in actionOptions" :key="a" :label="a" :value="a" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源">
          <el-select v-model="filters.resourceType" clearable placeholder="全部资源" style="width: 130px">
            <el-option v-for="r in resourceTypeOptions" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户 ID">
          <el-input v-model="filters.userId" placeholder="用户 ID" style="width: 100px" />
        </el-form-item>
        <el-form-item label="开始">
          <el-date-picker v-model="filters.startDate" type="datetime" placeholder="开始时间" style="width: 180px" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束">
          <el-date-picker v-model="filters.endDate" type="datetime" placeholder="结束时间" style="width: 180px" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">应用筛选</el-button>
          <el-button @click="handleReset">清除</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <div class="table-surface"><el-table :data="logs" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="createdAt" label="时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作者" width="140">
        <template #default="{ row }">
          {{ row.user?.name || row.userId || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="action" label="行为" width="150">
        <template #default="{ row }">
          <el-tag size="small">{{ row.action }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="resourceType" label="资源类型" width="120" />
      <el-table-column prop="resourceId" label="资源 ID" width="110" />
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column label="详情" width="80">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="showDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table></div>

    <!-- Pagination -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="limit"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailVisible" title="Audit Log Detail" width="700px">
      <div v-if="selectedLog" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ selectedLog.id }}</el-descriptions-item>
          <el-descriptions-item label="Time">{{ formatTime(selectedLog.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="User">{{ selectedLog.user?.name || selectedLog.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Action">{{ selectedLog.action }}</el-descriptions-item>
          <el-descriptions-item label="Resource Type">{{ selectedLog.resourceType }}</el-descriptions-item>
          <el-descriptions-item label="Resource ID">{{ selectedLog.resourceId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="IP">{{ selectedLog.ip || '-' }}</el-descriptions-item>
          <el-descriptions-item label="User Agent" :span="2">
            <span class="ua-text">{{ selectedLog.userAgent || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="json-section">
          <h4>Before (JSON)</h4>
          <pre class="json-block">{{ formatJson(selectedLog.beforeJson) }}</pre>
        </div>

        <div class="json-section">
          <h4>After (JSON)</h4>
          <pre class="json-block">{{ formatJson(selectedLog.afterJson) }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.audit-page {
  max-width: 1200px;
}

.page-header { margin-bottom: 18px; }.kicker { margin: 0 0 8px; color: #72d9ed; font: 11px var(--font-mono); letter-spacing: .15em; }.page-header h1 { margin: 0; color: #edf8fb; font-size: 27px; }.page-header p:not(.kicker) { margin: 8px 0 0; color: #9eb5c2; font-size: 13px; }

.stats-card {
  margin-bottom: 16px;
}

.stat-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

.filter-card {
  margin-bottom: 16px;
}

.table-surface { padding: 6px 12px 12px; border: 1px solid rgba(148,184,214,.2); border-radius: 14px; background: rgba(14,26,42,.72); }

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.json-section {
  margin-top: 16px;
}

.json-section h4 {
  margin-bottom: 8px;
  color: #dcecf3;
}

.json-block {
  background: rgba(6,16,28,.55);
  border: 1px solid rgba(148,184,214,.18);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.ua-text {
  font-size: 12px;
  word-break: break-all;
}

@media (max-width: 720px) { .filter-card :deep(.el-form) { display: grid; }.filter-card :deep(.el-form-item) { margin-right: 0; }.table-surface { padding: 6px; overflow: auto; }.table-surface :deep(.el-table) { min-width: 840px; }.pagination-wrapper { justify-content: flex-start; overflow: auto; } }
</style>
