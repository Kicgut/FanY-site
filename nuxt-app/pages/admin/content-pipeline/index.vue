<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'

const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })
const route = useRoute()
const router = useRouter()

interface Candidate {
  id: number
  title: string
  source: string
  status: string
  contentType: string
  content: string
  tags: string[]
  description?: string
  createdAt: string
  updatedAt: string
}

const candidates = ref<Candidate[]>([])
const loading = ref(false)
const activeTab = ref(typeof route.query.status === 'string' ? route.query.status : 'draft')
const previewVisible = ref(false)
const previewContent = ref<Candidate | null>(null)
const approveDialogVisible = ref(false)
const approveCandidateId = ref(0)
const publishDialogVisible = ref(false)
const publishCandidateId = ref(0)
const publishTarget = ref('blog')
const rejectDialogVisible = ref(false)
const rejectCandidateId = ref(0)
const rejectReason = ref('')
const createDialogVisible = ref(false)
const createForm = ref({ title: '', content: '', contentType: 'blog', tags: '' })
const editDialogVisible = ref(false)
const editCandidateId = ref(0)
const editForm = ref({ title: '', content: '', contentType: 'blog', tags: '', description: '' })
const importInput = ref<HTMLInputElement | null>(null)

const statusTabs = [
  { label: '草稿', value: 'draft' },
  { label: '已提交', value: 'submitted' },
  { label: '需修改', value: 'changes_requested' },
  { label: '已批准', value: 'approved' },
  { label: '正式内容草稿', value: 'published' },
  { label: '已拒绝', value: 'rejected' },
]

const filteredCandidates = computed(() => candidates.value.filter((candidate) => candidate.status === activeTab.value))
const statusLabel = (status: string) => ({ draft: '草稿', submitted: '已提交', reviewing: '审核中', changes_requested: '需修改', approved: '已批准', published: '正式内容草稿', rejected: '已拒绝' } as Record<string, string>)[status] || status
watch(activeTab, (status) => router.replace({ query: status === 'draft' ? {} : { status } }))

async function fetchCandidates() {
  loading.value = true
  try {
    const response = await authFetch<{ success: boolean; data: Candidate[] }>('/api/content/candidates')
    candidates.value = response.data || []
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to load candidates')
  } finally {
    loading.value = false
  }
}

async function processInbox() {
  try {
    const response = await authFetch<{ success: boolean; data: { result?: string; status: string } }>('/api/admin/content-pipeline/process', {
      method: 'POST',
      body: { mode: 'run' },
    })
    const result = response.data.result ? JSON.parse(response.data.result) : null
    ElMessage.success(result ? `Processed ${result.processed} inbox file(s)` : 'Pipeline processing completed')
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Pipeline processing failed')
  }
}

onMounted(fetchCandidates)

function openCreate() {
  createForm.value = { title: '', content: '', contentType: 'blog', tags: '' }
  createDialogVisible.value = true
}

function openEdit(candidate: Candidate) {
  editCandidateId.value = candidate.id
  editForm.value = {
    title: candidate.title,
    content: candidate.content,
    contentType: candidate.contentType,
    tags: candidate.tags.join(', '),
    description: candidate.description || '',
  }
  editDialogVisible.value = true
}

async function handleEdit() {
  try {
    await authFetch(`/api/content/candidates/${editCandidateId.value}`, {
      method: 'PUT',
      body: {
        title: editForm.value.title,
        content: editForm.value.content,
        contentType: editForm.value.contentType,
        description: editForm.value.description,
        tags: editForm.value.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      },
    })
    ElMessage.success('Candidate updated')
    editDialogVisible.value = false
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Update failed')
  }
}

async function handleCreate() {
  try {
    await authFetch('/api/content/candidates', {
      method: 'POST',
      body: {
        title: createForm.value.title,
        content: createForm.value.content,
        contentType: createForm.value.contentType,
        tags: createForm.value.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        source: 'manual',
      },
    })
    ElMessage.success('候选内容已保存为草稿')
    createDialogVisible.value = false
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Create failed')
  }
}

function triggerImport() {
  importInput.value?.click()
}

async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('contentType', 'blog')
  try {
    await authFetch('/api/admin/content-pipeline/import', { method: 'POST', body: formData })
    ElMessage.success('文件已导入为候选草稿')
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Import failed')
  } finally {
    ;(event.target as HTMLInputElement).value = ''
  }
}

function sourceLabel(source: string) {
  return ({ ai_chat: 'AI', hermes: 'Hermes', manual: 'Manual', import: 'Import' } as Record<string, string>)[source] || source
}

function sourceType(source: string) {
  return ({ ai_chat: 'warning', hermes: 'warning', manual: 'info', import: 'success' } as Record<string, string>)[source] || 'info'
}

