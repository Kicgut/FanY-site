<script setup lang="ts">
interface PublicAlbum {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  photoCount: number
  previewPhotos?: { id: number; thumbnailUrl?: string | null }[]
  createdAt: string
}

const { data, pending, error } = await useFetch<{ success: boolean; data: PublicAlbum[] }>('/api/albums/public')

const query = ref('')
const sortMode = ref<'recent' | 'photos' | 'name'>('recent')
const uploadFile = ref<File | null>(null)
const uploadTitle = ref('')
const uploadVisibility = ref('private')
const uploadAlbumIds = ref<number[]>([])
const uploadGroups = ref<string[]>([])
const userGroups = ref<string[]>([])
const uploadBusy = ref(false)
const uploadDialogVisible = ref(false)
const loggedIn = ref(false)
const authFetch = useAuthFetch()

onMounted(() => {
  loggedIn.value = Boolean(localStorage.getItem('token'))
  try { userGroups.value = JSON.parse(localStorage.getItem('user') || '{}').groups || [] } catch { userGroups.value = [] }
})

async function submitUpload() {
  if (!uploadFile.value || uploadBusy.value) return
  uploadBusy.value = true
  try {
    const form = new FormData()
    form.append('file', uploadFile.value)
    form.append('title', uploadTitle.value || uploadFile.value.name.replace(/\.[^.]+$/, ''))
    form.append('visibility', uploadVisibility.value)
    form.append('albumIds', uploadAlbumIds.value.join(','))
    form.append('groups', uploadGroups.value.join(','))
    await authFetch('/api/photos/upload', { method: 'POST', body: form })
    ElMessage.success('上传成功，等待审核与原图回流')
    uploadFile.value = null
    uploadTitle.value = ''
    uploadAlbumIds.value = []
  } catch (e: any) { ElMessage.error(e?.data?.message || '上传失败') }
  finally { uploadBusy.value = false }
}

function handleFileChange(event: Event) {
  uploadFile.value = (event.target as HTMLInputElement).files?.[0] || null
}

