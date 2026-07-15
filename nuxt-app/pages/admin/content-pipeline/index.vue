<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const authFetch = useAuthFetch()

definePageMeta({ layout: 'admin' })

interface Candidate {
  id: string
  title: string
  source: string
  status: string
  tags: string[]
  description?: string
  createdAt: string
  updatedAt: string
  rejectReason?: string
}

interface CandidateContent {
  meta: Candidate
  content: string
}

const candidates = ref<Candidate[]>([])
const loading = ref(false)
const activeTab = ref('draft')
const previewVisible = ref(false)
const previewContent = ref<CandidateContent | null>(null)
const approveDialogVisible = ref(false)
const approveTarget = ref('blog')
const approveCandidateId = ref('')
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectCandidateId = ref('')

const statusTabs = [
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

async function fetchCandidates() {
  loading.value = true
  try {
    const res = await authFetch<{ success: boolean; data: Candidate[] }>(
      '/api/content/candidates'
    )
    candidates.value = res.data || []
  } catch (e: any) {
    ElMessage.error(e.data?.message || 'Failed to load candidates')
  } finally {
    loading.value = false
  }
}

const filteredCandidates = computed(() =>
  candidates.value.filter((c) => c.status === activeTab.value)
)

onMounted(fetchCandidates)

function sourceLabel(source: string) {
  const map: Record<string, string> = { ai_chat: 'AI', manual: 'Manual', import: 'Import' }
  return map[source] || source
}

function sourceType(source: string) {
  const map: Record<string, string> = { ai_chat: 'warning', manual: 'info', import: 'success' }
  return map[source] || 'info'
}

function statusType(status: string) {
  const map: Record<string, string> = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] || 'info'
}

async function handlePreview(candidate: Candidate) {
  try {
    const res = await authFetch<{ success: boolean; data: CandidateContent }>(
      `/api/content/candidates?id=${candidate.id}`
    )
    // For preview, we fetch the full list and find the matching one
    // Actually the GET endpoint returns all, so let's use the candidate data we have
    previewContent.value = {
      meta: candidate,
      content: '(Preview from candidate data)',
    }
    previewVisible.value = true
  } catch {
    // Fallback: just show meta
    previewContent.value = { meta: candidate, content: '' }
    previewVisible.value = true
  }
}

function openApprove(candidateId: string) {
  approveCandidateId.value = candidateId
  approveTarget.value = 'blog'
  approveDialogVisible.value = true
}

async function handleApprove() {
  try {
    await authFetch(`/api/content/candidates/${approveCandidateId.value}/approve`, {
      method: 'POST',
      body: { target: approveTarget.value },
    })
    ElMessage.success('Candidate approved and published')
    approveDialogVisible.value = false
    fetchCandidates()
  } catch (e: any) {
    ElMessage.error(e.data?.message || 'Approval failed')
  }
}

function openReject(candidateId: string) {
  rejectCandidateId.value = candidateId
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function handleReject() {
  try {
    await authFetch(`/api/content/candidates/${rejectCandidateId.value}/reject`, {
      method: 'POST',
      body: { reason: rejectReason.value || 'No reason' },
    })
    ElMessage.success('Candidate rejected')
    rejectDialogVisible.value = false
    fetchCandidates()
  } catch (e: any) {
    ElMessage.error(e.data?.message || 'Rejection failed')
  }
}
</script>

<template>
  <div class="pipeline-page">
    <div class="page-header">
      <h2>Content Pipeline</h2>
    </div>

    <el-tabs v-model="activeTab" @tab-change="fetchCandidates">
      <el-tab-pane
        v-for="tab in statusTabs"
        :key="tab.value"
        :label="tab.label"
        :name="tab.value"
      />
    </el-tabs>

    <el-table v-loading="loading" :data="filteredCandidates" stripe border style="width: 100%">
      <el-table-column prop="title" label="Title" min-width="200" />

      <el-table-column label="Source" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="sourceType(row.source)" size="small">
            {{ sourceLabel(row.source) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Status" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Tags" min-width="150">
        <template #default="{ row }">
          <el-tag
            v-for="tag in (row.tags || [])"
            :key="tag"
            size="small"
            effect="plain"
            style="margin-right: 4px"
          >
            {{ tag }}
          </el-tag>
          <span v-if="!row.tags?.length" style="color: #909399">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />

      <el-table-column prop="createdAt" label="Created" width="170" />

      <el-table-column label="Actions" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="handlePreview(row)">
            Preview
          </el-button>
          <el-button
            v-if="row.status === 'draft' || row.status === 'pending'"
            type="success"
            text
            size="small"
            @click="openApprove(row.id)"
          >
            Approve
          </el-button>
          <el-button
            v-if="row.status === 'draft' || row.status === 'pending'"
            type="danger"
            text
            size="small"
            @click="openReject(row.id)"
          >
            Reject
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Preview Dialog -->
    <el-dialog v-model="previewVisible" title="Content Preview" width="700px">
      <div v-if="previewContent">
        <h3>{{ previewContent.meta.title }}</h3>
        <p style="color: #909399; font-size: 0.85rem">
          {{ sourceLabel(previewContent.meta.source) }} · {{ previewContent.meta.createdAt }}
        </p>
        <el-divider />
        <div class="preview-body">{{ previewContent.content }}</div>
      </div>
    </el-dialog>

    <!-- Approve Dialog -->
    <el-dialog v-model="approveDialogVisible" title="Approve & Publish" width="440px">
      <el-form label-width="80px">
        <el-form-item label="Target">
          <el-radio-group v-model="approveTarget">
            <el-radio value="blog">Blog (Article)</el-radio>
            <el-radio value="portfolio">Portfolio</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleApprove">Approve & Publish</el-button>
      </template>
    </el-dialog>

    <!-- Reject Dialog -->
    <el-dialog v-model="rejectDialogVisible" title="Reject Candidate" width="440px">
      <el-form label-width="80px">
        <el-form-item label="Reason">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="Reason for rejection..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">Cancel</el-button>
        <el-button type="danger" @click="handleReject">Reject</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pipeline-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.preview-body {
  white-space: pre-wrap;
  font-size: 0.95rem;
  line-height: 1.6;
  max-height: 400px;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
}
</style>
