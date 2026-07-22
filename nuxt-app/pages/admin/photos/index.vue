<script setup lang="ts">
import { ElMessage } from 'element-plus'

definePageMeta({ layout: 'admin' })

const authFetch = useAuthFetch()
const isAdmin = computed(() => { try { const role = JSON.parse(localStorage.getItem('user') || '{}').role; return role === 'admin' || role === 'superadmin' } catch { return false } })

const search = ref('')
const statusFilter = ref('')
const reviewFilter = ref('')
const visibilityFilter = ref('')
const busy = ref<number | null>(null)
const retryBusy = ref(false)

const { data, status, error, refresh } = await useAsyncData(
  'admin-photos',
  () => authFetch<any>('/api/photos', {
    query: {
      limit: 100,
      ...(search.value.trim() ? { title: search.value.trim() } : {}),
      ...(visibilityFilter.value ? { visibility: visibilityFilter.value } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
      ...(reviewFilter.value ? { reviewStatus: reviewFilter.value } : {}),
    },
  }),
  { watch: [search, visibilityFilter, statusFilter, reviewFilter] },
)

const photos = computed(() => data.value?.photos || [])

async function retryBackflow() {
  retryBusy.value = true
  try {
    const result = await authFetch<any>('/api/admin/photos/backflow', { method: 'POST' })
    ElMessage.success(result.data?.message || '任务已重新排队')
    refresh()
  } catch (e: any) { ElMessage.error(e?.data?.message || '操作失败') }
  finally { retryBusy.value = false }
}

const labels: Record<string, string> = {
  published: '已发布',
  hidden: '已隐藏',
  archived: '已归档',
  public: '公开',
  friends: '好友可见',
  groups: '指定分组',
  private: '私密',
  pending: '待处理',
  approved: '已通过',
  rejected: '已拒绝',
  local: '本地',
  synced: '已同步',
}

function label(v: string) {
  return labels[v] || v || '—'
}

async function updatePhoto(photo: any, field: 'status' | 'visibility', value: string) {
  busy.value = photo.id
  try {
    await authFetch(`/api/photos/${photo.id}`, { method: 'PATCH', body: { [field]: value } })
    photo[field] = value
    ElMessage.success('照片设置已更新')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '更新失败')
  } finally {
    busy.value = null
  }
}

async function reviewPhoto(photo: any, reviewStatus: string) {
  busy.value = photo.id
  try {
    await authFetch(`/api/photos/${photo.id}`, { method: 'PATCH', body: { reviewStatus } })
    photo.reviewStatus = reviewStatus
    photo.status = reviewStatus === 'approved' ? 'published' : 'hidden'
    ElMessage.success(reviewStatus === 'approved' ? '审核已通过' : '审核状态已更新')
  } catch (e: any) { ElMessage.error(e?.data?.message || '审核失败') }
  finally { busy.value = null }
}

const previewVisible = ref(false)
const previewMode = ref<'medium' | 'original'>('medium')
const previewPhoto = ref<any | null>(null)

const previewSrc = computed(() => {
  if (!previewPhoto.value) return ''
  if (previewMode.value === 'original') return previewPhoto.value.originalUrl || previewPhoto.value.mediumUrl || previewPhoto.value.thumbnailUrl || ''
  return previewPhoto.value.mediumUrl || previewPhoto.value.thumbnailUrl || previewPhoto.value.originalUrl || ''
})

function openPreview(photo: any) {
  previewPhoto.value = photo
  previewMode.value = 'medium'
  previewVisible.value = true
}

async function copyUrl(url?: string) {
  if (!url) return
  await navigator.clipboard.writeText(authImageUrl(url))
  ElMessage.success('链接已复制')
}

function openInNewTab(url?: string) {
  if (!url) return
  window.open(authImageUrl(url), '_blank', 'noopener,noreferrer')
}

function authImageUrl(url?: string | null) {
  if (!url || !import.meta.client) return url || ''
  const token = localStorage.getItem('token')
  if (!token || !url.startsWith('/api/photos/file')) return url
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
}
</script>

