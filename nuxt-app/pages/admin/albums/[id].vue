<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

const route = useRoute()
const albumId = Number(route.params.id)

interface AlbumInfo {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  visibility: string
  photoCount: number
}

interface Photo {
  id: number
  title: string
  filename: string
  thumbnailUrl?: string | null
  mediumUrl?: string | null
  originalUrl: string
  width?: number | null
  height?: number | null
}

const activeTab = ref('album-photos')

const albumPhotosPage = ref(1)
const albumPhotosLimit = 30
const albumPhotosTotal = ref(0)
const album = ref<AlbumInfo | null>(null)

const { data: albumPhotosData, status: albumPhotosStatus, refresh: refreshAlbumPhotos } = await useAsyncData(
  `admin-album-photos-${albumId}`,
  () => authFetch<{ album: AlbumInfo; photos: Photo[]; total: number }>(
    `/api/admin/albums/${albumId}/photos?page=${albumPhotosPage.value}&limit=${albumPhotosLimit}`,
  ),
  { watch: [albumPhotosPage] },
)

watch(albumPhotosData, (val) => {
  if (val) {
    album.value = val.album
    albumPhotosTotal.value = val.total
  }
})

const albumPhotos = computed(() => albumPhotosData.value?.photos ?? [])

async function handleRemoveFromAlbum(photo: Photo) {
  try {
    await ElMessageBox.confirm(
      `确定将「${photo.title}」从当前相册移除？照片文件本身不会被删除。`,
      '移出相册',
      { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' },
    )
    await authFetch(`/api/admin/albums/${albumId}/photos`, {
      method: 'DELETE',
      body: { photoIds: [photo.id] },
    })
    ElMessage.success('已移除')
    refreshAlbumPhotos()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.data?.message || '操作失败')
    }
  }
}

const libraryPage = ref(1)
const libraryLimit = 30
const librarySearch = ref('')
const selectedPhotoIds = ref<Set<number>>(new Set())
const addingPhotos = ref(false)

const { data: libraryData, status: libraryStatus, refresh: refreshLibrary } = await useAsyncData(
  `admin-photo-library-${albumId}`,
  () => authFetch<{ photos: Photo[]; total: number }>(
    `/api/photos?page=${libraryPage.value}&limit=${libraryLimit}&title=${encodeURIComponent(librarySearch.value)}`,
  ),
  { watch: [libraryPage, librarySearch] },
)

const libraryPhotos = computed(() => libraryData.value?.photos ?? [])
const libraryTotal = computed(() => libraryData.value?.total ?? 0)

const albumPhotoIds = computed(() => new Set(albumPhotos.value.map(p => p.id)))
const availableLibraryPhotos = computed(() => libraryPhotos.value.filter(p => !albumPhotoIds.value.has(p.id)))

function toggleSelect(photoId: number) {
  const next = new Set(selectedPhotoIds.value)
  if (next.has(photoId)) next.delete(photoId)
  else next.add(photoId)
  selectedPhotoIds.value = next
}

function isSelected(photoId: number) {
  return selectedPhotoIds.value.has(photoId)
}

function selectAll() {
  selectedPhotoIds.value = new Set(availableLibraryPhotos.value.map(p => p.id))
}

function clearSelection() {
  selectedPhotoIds.value = new Set()
}

async function handleAddToAlbum() {
  if (selectedPhotoIds.value.size === 0) {
    ElMessage.warning('请先选择照片')
    return
  }

  addingPhotos.value = true
  try {
    await authFetch(`/api/admin/albums/${albumId}/photos`, {
      method: 'POST',
      body: { photoIds: [...selectedPhotoIds.value] },
    })
    ElMessage.success(`已添加 ${selectedPhotoIds.value.size} 张照片`)
    selectedPhotoIds.value = new Set()
    refreshAlbumPhotos()
    refreshLibrary()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '添加失败')
  } finally {
    addingPhotos.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput(val: string) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    librarySearch.value = val
    libraryPage.value = 1
  }, 300)
}

const searchInputValue = ref('')

const visibilityOptions = [
  { value: 'public', label: '公开', color: 'success' },
  { value: 'friends', label: '好友可见', color: 'warning' },
  { value: 'private', label: '私密', color: 'info' },
] as const

function getVisibilityLabel(v: string) {
  return visibilityOptions.find(o => o.value === v)?.label ?? v
}

function getVisibilityColor(v: string) {
  return (visibilityOptions.find(o => o.value === v)?.color ?? 'info') as 'success' | 'warning' | 'info'
}

useHead({ title: computed(() => album.value ? `管理 - ${album.value.name}` : '相册管理') })
</script>