function statusType(status: string) {
  return ({ draft: 'info', submitted: 'warning', reviewing: 'warning', changes_requested: 'warning', approved: 'success', published: 'success', rejected: 'danger' } as Record<string, string>)[status] || 'info'
}

async function handlePreview(candidate: Candidate) {
  try {
    const response = await authFetch<{ success: boolean; data: Candidate }>(`/api/content/candidates/${candidate.id}`)
    previewContent.value = response.data
  } catch {
    previewContent.value = candidate
  }
  previewVisible.value = true
}

function openApprove(id: number) {
  approveCandidateId.value = id
  approveDialogVisible.value = true
}

async function handleSubmit(id: number) {
  try {
    await authFetch(`/api/content/candidates/${id}/submit`, { method: 'POST' })
    ElMessage.success('Candidate submitted for review')
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Submit failed')
  }
}

async function handleApprove() {
  try {
    await authFetch(`/api/content/candidates/${approveCandidateId.value}/approve`, { method: 'POST', body: {} })
    ElMessage.success('Candidate approved. Publish it separately as a draft.')
    approveDialogVisible.value = false
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Approval failed')
  }
}

function openPublish(id: number) {
  publishCandidateId.value = id
  publishTarget.value = 'blog'
  publishDialogVisible.value = true
}

async function handlePublish() {
  try {
    await authFetch(`/api/content/candidates/${publishCandidateId.value}/publish`, {
      method: 'POST',
      body: { target: publishTarget.value },
    })
    ElMessage.success('正式内容草稿已生成，尚未公开发布')
    publishDialogVisible.value = false
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Publish failed')
  }
}

function openReject(id: number) {
  rejectCandidateId.value = id
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
    await fetchCandidates()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Rejection failed')
  }
}

async function handleRequestChanges(id: number) {
  try {
    const result = await ElMessageBox.prompt('请填写需要修改的内容', 'Request Changes', {
      inputType: 'textarea',
      inputPlaceholder: '审核意见',
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    })
    await authFetch(`/api/content/candidates/${id}/review`, {
      method: 'POST',
      body: { action: 'request_changes', note: result.value },
    })
    ElMessage.success('已要求修改')
    await fetchCandidates()
  } catch {
    // Cancelled dialogs do not need an error toast.
  }
}

async function handleUnpublish(id: number) {
  try {
    await ElMessageBox.confirm('下架后会保留正式内容草稿，不会删除内容。继续吗？', 'Unpublish', {
      type: 'warning',
      confirmButtonText: 'Unpublish',
      cancelButtonText: 'Cancel',
    })
    await authFetch(`/api/content/candidates/${id}/unpublish`, { method: 'POST' })
    ElMessage.success('内容已下架并保留为草稿')
    await fetchCandidates()
  } catch {
    // Cancelled dialogs do not need an error toast.
  }
}
</script>

