<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

definePageMeta({ layout: 'admin' })

const authFetch = useAuthFetch()
const isAdmin = computed(() => { try { const role = JSON.parse(localStorage.getItem('user') || '{}').role; return role === 'admin' || role === 'superadmin' } catch { return false } })
const route = useRoute()
const router = useRouter()

const queryValue = (key: string, fallback = '') => typeof route.query[key] === 'string' ? route.query[key] : fallback
const search = ref(queryValue('q'))
const statusFilter = ref(queryValue('status'))
const reviewFilter = ref(queryValue('review', 'pending'))
const visibilityFilter = ref(queryValue('visibility'))
const page = ref(Math.max(1, Number(queryValue('page', '1')) || 1))
const pageSize = 20
const busy = ref<number | null>(null)
const retryBusy = ref(false)

const { data, status, error, refresh } = await useAsyncData(
  'admin-photos',
  () => authFetch<any>('/api/photos', {
    query: {
      page: page.value,
      limit: pageSize,
      ...(search.value.trim() ? { title: search.value.trim() } : {}),
      ...(visibilityFilter.value ? { visibility: visibilityFilter.value } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
      ...(reviewFilter.value ? { reviewStatus: reviewFilter.value } : {}),
    },
  }),
  { watch: [search, visibilityFilter, statusFilter, reviewFilter, page] },
)

const photos = computed(() => data.value?.photos || [])
const totalPhotos = computed(() => Number(data.value?.total || 0))
const { data: groupData } = await useAsyncData('photo-groups', () => authFetch<{ success: boolean; data: { id: number; name: string }[] }>('/api/admin/groups'))
const groups = computed(() => groupData.value?.data ?? [])

watch([search, statusFilter, reviewFilter, visibilityFilter], () => {
  page.value = 1
})

watch([search, statusFilter, reviewFilter, visibilityFilter, page], () => {
  const query: Record<string, string> = {}
  if (search.value.trim()) query.q = search.value.trim()
  if (statusFilter.value) query.status = statusFilter.value
  if (reviewFilter.value) query.review = reviewFilter.value
  if (visibilityFilter.value) query.visibility = visibilityFilter.value
  if (page.value > 1) query.page = String(page.value)
  router.replace({ query })
})

watch(() => route.query, () => {
  if (queryValue('q') !== search.value) search.value = queryValue('q')
  if (queryValue('status') !== statusFilter.value) statusFilter.value = queryValue('status')
  if (queryValue('review', 'pending') !== reviewFilter.value) reviewFilter.value = queryValue('review', 'pending')
  if (queryValue('visibility') !== visibilityFilter.value) visibilityFilter.value = queryValue('visibility')
  const nextPage = Math.max(1, Number(queryValue('page', '1')) || 1)
  if (nextPage !== page.value) page.value = nextPage
})

function displayGroups(values: unknown): string[] {
  return Array.isArray(values) ? values.map(String).map((value) => value.replace(/^group:/, '')) : []
}

async function updatePhotoGroups(photo: any, values: string[]) {
  busy.value = photo.id
  try {
    await authFetch(`/api/photos/${photo.id}`, { method: 'PATCH', body: { visibility: 'groups', visibleTo: values.map((group) => `group:${group}`) } })
    photo.visibility = 'groups'
    photo.visibleTo = values.map((group) => `group:${group}`)
    ElMessage.success('分组已更新')
  } catch (e: any) { ElMessage.error(e?.data?.message || '更新失败') }
  finally { busy.value = null }
}

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
  let reviewNote = ''
  if (reviewStatus === 'rejected' || reviewStatus === 'needs_edit') {
    try {
      const result = await ElMessageBox.prompt(
        reviewStatus === 'rejected' ? '请说明拒绝原因，上传者将据此处理。' : '请说明需要修改的内容。',
        reviewStatus === 'rejected' ? '拒绝照片' : '要求修改',
        { inputType: 'textarea', inputPlaceholder: '请输入原因', inputValidator: value => value.trim() ? true : '请填写原因', confirmButtonText: '确认', cancelButtonText: '取消' },
      )
      reviewNote = result.value.trim()
    } catch { return }
  }
  busy.value = photo.id
  try {
    await authFetch(`/api/photos/${photo.id}`, { method: 'PATCH', body: { reviewStatus, ...(reviewNote ? { reviewNote } : {}) } })
    photo.reviewStatus = reviewStatus
    photo.status = reviewStatus === 'approved' ? 'published' : 'hidden'
    ElMessage.success(reviewStatus === 'approved' ? '审核已通过' : '审核状态已更新')
  } catch (e: any) { ElMessage.error(e?.data?.message || '审核失败') }
  finally { busy.value = null }
}

