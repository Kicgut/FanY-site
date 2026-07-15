<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const authFetch = useAuthFetch()

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
  action: '',
  resourceType: '',
  userId: '',
  startDate: '',
  endDate: '',
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
    <h2>Audit Logs</h2>

    <!-- Stats -->
    <el-card v-if="stats.length" class="stats-card" shadow="never">
      <template #header>
        <span>Action Statistics</span>
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
        <el-form-item label="Action">
          <el-select v-model="filters.action" clearable placeholder="All actions" style="width: 160px">
            <el-option v-for="a in actionOptions" :key="a" :label="a" :value="a" />
          </el-select>
        </el-form-item>
        <el-form-item label="Resource">
          <el-select v-model="filters.resourceType" clearable placeholder="All types" style="width: 130px">
            <el-option v-for="r in resourceTypeOptions" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="User ID">
          <el-input v-model="filters.userId" placeholder="User ID" style="width: 100px" />
        </el-form-item>
        <el-form-item label="Start">
          <el-date-picker v-model="filters.startDate" type="datetime" placeholder="Start date" style="width: 180px" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item label="End">
          <el-date-picker v-model="filters.endDate" type="datetime" placeholder="End date" style="width: 180px" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">Search</el-button>
          <el-button @click="handleReset">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-table :data="logs" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="createdAt" label="Time" width="180">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="User" width="140">
        <template #default="{ row }">
          {{ row.user?.name || row.userId || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="action" label="Action" width="150">
        <template #default="{ row }">
          <el-tag size="small">{{ row.action }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="resourceType" label="Resource Type" width="120" />
      <el-table-column prop="resourceId" label="Resource ID" width="110" />
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column label="Detail" width="80">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="showDetail(row)">View</el-button>
        </template>
      </el-table-column>
    </el-table>

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
  color: #303133;
}

.json-block {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
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
</style>