<template>
  <div class="album-detail-page">
    <div v-if="album" class="album-info-card">
      <div class="album-info-main">
        <h2 class="album-title">{{ album.name }}</h2>
        <p v-if="album.description" class="album-desc">{{ album.description }}</p>
        <div class="album-badges">
          <el-tag :type="getVisibilityColor(album.visibility)" size="small" effect="light">
            {{ getVisibilityLabel(album.visibility) }}
          </el-tag>
          <span class="photo-count-badge">{{ album.photoCount }} 张照片</span>
        </div>
      </div>

      <el-button text type="primary" @click="navigateTo('/admin/albums')">
        ← 返回相册列表
      </el-button>
    </div>

    <el-alert
      class="page-hint"
      type="info"
      show-icon
      :closable="false"
      title="照片库是资源池，不是重复列表"
      description="左侧“相册照片”只管理当前相册的归属；右侧“照片库（资源池）”是全站可复用素材，照片可以加入多个相册。"
    />

    <el-tabs v-model="activeTab" class="album-tabs">
      <el-tab-pane label="相册照片" name="album-photos">
        <p class="tab-help">这里列出当前相册内的照片。点击“移除”只会解除相册关系，不会删除文件。</p>

        <div v-loading="albumPhotosStatus === 'pending'" class="photos-grid">
          <el-empty v-if="albumPhotosStatus !== 'pending' && albumPhotos.length === 0" description="相册里暂无照片" />

          <div v-for="photo in albumPhotos" :key="photo.id" class="photo-item">
            <div class="photo-thumb">
              <img :src="photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl" :alt="photo.title" loading="lazy" />
            </div>
            <div class="photo-item-info">
              <span class="photo-item-title" :title="photo.title">{{ photo.title }}</span>
              <el-button text type="danger" size="small" @click="handleRemoveFromAlbum(photo)">
                移除
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="albumPhotosTotal > albumPhotosLimit" class="pagination-wrap">
          <el-pagination
            v-model:current-page="albumPhotosPage"
            :page-size="albumPhotosLimit"
            :total="albumPhotosTotal"
            layout="prev, pager, next"
            background
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="照片库（资源池）" name="photo-library">
        <p class="tab-help">
          这里展示全站可加入当前相册的照片。选中后添加到相册即可，照片本体仍然保留在资源池里，能被多个相册重复使用。
        </p>

        <div class="library-toolbar">
          <el-input
            v-model="searchInputValue"
            placeholder="搜索照片标题…"
            clearable
            style="max-width: 320px"
            @input="onSearchInput"
          >
            <template #prefix>⌕</template>
          </el-input>

          <div class="library-actions">
            <el-button size="small" @click="selectAll">全选本页</el-button>
            <el-button size="small" @click="clearSelection">清空</el-button>
            <el-button
              type="primary"
              size="small"
              :loading="addingPhotos"
              :disabled="selectedPhotoIds.size === 0"
              @click="handleAddToAlbum"
            >
              添加到相册（{{ selectedPhotoIds.size }}）
            </el-button>
          </div>
        </div>

        <div v-loading="libraryStatus === 'pending'" class="photos-grid">
          <el-empty v-if="libraryStatus !== 'pending' && availableLibraryPhotos.length === 0" description="没有可添加的照片" />

          <div
            v-for="photo in availableLibraryPhotos"
            :key="photo.id"
            :class="['photo-item', 'selectable', { selected: isSelected(photo.id) }]"
            @click="toggleSelect(photo.id)"
          >
            <div class="photo-thumb">
              <img :src="photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl" :alt="photo.title" loading="lazy" />
              <div class="select-check">
                <el-checkbox :model-value="isSelected(photo.id)" @click.stop @change="toggleSelect(photo.id)" />
              </div>
            </div>
            <div class="photo-item-info">
              <span class="photo-item-title" :title="photo.title">{{ photo.title }}</span>
            </div>
          </div>
        </div>

        <div v-if="libraryTotal > libraryLimit" class="pagination-wrap">
          <el-pagination
            v-model:current-page="libraryPage"
            :page-size="libraryLimit"
            :total="libraryTotal"
            layout="prev, pager, next, total"
            background
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.album-detail-page {
  width: 100%;
}

.album-info-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 22px;
  margin-bottom: 16px;
  border: 1px solid rgba(208, 213, 221, .9);
  border-radius: 18px;
  background: rgba(255, 255, 255, .84);
  box-shadow: var(--shadow-light);
}

.album-info-main {
  flex: 1;
}

.album-title {
  margin: 0 0 8px;
  font-size: 1.4rem;
  letter-spacing: -.03em;
}

.album-desc {
  margin: 0 0 10px;
  font-size: 0.94rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.album-badges {
  display: flex;
  align-items: center;
  gap: 12px;
}

.photo-count-badge {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.page-hint {
  margin-bottom: 16px;
}

.album-tabs {
  padding: 16px 20px 20px;
  border: 1px solid rgba(208, 213, 221, .9);
  border-radius: 18px;
  background: rgba(255, 255, 255, .84);
  box-shadow: var(--shadow-light);
}

.tab-help {
  margin: 0 0 16px;
  color: var(--color-text-secondary);
  font-size: .88rem;
  line-height: 1.6;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  min-height: 160px;
}

.photo-item {
  border: 1px solid rgba(208, 213, 221, .92);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, .82);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.photo-item:hover {
  border-color: rgba(37, 99, 235, .34);
  box-shadow: var(--shadow-light);
}

.photo-item.selectable {
  cursor: pointer;
}

.photo-item.selectable.selected {
  border-color: rgba(37, 99, 235, .48);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, .16);
}

.photo-thumb {
  position: relative;
  width: 100%;
  height: 140px;
  overflow: hidden;
  background: var(--color-surface-2);
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.select-check {
  position: absolute;
  top: 8px;
  left: 8px;
}

.photo-item-info {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.photo-item-title {
  font-size: 0.82rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.library-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.library-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0 8px;
}

@media (max-width: 640px) {
  .album-info-card {
    flex-direction: column;
  }

  .photos-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .library-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