const previewVisible = ref(false)
const previewMode = ref<'medium' | 'original'>('medium')
const previewPhoto = ref<any | null>(null)
const previewImageLoading = ref(false)
const previewImageError = ref(false)
const openingOriginal = ref<number | null>(null)

const previewSrc = computed(() => {
  if (!previewPhoto.value) return ''
  if (previewMode.value === 'original') return previewPhoto.value.originalUrl || previewPhoto.value.mediumUrl || previewPhoto.value.thumbnailUrl || ''
  return previewPhoto.value.mediumUrl || previewPhoto.value.thumbnailUrl || previewPhoto.value.originalUrl || ''
})

function openPreview(photo: any) {
  previewPhoto.value = photo
  previewMode.value = 'medium'
  previewImageLoading.value = true
  previewImageError.value = false
  previewVisible.value = true
}

watch(previewSrc, (src) => {
  previewImageLoading.value = Boolean(src)
  previewImageError.value = false
})

async function copyUrl(url?: string) {
  if (!url) return
  await navigator.clipboard.writeText(authImageUrl(url))
  ElMessage.success('链接已复制')
}

function openInNewTab(url?: string) {
  if (!url) return
  openingOriginal.value = previewPhoto.value?.id || null
  window.open(authImageUrl(url), '_blank', 'noopener,noreferrer')
  window.setTimeout(() => { openingOriginal.value = null }, 900)
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
        <p>先处理待审核与回流失败，再调整展示状态和可见范围；相册归属在“相册管理”中完成。</p>
      </div>
      <div class="header-actions"><el-button :loading="retryBusy" @click="retryBackflow">重试失败回流</el-button><el-button @click="refresh">刷新</el-button></div>
    </div>

    <el-alert
      class="hint"
      title="操作说明"
      description="审核通过仅代表允许进入展示流程，不会自动公开。预览优先使用中图；原图只在明确点击后加载。"
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

      <span class="total">共 {{ totalPhotos }} 张</span>
    </div>

    <el-alert v-if="error" type="error" :title="error.message" show-icon />

    <div v-loading="status === 'pending'" class="table-wrap">
      <el-table :data="photos">
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

        <el-table-column label="上传者" width="130">
          <template #default="{ row }">{{ row.uploader?.name || row.uploader?.username || '历史未登记' }}</template>
        </el-table-column>

        <el-table-column label="指定分组" min-width="180">
          <template #default="{ row }">
            <el-select v-if="isAdmin && row.visibility === 'groups'" :model-value="displayGroups(row.visibleTo)" multiple filterable size="small" :loading="busy === row.id" @change="(v: string[]) => updatePhotoGroups(row, v)">
              <el-option v-for="group in groups" :key="group.id" :label="group.name" :value="group.name" />
            </el-select>
            <span v-else>{{ displayGroups(row.visibleTo).join('、') || '-' }}</span>
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
              <el-tooltip content="打开原图，注意加载较慢" placement="top">
                <el-button size="small" type="primary" plain :loading="openingOriginal === row.id" @click="previewPhoto = row; openInNewTab(row.originalUrl)">打开</el-button>
              </el-tooltip>
              <el-button v-if="isAdmin && row.reviewStatus === 'pending'" size="small" type="success" :loading="busy === row.id" @click="reviewPhoto(row, 'approved')">通过</el-button>
              <el-button v-if="isAdmin && row.reviewStatus === 'pending'" size="small" type="danger" plain :loading="busy === row.id" @click="reviewPhoto(row, 'rejected')">拒绝</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="status !== 'pending' && !photos.length" description="没有符合条件的照片" />
    </div>

    <div v-if="status !== 'pending' && totalPhotos > pageSize" class="pagination-wrap">
      <span class="pagination-total">共 {{ totalPhotos }} 张</span>
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="totalPhotos" background layout="prev, pager, next" />
    </div>

    <div v-if="status !== 'pending' && photos.length" class="mobile-photo-list">
      <article v-for="photo in photos" :key="photo.id" class="mobile-photo-card">
        <img :src="authImageUrl(photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl)" :alt="photo.title" />
        <div class="mobile-photo-copy"><div><strong>{{ photo.title }}</strong><span>{{ photo.filename }}</span></div><div class="mobile-status"><el-tag size="small" :type="photo.reviewStatus === 'pending' ? 'warning' : photo.reviewStatus === 'approved' ? 'success' : 'info'">{{ label(photo.reviewStatus) }}</el-tag><span>{{ label(photo.visibility) }}</span></div><div class="mobile-actions"><el-button size="small" @click="openPreview(photo)">预览</el-button><el-button v-if="isAdmin && photo.reviewStatus === 'pending'" size="small" type="success" :loading="busy === photo.id" @click="reviewPhoto(photo, 'approved')">通过</el-button><el-button v-if="isAdmin && photo.reviewStatus === 'pending'" size="small" type="danger" plain :loading="busy === photo.id" @click="reviewPhoto(photo, 'rejected')">拒绝</el-button><NuxtLink :to="`/admin/albums`">相册归属</NuxtLink></div></div>
      </article>
    </div>
    <el-empty v-if="status !== 'pending' && !photos.length" class="mobile-empty" description="没有符合条件的照片" />

    <el-dialog v-model="previewVisible" width="min(92vw, 1080px)" class="preview-dialog">
      <template #header>
        <div class="dialog-title">
          <strong>{{ previewPhoto?.title || '照片预览' }}</strong>
          <span>默认中图，原图按需加载</span>
        </div>
      </template>

      <div v-if="previewPhoto" class="preview-body">
        <div class="preview-stage">
          <el-skeleton v-if="previewImageLoading" class="preview-loader" animated />
          <img :src="authImageUrl(previewSrc)" :alt="previewPhoto.title" @load="previewImageLoading = false" @error="previewImageLoading = false; previewImageError = true" />
          <el-alert v-if="previewImageError" class="preview-error" type="error" title="图片加载失败，请稍后重试或检查原图回流服务" :closable="false" show-icon />
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
            <el-button :loading="previewMode === 'original' && previewImageLoading" @click="previewMode = 'original'">原图</el-button>
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
  --el-alert-bg-color: rgba(132, 77, 26, .26);
  --el-alert-border-color: rgba(217, 161, 80, .38);
  --el-alert-title-color: #f0ca83;
  --el-alert-description-color: #cfae72;
  --el-alert-icon-color: #e6bc6d;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: nowrap;
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
  overflow: hidden;
  background: #0e1a2a;
  border: 1px solid rgba(148, 184, 214, .2);
  border-radius: 14px;
  padding: 6px 12px 18px;
  box-shadow: 0 12px 32px rgba(2, 10, 20, .18);
}

