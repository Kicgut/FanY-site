<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

const route = useRoute()
const albumId = Number(route.params.id)

// ---------- Types ----------
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

// ---------- Tab management ----------
const activeTab = ref('album-photos')

// ========== Tab 1: Album Photos ==========
const albumPhotosPage = ref(1)
const albumPhotosLimit = 30
const albumPhotosTotal = ref(0)
const album = ref<AlbumInfo | null>(null)

const { data: albumPhotosData, status: albumPhotosStatus, refresh: refreshAlbumPhotos } = await useAsyncData(
  `admin-album-photos-${albumId}`,
  () => authFetch<{ album: AlbumInfo; photos: Photo[]; total: number }>(
    `/api/admin/albums/${albumId}/photos?page=${albumPhotosPage.value}&limit=${albumPhotosLimit}`
  ),
  { watch: [albumPhotosPage] }
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
      `确定将「${photo.title}」从相册中移除？照片本身不会被删除。`,
      '移出相册',
      { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' }
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

// ========== Tab 2: Photo Library ==========
const libraryPage = ref(1)
const libraryLimit = 30
const librarySearch = ref('')
const selectedPhotoIds = ref<Set<number>>(new Set())
const addingPhotos = ref(false)

const { data: libraryData, status: libraryStatus, refresh: refreshLibrary } = await useAsyncData(
  `admin-photo-library-${albumId}`,
  () => authFetch<{ photos: Photo[]; total: number }>(
    `/api/photos?page=${libraryPage.value}&limit=${libraryLimit}&title=${encodeURIComponent(librarySearch.value)}`
  ),
  { watch: [libraryPage, librarySearch] }
)

const libraryPhotos = computed(() => libraryData.value?.photos ?? [])
const libraryTotal = computed(() => libraryData.value?.total ?? 0)

// Filter out photos already in album from library display
const albumPhotoIds = computed(() => new Set(albumPhotos.value.map(p => p.id)))
const availableLibraryPhotos = computed(() =>
  libraryPhotos.value.filter(p => !albumPhotoIds.value.has(p.id))
)

function toggleSelect(photoId: number) {
  const s = new Set(selectedPhotoIds.value)
  if (s.has(photoId)) {
    s.delete(photoId)
  } else {
    s.add(photoId)
  }
  selectedPhotoIds.value = s
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
    ElMessage.success(`已添加 ${selectedPhotoIds.value.size} 张照片到相册`)
    selectedPhotoIds.value = new Set()
    refreshAlbumPhotos()
    refreshLibrary()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '添加失败')
  } finally {
    addingPhotos.value = false
  }
}

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput(val: string) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    librarySearch.value = val
    libraryPage.value = 1
  }, 400)
}

const searchInputValue = ref('')

// Visibility helpers
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
    <!-- Album Info Card -->
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

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="album-tabs">
      <!-- Tab 1: Album Photos -->
      <el-tab-pane label="相册照片" name="album-photos">
        <div v-loading="albumPhotosStatus === 'pending'" class="photos-grid">
          <el-empty v-if="albumPhotosStatus !== 'pending' && albumPhotos.length === 0" description="相册中暂无照片" />

          <div v-for="photo in albumPhotos" :key="photo.id" class="photo-item">
            <div class="photo-thumb">
              <img
                :src="photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl"
                :alt="photo.title"
                loading="lazy"
              />
            </div>
            <div class="photo-item-info">
              <span class="photo-item-title" :title="photo.title">{{ photo.title }}</span>
              <el-button
                text
                type="danger"
                size="small"
                @click="handleRemoveFromAlbum(photo)"
              >
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

      <!-- Tab 2: Photo Library -->
      <el-tab-pane label="照片库" name="photo-library">
        <div class="library-toolbar">
          <el-input
            v-model="searchInputValue"
            placeholder="搜索照片标题..."
            clearable
            style="max-width: 300px"
            @input="onSearchInput"
          >
            <template #prefix>🔍</template>
          </el-input>

          <div class="library-actions">
            <el-button size="small" @click="selectAll">全选本页</el-button>
            <el-button size="small" @click="clearSelection">清空选择</el-button>
            <el-button
              type="primary"
              size="small"
              :loading="addingPhotos"
              :disabled="selectedPhotoIds.size === 0"
              @click="handleAddToAlbum"
            >
              添加到相册 ({{ selectedPhotoIds.size }})
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
              <img
                :src="photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl"
                :alt="photo.title"
                loading="lazy"
              />
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

/* Album Info Card */
.album-info-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  margin-bottom: 20px;
}

.album-info-main {
  flex: 1;
}

.album-title {
  margin: 0 0 6px;
  font-size: 1.35rem;
  font-weight: 700;
  color: #303133;
}

.album-desc {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: #909399;
}

.album-badges {
  display: flex;
  align-items: center;
  gap: 12px;
}

.photo-count-badge {
  font-size: 0.85rem;
  color: #606266;
  font-weight: 500;
}

/* Tabs */
.album-tabs {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 16px 20px;
}

/* Photos Grid */
.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  min-height: 160px;
}

.photo-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.photo-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.photo-item.selectable {
  cursor: pointer;
}

.photo-item.selectable.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.photo-thumb {
  position: relative;
  width: 100%;
  height: 140px;
  overflow: hidden;
  background: #f5f7fa;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.select-check {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
}

.photo-item-info {
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.photo-item-title {
  font-size: 0.82rem;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Library Toolbar */
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
}

/* Pagination */
.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0 8px;
}

@media (max-width: 640px) {
  .album-info-card {
    flex-direction: column;
    gap: 12px;
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