const albums = computed(() => {
  const q = query.value.trim().toLowerCase()
  const source = (data.value?.data ?? []).filter(album => {
    return !q || `${album.name} ${album.description ?? ''}`.toLowerCase().includes(q)
  })

  return [...source].sort((a, b) => {
    if (sortMode.value === 'photos') return b.photoCount - a.photoCount
    if (sortMode.value === 'name') return a.name.localeCompare(b.name, 'zh-CN')
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const stats = computed(() => ({
  albums: albums.value.length,
  photos: albums.value.reduce((sum, album) => sum + album.photoCount, 0),
}))

useHead({ title: '照片相册' })
</script>

<template>
  <div class="albums-page">
    <section class="albums-hero">
      <div class="shell hero-grid">
        <div class="hero-copy">
          <div class="eyebrow">PHOTO INDEX / PUBLIC ARCHIVE</div>
          <div class="hero-heading-row">
            <h1>照片相册</h1>
            <el-button v-if="loggedIn" class="upload-trigger" aria-label="上传照片" title="上传照片" @click="uploadDialogVisible = true">
              <el-icon><Upload /></el-icon>
            </el-button>
          </div>
          <p>
            适合快速浏览、搜索和进入单个相册的公开影像入口。
            先从相册层面筛选，再进入单图查看。
          </p>
        </div>

        <div class="hero-panel">
          <div class="hero-stat">
            <strong>{{ stats.albums }}</strong>
            <span>个公开相册</span>
          </div>
          <div class="hero-stat">
            <strong>{{ stats.photos }}</strong>
            <span>张公开照片</span>
          </div>
        </div>
      </div>
    </section>

    <main class="shell albums-content">
      <div class="toolbar">
        <el-input v-model="query" class="search-input" placeholder="搜索相册名称或描述" clearable>
          <template #prefix>⌕</template>
        </el-input>

        <el-segmented
          v-model="sortMode"
          :options="[
            { label: '最新', value: 'recent' },
            { label: '最多照片', value: 'photos' },
            { label: '名称', value: 'name' },
          ]"
        />
      </div>

      <p class="albums-helper">支持名称搜索、描述搜索、按照片数排序。</p>
      <el-dialog v-model="uploadDialogVisible" title="上传照片" width="min(560px, 92vw)">
        <div class="upload-row">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="handleFileChange" />
          <el-input v-model="uploadTitle" placeholder="可选标题" />
          <el-select v-model="uploadVisibility" style="width:140px"><el-option label="私有" value="private" /><el-option label="分组可见" value="groups" /><el-option label="公开" value="public" /></el-select>
          <el-select v-if="uploadVisibility === 'groups'" v-model="uploadGroups" multiple placeholder="选择分组" style="width:180px"><el-option v-for="group in userGroups" :key="group" :label="group" :value="group" /></el-select>
          <el-select v-model="uploadAlbumIds" multiple collapse-tags placeholder="加入相册（可选）" style="width:220px"><el-option v-for="album in albums" :key="album.id" :label="album.name" :value="album.id" /></el-select>
        </div>
        <template #footer><el-button @click="uploadDialogVisible = false">取消</el-button><el-button type="primary" :loading="uploadBusy" :disabled="!uploadFile" @click="submitUpload">上传</el-button></template>
      </el-dialog>

      <div class="section-meta">
        <span>{{ albums.length }} 个相册</span>
        <span v-if="query">正在筛选 “{{ query }}”</span>
      </div>

      <el-skeleton v-if="pending" :rows="5" animated />
      <el-alert
        v-else-if="error"
        type="error"
        title="相册加载失败"
        description="请稍后重试。"
        show-icon
        :closable="false"
      />
      <el-empty v-else-if="!albums.length" description="没有匹配的公开相册" />

      <div v-else class="albums-grid">
        <NuxtLink
          v-for="album in albums"
          :key="album.id"
          :to="`/albums/${album.id}`"
          class="album-card"
        >
          <div class="album-cover">
            <div v-if="album.previewPhotos?.length" class="preview-mosaic">
              <img
                v-for="photo in album.previewPhotos.slice(0, 10)"
                :key="photo.id"
                :src="photo.thumbnailUrl || album.coverUrl || ''"
                :alt="album.name"
                loading="lazy"
              />
            </div>

            <img
              v-else-if="album.coverUrl"
              :src="album.coverUrl"
              :alt="album.name"
              loading="lazy"
            />

            <div v-else class="cover-placeholder">
              <span>◎</span>
            </div>

            <div class="cover-fade" />
            <span class="view-cue">进入相册 ↗</span>
          </div>

          <div class="album-info">
            <div>
              <h2>{{ album.name }}</h2>
              <p v-if="album.description">{{ album.description }}</p>
            </div>
            <div class="album-meta">
              <span class="count">{{ album.photoCount }} 张</span>
              <span class="date">{{ new Date(album.createdAt).toLocaleDateString('zh-CN') }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
.albums-page {
  min-height: 100vh;
}

.shell {
  max-width: var(--max-width);
  margin: 0 auto;
  padding-left: clamp(18px, 4vw, 44px);
  padding-right: clamp(18px, 4vw, 44px);
}

.albums-hero {
  padding: 76px 0 42px;
  border-bottom: 1px solid rgba(208, 213, 221, .82);
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr);
  gap: 24px;
  align-items: end;
}

.eyebrow {
  font: 11px var(--font-mono);
  letter-spacing: .16em;
  color: var(--color-accent);
  margin-bottom: 18px;
}

.albums-hero h1 {
  font-size: clamp(2.8rem, 6vw, 5.2rem);
  line-height: .94;
  letter-spacing: -.07em;
  margin: 0 0 14px;
  text-wrap: balance;
}

.albums-hero p {
  max-width: 48ch;
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin: 0;
}

.hero-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
}

.hero-stat {
  display: flex;
  flex: 0 0 auto;
  min-width: 132px;
  min-height: 88px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--color-surface-2);
}

.hero-stat strong {
  font-size: 1.7rem;
  letter-spacing: -.05em;
}

.hero-stat span {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.hero-heading-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.hero-heading-row h1 {
  margin-bottom: 0;
}

.upload-trigger {
  width: 44px;
  height: 44px;
  padding: 0;
  margin-bottom: 8px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: #111827;
}

.upload-trigger:hover,
.upload-trigger:focus-visible {
  color: #fff;
  background: #374151;
}

.albums-helper {
  margin: -4px 0 18px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.albums-content {
  padding-top: 26px;
  padding-bottom: 88px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-input {
  flex: 1 1 360px;
  max-width: 560px;
}

.section-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text-muted);
  font: 12px var(--font-mono);
  margin-bottom: 18px;
}

.upload-panel { margin: 0 0 20px; }
.upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.upload-row input { max-width: 260px; }

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.album-card {
  display: block;
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(208, 213, 221, .9);
  background: rgba(255, 255, 255, .84);
  box-shadow: 0 1px 1px rgba(16, 24, 40, .02);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}

.album-card:hover {
  transform: translateY(-4px);
  border-color: rgba(37, 99, 235, .34);
  box-shadow: var(--shadow-light);
}

.album-cover {
  position: relative;
  height: 250px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, .08), transparent 34%),
    var(--color-surface-2);
}

.album-cover > img,
.preview-mosaic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-mosaic {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  width: 100%;
  height: 100%;
}

.preview-mosaic img:first-child {
  grid-row: span 2;
  grid-column: span 2;
}

.cover-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--color-text-muted);
  font-size: 4rem;
}

.cover-fade {
  position: absolute;
  inset: auto 0 0;
  height: 96px;
  background: linear-gradient(to top, rgba(10, 15, 25, .5), transparent);
}

.view-cue {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 1;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, .68);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity .22s ease, transform .22s ease;
}

.album-card:hover .view-cue {
  opacity: 1;
  transform: translateY(0);
}

.album-info {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 18px;
}

.album-info h2 {
  font-size: 1.06rem;
  margin: 0 0 8px;
  letter-spacing: -.02em;
}

.album-info p {
  font-size: .9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.album-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  white-space: nowrap;
  font: 12px var(--font-mono);
  color: var(--color-text-muted);
}

.count {
  color: var(--color-text);
}

@media (max-width: 760px) {
  .albums-hero {
    padding-top: 52px;
  }

  .hero-grid {
    grid-template-columns: 1fr;
  }

  .section-meta {
    flex-direction: column;
  }

  .album-cover {
    height: 220px;
  }
}
</style>