.table-wrap :deep(.el-table) {
  --el-table-bg-color: #0e1a2a;
  --el-table-tr-bg-color: #0e1a2a;
  --el-table-header-bg-color: #111e2f;
  --el-table-row-hover-bg-color: rgba(81, 199, 227, .08);
  --el-table-border-color: rgba(148, 184, 214, .14);
  color: #c8d9e1;
}

.table-wrap :deep(.el-table th.el-table__cell) { color: #9fb8c4; font-weight: 600; }
.table-wrap :deep(.el-table td.el-table__cell),
.table-wrap :deep(.el-table th.el-table__cell) { background: transparent; }
.table-wrap :deep(.el-table__inner-wrapper::before) { background: rgba(148, 184, 214, .14); }
.table-wrap :deep(.el-empty__description) { color: #829ba9; }

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

.pagination-wrap { display: flex; justify-content: flex-end; align-items: center; gap: 16px; margin-top: 16px; }
.pagination-total { color: #8199a7; font: 12px var(--font-mono); }
.pagination-wrap :deep(.el-pager li.is-active) { background: #3e9dea; color: #fff; }

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

.preview-loader {
  width: min(78vw, 760px);
  height: min(56vh, 620px);
}

.preview-error {
  position: absolute;
  inset: auto 20px 20px;
  max-width: 560px;
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

  .table-wrap { display: none; }
  .toolbar { flex-wrap: wrap; }
  .toolbar > :deep(.el-select) { flex: 1 1 calc(50% - 5px); min-width: 0; }
  .search { flex-basis: 100%; }
  .total { margin-left: 0; }
  .pagination-wrap { justify-content: flex-start; overflow-x: auto; }
  .mobile-photo-list { display: grid; gap: 12px; }
  .mobile-photo-card { display: grid; grid-template-columns: 108px minmax(0,1fr); overflow: hidden; border: 1px solid rgba(148,184,214,.2); border-radius: 12px; background: rgba(14,26,42,.72); }.mobile-photo-card > img { width: 108px; height: 122px; object-fit: cover; background: var(--color-bg-secondary); }.mobile-photo-copy { display: grid; align-content: space-between; gap: 10px; padding: 12px; min-width: 0; }.mobile-photo-copy strong,.mobile-photo-copy span { display: block; }.mobile-photo-copy strong { color: #e4f3f8; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.mobile-photo-copy > div > span { margin-top: 4px; color: #91a9b7; font: 11px var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.mobile-status { display: flex; align-items: center; gap: 8px; }.mobile-status > span { margin: 0!important; }.mobile-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }.mobile-actions a { color: #86dff1; font-size: 12px; text-decoration: none; }
}

@media (min-width: 701px) { .mobile-photo-list { display: none; } }
@media (min-width: 701px) { .mobile-empty { display: none; } }
</style>
