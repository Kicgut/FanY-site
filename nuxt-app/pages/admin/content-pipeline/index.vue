<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'

const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

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
const activeTab = ref('draft')
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
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Changes Requested', value: 'changes_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
  { label: 'Rejected', value: 'rejected' },
]

const filteredCandidates = computed(() => candidates.value.filter((candidate) => candidate.status === activeTab.value))

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
        <h2>Content Pipeline</h2>
        <p class="page-description">AI、人工和 Markdown 内容必须经过审核后才能生成正式草稿。</p>
      </div>
      <div class="page-actions">
        <input ref="importInput" type="file" accept=".md,.markdown,.txt" hidden @change="handleImport" />
        <el-button @click="processInbox">Process Inbox</el-button>
        <el-button @click="triggerImport">Import Markdown/TXT</el-button>
        <el-button type="primary" @click="openCreate">New Candidate</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="fetchCandidates">
      <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :label="tab.label" :name="tab.value" />
    </el-tabs>

    <el-table v-loading="loading" :data="filteredCandidates" stripe border style="width: 100%">
      <el-table-column prop="title" label="Title" min-width="220" />
      <el-table-column label="Type" width="110" align="center">
        <template #default="{ row }">{{ row.contentType }}</template>
      </el-table-column>
      <el-table-column label="Source" width="100" align="center">
        <template #default="{ row }"><el-tag :type="sourceType(row.source)" size="small">{{ sourceLabel(row.source) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="Status" width="140" align="center">
        <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="createdAt" label="Created" width="180" />
      <el-table-column label="Actions" width="270" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="handlePreview(row)">Preview</el-button>
          <el-button v-if="row.status === 'draft' || row.status === 'changes_requested'" type="info" text size="small" @click="openEdit(row)">Edit</el-button>
          <el-button v-if="row.status === 'draft' || row.status === 'changes_requested'" type="info" text size="small" @click="handleSubmit(row.id)">Submit</el-button>
          <el-button v-if="row.status === 'submitted' || row.status === 'reviewing'" type="success" text size="small" @click="openApprove(row.id)">Approve</el-button>
          <el-button v-if="row.status === 'submitted' || row.status === 'reviewing'" type="warning" text size="small" @click="handleRequestChanges(row.id)">Changes</el-button>
          <el-button v-if="row.status === 'submitted' || row.status === 'reviewing'" type="danger" text size="small" @click="openReject(row.id)">Reject</el-button>
          <el-button v-if="row.status === 'approved'" type="warning" text size="small" @click="openPublish(row.id)">Publish Draft</el-button>
          <el-button v-if="row.status === 'published'" type="danger" text size="small" @click="handleUnpublish(row.id)">Unpublish</el-button>
        </template>
      </el-table-column>
    </el-table>

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
.pipeline-page { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; }
.page-actions { display: flex; gap: 8px; align-items: center; }
.page-description, .muted { color: #909399; font-size: 0.9rem; }
.preview-body { white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; max-height: 480px; overflow-y: auto; background: #f5f7fa; padding: 16px; border-radius: 4px; }
</style>