<template>
  <div class="pipeline-page">
    <div class="page-header">
      <div>
        <p class="kicker">WORKFLOW / REVIEW</p>
        <h1>内容流水线</h1>
        <p class="page-description">AI、人工和 Markdown 内容必须经过审核后才能生成正式草稿。</p>
      </div>
      <div class="page-actions">
        <input ref="importInput" type="file" accept=".md,.markdown,.txt" hidden @change="handleImport" />
        <el-button @click="processInbox">处理收件箱</el-button>
        <el-button @click="triggerImport">导入 Markdown</el-button>
        <el-button type="primary" @click="openCreate">新建候选内容</el-button>
      </div>
    </div>

    <div class="workflow-track" aria-label="内容状态流程"><span>草稿</span><i>→</i><span>已提交</span><i>→</i><span>审核中</span><i>→</i><span>已批准</span><i>→</i><span>正式内容草稿</span><i>→</i><span>人工公开</span></div>

    <el-tabs v-model="activeTab" @tab-change="fetchCandidates">
      <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :label="tab.label" :name="tab.value" />
    </el-tabs>

    <div class="table-surface"><el-table v-loading="loading" :data="filteredCandidates" stripe style="width: 100%">
      <el-table-column prop="title" label="内容" min-width="220" />
      <el-table-column label="类型" width="110" align="center">
        <template #default="{ row }">{{ row.contentType }}</template>
      </el-table-column>
      <el-table-column label="来源" width="100" align="center">
        <template #default="{ row }"><el-tag :type="sourceType(row.source)" size="small">{{ sourceLabel(row.source) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="140" align="center">
        <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="下一步" width="270" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="handlePreview(row)">预览</el-button>
          <el-button v-if="row.status === 'draft' || row.status === 'changes_requested'" type="info" text size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status === 'draft' || row.status === 'changes_requested'" type="info" text size="small" @click="handleSubmit(row.id)">提交审核</el-button>
          <el-button v-if="row.status === 'submitted' || row.status === 'reviewing'" type="success" text size="small" @click="openApprove(row.id)">批准</el-button>
          <el-button v-if="row.status === 'submitted' || row.status === 'reviewing'" type="warning" text size="small" @click="handleRequestChanges(row.id)">需修改</el-button>
          <el-button v-if="row.status === 'submitted' || row.status === 'reviewing'" type="danger" text size="small" @click="openReject(row.id)">拒绝</el-button>
          <el-button v-if="row.status === 'approved'" type="warning" text size="small" @click="openPublish(row.id)">生成正式草稿</el-button>
          <el-button v-if="row.status === 'published'" type="danger" text size="small" @click="handleUnpublish(row.id)">下架</el-button>
        </template>
      </el-table-column>
    </el-table></div>

    <el-dialog v-model="previewVisible" title="Content Preview" width="720px">
      <div v-if="previewContent">
        <h3>{{ previewContent.title }}</h3>
        <p class="muted">{{ sourceLabel(previewContent.source) }} · {{ previewContent.createdAt }} · {{ previewContent.status }}</p>
        <el-divider />
        <div class="preview-body">{{ previewContent.content }}</div>
      </div>
    </el-dialog>

    <el-dialog v-model="createDialogVisible" title="New Content Candidate" width="720px">
      <el-form label-width="100px">
        <el-form-item label="Title"><el-input v-model="createForm.title" /></el-form-item>
        <el-form-item label="Type">
          <el-radio-group v-model="createForm.contentType">
            <el-radio value="blog">Blog</el-radio>
            <el-radio value="portfolio">Portfolio</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Tags"><el-input v-model="createForm.tags" placeholder="用逗号分隔" /></el-form-item>
        <el-form-item label="Content"><el-input v-model="createForm.content" type="textarea" :rows="12" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleCreate">Save Draft</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="Edit Content Candidate" width="720px">
      <el-form label-width="100px">
        <el-form-item label="Title"><el-input v-model="editForm.title" /></el-form-item>
        <el-form-item label="Type">
          <el-radio-group v-model="editForm.contentType">
            <el-radio value="blog">Blog</el-radio>
            <el-radio value="portfolio">Portfolio</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Description"><el-input v-model="editForm.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="Tags"><el-input v-model="editForm.tags" placeholder="Comma separated" /></el-form-item>
        <el-form-item label="Content"><el-input v-model="editForm.content" type="textarea" :rows="12" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleEdit">Save Revision</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="approveDialogVisible" title="Approve Candidate" width="440px">
      <p>批准后候选内容进入 approved 状态；发布操作会单独生成正式内容草稿，不会直接公开。</p>
      <template #footer>
        <el-button @click="approveDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleApprove">Approve</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="publishDialogVisible" title="Publish as Draft" width="440px">
      <el-form label-width="80px">
        <el-form-item label="Target">
          <el-radio-group v-model="publishTarget">
            <el-radio value="blog">Blog (Article)</el-radio>
            <el-radio value="portfolio">Portfolio</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handlePublish">Create Draft</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectDialogVisible" title="Reject Candidate" width="440px">
      <el-input v-model="rejectReason" type="textarea" :rows="4" placeholder="Reason for rejection..." />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">Cancel</el-button>
        <el-button type="danger" @click="handleReject">Reject</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pipeline-page { max-width: 1280px; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.kicker { margin: 0 0 8px; color: #72d9ed; font: 11px var(--font-mono); letter-spacing: .15em; }
.page-header h1 { margin: 0; color: #edf8fb; font-size: 27px; }
.page-actions { display: flex; gap: 8px; align-items: center; }
.page-description, .muted { color: #9eb5c2; font-size: 0.9rem; }
.workflow-track { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid rgba(148,184,214,.18); border-radius: 12px; color: #a9c0cc; font: 12px var(--font-mono); }.workflow-track i { color: #5acde7; font-style: normal; }
.table-surface { padding: 6px 12px 12px; border: 1px solid rgba(148,184,214,.2); border-radius: 14px; background: rgba(14,26,42,.72); }
.preview-body { white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; max-height: 480px; overflow-y: auto; background: rgba(6,16,28,.55); padding: 16px; border-radius: 8px; }
@media (max-width: 720px) { .page-header { align-items: flex-start; flex-direction: column; }.page-actions { flex-wrap: wrap; }.table-surface { padding: 6px; overflow: auto; }.table-surface :deep(.el-table) { min-width: 760px; } }
</style>