<template>
  <div class="photo-admin">
    <div class="page-header">
      <div>
        <div class="eyebrow">MEDIA / CONTROL ROOM</div>
        <h2>照片管理</h2>
        <p>
          这里负责单张照片的展示状态与可见范围。
          相册归属与批量收纳在“相册管理”里完成。
        </p>
      </div>
      <div class="header-actions"><el-button :loading="retryBusy" @click="retryBackflow">重试失败回流</el-button><el-button @click="refresh">刷新</el-button></div>
    </div>

    <el-alert
      class="hint"
      title="操作说明"
      description="鼠标悬停可查看动作用途。预览会优先使用中图；原图只在明确点击后加载。"
      type="info"
      show-icon
      :closable="false"
    />

    <div class="toolbar">
      <div class="search">
        <span>⌕</span>
        <el-input v-model="search" placeholder="搜索标题或文件名" clearable />
      </div>

      <el-select v-model="statusFilter" placeholder="展示状态" clearable>
        <el-option label="已发布" value="published" />
        <el-option label="已隐藏" value="hidden" />
        <el-option label="已归档" value="archived" />
      </el-select>
      <el-select v-model="reviewFilter" placeholder="审核状态" clearable>
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
        <el-option label="需修改" value="needs_edit" />
      </el-select>

      <el-select v-model="visibilityFilter" placeholder="可见范围" clearable>
        <el-option label="公开" value="public" />
        <el-option label="指定分组" value="groups" />
        <el-option label="私密" value="private" />
      </el-select>

      <span class="total">{{ photos.length }} 张</span>
    </div>

    <el-alert v-if="error" type="error" :title="error.message" show-icon />

    <div v-loading="status === 'pending'" class="table-wrap">
      <el-table :data="photos" stripe>
        <el-table-column label="预览" width="88">
          <template #default="{ row }">
            <img class="thumb" :src="authImageUrl(row.thumbnailUrl || row.mediumUrl || row.originalUrl)" :alt="row.title" />
          </template>
        </el-table-column>

        <el-table-column prop="title" label="照片" min-width="190">
          <template #default="{ row }">
            <div class="photo-title">{{ row.title }}</div>
            <div class="filename">{{ row.filename }}</div>
          </template>
        </el-table-column>

        <el-table-column v-if="isAdmin" label="展示状态" width="150">
          <template #default="{ row }">
            <el-select
              :model-value="row.status"
              size="small"
              :loading="busy === row.id"
              @change="(v: string) => updatePhoto(row, 'status', v)"
            >
              <el-option v-for="v in ['published', 'hidden', 'archived']" :key="v" :label="label(v)" :value="v" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column v-if="isAdmin" label="可见范围" width="150">
          <template #default="{ row }">
            <el-select
              :model-value="row.visibility"
              size="small"
              :loading="busy === row.id"
              @change="(v: string) => updatePhoto(row, 'visibility', v)"
            >
              <el-option v-for="v in ['public', 'groups', 'private']" :key="v" :label="label(v)" :value="v" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="审核 / 同步" width="150">
          <template #default="{ row }">
            <div>{{ label(row.reviewStatus) }}</div>
            <div class="subtle">原图：{{ label(row.syncStatus) }}</div>
            <div class="subtle">缩略图：{{ row.thumbnailStatus || 'unknown' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="所在相册" min-width="180">
          <template #default="{ row }">
            <div v-if="row.albums?.length" class="album-links">
              <NuxtLink v-for="item in row.albums" :key="item.albumId" :to="`/admin/albums/${item.albumId}`">
                {{ item.album?.name }}
              </NuxtLink>
            </div>
            <span v-else class="subtle">未加入相册</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="actions">
              <el-tooltip content="用中图预览照片" placement="top">
                <el-button size="small" @click="openPreview(row)">预览</el-button>
              </el-tooltip>
              <el-tooltip content="复制原图地址" placement="top">
                <el-button size="small" @click="copyUrl(row.originalUrl)">复制原图</el-button>
              </el-tooltip>
              <el-tooltip content="打开原图，注意加载较慢" placement="top">
                <el-button size="small" type="primary" plain @click="openInNewTab(row.originalUrl)">打开</el-button>
              </el-tooltip>
              <el-button v-if="isAdmin && row.reviewStatus === 'pending'" size="small" type="success" :loading="busy === row.id" @click="reviewPhoto(row, 'approved')">通过</el-button>
              <el-button v-if="isAdmin && row.reviewStatus === 'pending'" size="small" type="danger" plain :loading="busy === row.id" @click="reviewPhoto(row, 'rejected')">拒绝</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="status !== 'pending' && !photos.length" description="没有符合条件的照片" />
    </div>

    <el-dialog v-model="previewVisible" width="min(92vw, 1080px)" class="preview-dialog">
      <template #header>
        <div class="dialog-title">
          <strong>{{ previewPhoto?.title || '照片预览' }}</strong>
          <span>默认中图，原图按需加载</span>
        </div>
      </template>

      <div v-if="previewPhoto" class="preview-body">
        <div class="preview-stage">
          <img :src="authImageUrl(previewSrc)" :alt="previewPhoto.title" />
        </div>
        <div class="preview-side">
          <div class="preview-meta">
            <div><span>标题</span><strong>{{ previewPhoto.title }}</strong></div>
            <div><span>文件名</span><strong>{{ previewPhoto.filename }}</strong></div>
            <div><span>状态</span><strong>{{ label(previewPhoto.status) }}</strong></div>
            <div><span>可见范围</span><strong>{{ label(previewPhoto.visibility) }}</strong></div>
          </div>
          <div class="preview-actions">
            <el-button @click="previewMode = 'medium'">中图</el-button>
            <el-button @click="previewMode = 'original'">原图</el-button>
            <el-button type="primary" plain @click="copyUrl(previewPhoto.originalUrl)">复制原图链接</el-button>
          </div>
          <div class="preview-hint">
            原图会直接命中服务器大文件；如果只是确认内容，建议先看中图。
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.photo-admin {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.eyebrow {
  font: 11px var(--font-mono);
  letter-spacing: .14em;
  color: var(--color-accent);
  margin-bottom: 8px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 1.55rem;
}

.page-header p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.hint {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 260px;
  min-width: 240px;
}

.search > span {
  color: var(--color-primary);
  font-size: 1.2rem;
}

.total {
  margin-left: auto;
  color: var(--color-text-muted);
  font: 12px var(--font-mono);
}

.table-wrap {
  background: rgba(255, 255, 255, .84);
  border: 1px solid rgba(208, 213, 221, .9);
  border-radius: 18px;
  padding: 6px 12px 18px;
  box-shadow: var(--shadow-light);
}

.thumb {
  width: 58px;
  height: 46px;
  display: block;
  object-fit: cover;
  border-radius: 8px;
  background: var(--color-bg-secondary);
}

.photo-title {
  font-weight: 600;
}

.filename,
.subtle {
  font-size: 12px;
  color: var(--color-text-muted);
}

.album-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.album-links a {
  color: var(--color-primary);
  text-decoration: none;
}

.album-links a:hover {
  text-decoration: underline;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-dialog :deep(.el-dialog__body) {
  padding-top: 0;
}

.dialog-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dialog-title strong {
  font-size: 16px;
}

.dialog-title span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.preview-body {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr);
  gap: 18px;
}

.preview-stage {
  min-height: 56vh;
  border-radius: 18px;
  overflow: hidden;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
}

.preview-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.preview-side {
  display: grid;
  gap: 14px;
  align-content: start;
}

.preview-meta {
  display: grid;
  gap: 10px;
}

.preview-meta div {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(208, 213, 221, .82);
  background: rgba(255, 255, 255, .78);
}

.preview-meta span {
  display: block;
  font: 11px var(--font-mono);
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.preview-meta strong {
  font-size: 13px;
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-hint {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(37, 99, 235, .06);
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .preview-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
  }

  .table-wrap {
    overflow: auto;
  }
}
</style>
