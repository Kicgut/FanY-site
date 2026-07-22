<script setup lang="ts">
interface Photo {
  id: number
  title: string
  description?: string | null
  filename: string
  originalUrl?: string | null
  thumbnailUrl?: string | null
  mediumUrl?: string | null
  width?: number | null
  height?: number | null
  allowOriginalDownload?: boolean
  takenAt?: string | null
  location?: string | null
  cameraMake?: string | null
  cameraModel?: string | null
  lens?: string | null
  iso?: number | null
  focalLength?: number | null
  tags?: { id: number; name: string }[]
}

interface AlbumDetail {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  photoCount: number
}

interface AlbumResponse {
  success: boolean
  data: {
    album: AlbumDetail
    photos: Photo[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

const route = useRoute()
const albumId = route.params.id

const { data, pending, error } = await useFetch<AlbumResponse>(`/api/albums/public/${albumId}`)

const album = computed(() => data.value?.data?.album ?? null)
const photos = ref<Photo[]>(data.value?.data?.photos ?? [])
const totalPhotos = ref(data.value?.data?.total ?? 0)
const currentPage = ref(data.value?.data?.page ?? 1)
const hasMorePhotos = ref(data.value?.data?.hasMore ?? false)
const loadingMore = ref(false)

watch(data, (value) => {
  photos.value = value?.data?.photos ?? []
  totalPhotos.value = value?.data?.total ?? 0
  currentPage.value = value?.data?.page ?? 1
  hasMorePhotos.value = value?.data?.hasMore ?? false
}, { immediate: true })

async function loadMorePhotos() {
  if (loadingMore.value || !hasMorePhotos.value) return
  loadingMore.value = true
  try {
    const nextPage = currentPage.value + 1
    const response = await $fetch<AlbumResponse>(`/api/albums/public/${albumId}?page=${nextPage}&limit=50`)
    photos.value.push(...(response.data.photos ?? []))
    currentPage.value = response.data.page
    hasMorePhotos.value = response.data.hasMore
  } finally {
    loadingMore.value = false
  }
}
const search = ref('')
const selectedTag = ref('')
const originalLoaded = ref(false)
const lightboxVisible = ref(false)
const currentPhoto = ref<Photo | null>(null)

const tags = computed(() => [...new Set(photos.value.flatMap(p => p.tags?.map(t => t.name) ?? []))])

const filteredPhotos = computed(() => photos.value.filter((photo) => {
  const q = search.value.trim().toLowerCase()
  return (!q || `${photo.title} ${photo.description ?? ''} ${photo.filename}`.toLowerCase().includes(q))
    && (!selectedTag.value || photo.tags?.some(tag => tag.name === selectedTag.value))
}))

const stats = computed(() => ({
  total: filteredPhotos.value.length,
  tagged: filteredPhotos.value.filter(photo => photo.tags?.length).length,
}))

const currentIndex = computed(() => {
  if (!currentPhoto.value) return -1
  return filteredPhotos.value.findIndex(photo => photo.id === currentPhoto.value!.id)
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < filteredPhotos.value.length - 1)

const currentPhotoSrc = computed(() => {
  if (!currentPhoto.value) return ''
  if (originalLoaded.value && currentPhoto.value.allowOriginalDownload) return currentPhoto.value.originalUrl || currentPhoto.value.mediumUrl || ''
  return currentPhoto.value.mediumUrl || currentPhoto.value.thumbnailUrl || currentPhoto.value.originalUrl
})

function openLightbox(photo: Photo) {
  currentPhoto.value = photo
  originalLoaded.value = false
  lightboxVisible.value = true
}

watch(currentPhoto, (photo) => {
  const next = photo ? filteredPhotos.value[currentIndex.value + 1] : null
  if (next?.mediumUrl) {
    const image = new Image()
    image.src = next.mediumUrl
  }
})

function closeLightbox() {
  lightboxVisible.value = false
  currentPhoto.value = null
}

function goPrev() {
  if (hasPrev.value) currentPhoto.value = filteredPhotos.value[currentIndex.value - 1]
}

function goNext() {
  if (hasNext.value) currentPhoto.value = filteredPhotos.value[currentIndex.value + 1]
}

function handleKeydown(e: KeyboardEvent) {
  if (!lightboxVisible.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') goPrev()
  if (e.key === 'ArrowRight') goNext()
}

function cardStyle(photo: Photo) {
  const width = photo.width || 4
  const height = photo.height || 3
  return { aspectRatio: `${width} / ${height}` }
}

function formatPhotoMeta(photo: Photo) {
  const takenAt = photo.takenAt ? new Date(photo.takenAt).toLocaleString('zh-CN') : ''
  const camera = [photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ')
  const lens = photo.lens || ''
  return [takenAt, photo.location, camera, lens].filter(Boolean).join(' · ')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

useHead({
  title: computed(() => album.value ? album.value.name : '相册详情'),
})

useSeoMeta({
  title: computed(() => album.value ? `${album.value.name} - 照片相册` : '相册详情'),
  description: computed(() => album.value?.description || '浏览相册照片'),
})
</script>

<template>
  <div class="page-wrapper">
    <div v-if="pending" class="loading-container">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <el-skeleton :rows="6" animated />
        </el-col>
      </el-row>
    </div>

    <div v-else-if="error" class="error-container">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <el-result
            icon="warning"
            title="相册未找到"
            sub-title="这个相册可能不存在，或者并不公开。"
          >
            <template #extra>
              <NuxtLink to="/albums">
                <el-button type="primary">返回相册列表</el-button>
              </NuxtLink>
            </template>
          </el-result>
        </el-col>
      </el-row>
    </div>

    <template v-else-if="album">
      <section class="album-hero">
        <el-row justify="center">
          <el-col :xs="24" :sm="22" :md="20" :lg="18">
            <div class="hero-card">
              <NuxtLink to="/albums" class="back-link">← 返回相册列表</NuxtLink>
              <div class="hero-grid">
                <div>
                  <h1 class="album-title">{{ album.name }}</h1>
                  <p v-if="album.description" class="album-desc">{{ album.description }}</p>
                  <div class="album-meta">
                    <span>{{ album.photoCount }} 张照片</span>
                    <span>当前筛选 {{ stats.total }} 张</span>
                    <span>标签 {{ tags.length }}</span>
                  </div>
                </div>

                <div class="hero-tip">
                  <strong>浏览提示</strong>
                  <p>默认优先使用中图。原图只在你手动点“查看原图”后才加载，避免页面初始打开过慢。</p>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </section>

      <section class="photos-section">
        <el-row justify="center">
          <el-col :xs="24" :sm="22" :md="20" :lg="18">
            <div class="photo-tools">
              <el-input v-model="search" class="photo-search" placeholder="搜索照片标题、描述或文件名" clearable>
                <template #prefix>⌕</template>
              </el-input>

              <el-select v-if="tags.length" v-model="selectedTag" clearable placeholder="按标签筛选" class="tag-select">
                <el-option v-for="tag in tags" :key="tag" :label="tag" :value="tag" />
              </el-select>

              <span class="result-count">{{ filteredPhotos.length }} 张</span>
            </div>

            <div v-if="tags.length" class="tag-row">
              <el-tag
                :effect="selectedTag ? 'plain' : 'dark'"
                round
                class="tag-chip"
                @click="selectedTag = ''"
              >
                全部
              </el-tag>
              <el-tag
                v-for="tag in tags"
                :key="tag"
                :effect="selectedTag === tag ? 'dark' : 'plain'"
                round
                class="tag-chip"
                @click="selectedTag = tag"
              >
                {{ tag }}
              </el-tag>
            </div>

            <el-empty v-if="photos.length === 0" description="这个相册里还没有照片" />
            <el-empty v-else-if="filteredPhotos.length === 0" description="没有找到匹配的照片" />

            <div v-else class="photo-grid">
              <button
                v-for="photo in filteredPhotos"
                :key="photo.id"
                class="photo-card"
                type="button"
                :style="cardStyle(photo)"
                @click="openLightbox(photo)"
              >
                <img
                  :src="photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl"
                  :alt="photo.title"
                  loading="lazy"
                  class="photo-img"
                />
                <div class="photo-frame">
                  <div class="photo-overlay">
                    <span class="photo-title">{{ photo.title }}</span>
                    <div v-if="photo.tags?.length" class="photo-tags">
                      <el-tag
                        v-for="tag in photo.tags.slice(0, 3)"
                        :key="tag.id"
                        size="small"
                        effect="dark"
                        class="photo-tag"
                      >
                        {{ tag.name }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div v-if="hasMorePhotos" class="load-more-wrap">
              <el-button :loading="loadingMore" @click="loadMorePhotos">加载更多（已加载 {{ photos.length }} / {{ totalPhotos }}）</el-button>
            </div>
          </el-col>
        </el-row>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="lightboxVisible && currentPhoto" class="lightbox-backdrop" @click.self="closeLightbox">
          <button class="lightbox-close" aria-label="关闭" @click="closeLightbox">×</button>

          <button
            v-if="hasPrev"
            class="lightbox-nav lightbox-prev"
            aria-label="上一张"
            @click="goPrev"
          >
            ‹
          </button>

          <div class="lightbox-content">
            <div class="lightbox-stage">
              <img
                :src="currentPhotoSrc"
                :alt="currentPhoto.title"
                class="lightbox-img"
                loading="eager"
                decoding="async"
              />
            </div>

            <div class="lightbox-toolbar">
              <button
                v-if="!originalLoaded && currentPhoto.allowOriginalDownload"
                class="original-button"
                type="button"
                @click="originalLoaded = true"
              >
                查看原图
              </button>
              <button v-if="originalLoaded && currentPhoto.allowOriginalDownload" class="original-button" type="button" @click="originalLoaded = false">
                返回中图
              </button>
            </div>

            <div class="lightbox-info">
              <h3 class="lightbox-title">{{ currentPhoto.title }}</h3>
              <p v-if="currentPhoto.description" class="lightbox-desc">
                {{ currentPhoto.description }}
              </p>
              <p v-if="formatPhotoMeta(currentPhoto)" class="lightbox-meta">
                {{ formatPhotoMeta(currentPhoto) }}
              </p>
            </div>
          </div>

          <button
            v-if="hasNext"
            class="lightbox-nav lightbox-next"
            aria-label="下一张"
            @click="goNext"
          >
            ›
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  color: var(--color-text);
}

.loading-container,
.error-container {
  padding: 80px 20px;
}

.album-hero {
  padding: 40px 20px 24px;
}

.hero-card {
  padding: 22px 22px 20px;
  border: 1px solid rgba(208, 213, 221, .9);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, .84);
  box-shadow: var(--shadow-light);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.back-link:hover {
  opacity: .8;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(260px, .9fr);
  gap: 20px;
  align-items: start;
}

.album-title {
  font-size: clamp(1.9rem, 3.6vw, 3rem);
  line-height: 1.05;
  letter-spacing: -.06em;
  margin: 0 0 10px;
}

.album-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 12px;
  line-height: 1.7;
  max-width: 56ch;
}

.album-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: var(--color-text-muted);
  font: 12px var(--font-mono);
}

.hero-tip {
  padding: 16px;
  border-radius: 18px;
  background: var(--color-surface-2);
  border: 1px solid rgba(208, 213, 221, .72);
}

.hero-tip strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.hero-tip p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
  font-size: 13px;
}

.photos-section {
  padding: 24px 20px 80px;
}

.photo-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.photo-search {
  flex: 1 1 360px;
  min-width: 0;
}

.tag-select {
  width: 180px;
}

.result-count {
  margin-left: auto;
  font: 12px var(--font-mono);
  color: var(--color-text-muted);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.tag-chip {
  cursor: pointer;
  user-select: none;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.photo-card {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, .08), transparent 35%),
    var(--color-surface-2);
  box-shadow: 0 1px 1px rgba(16, 24, 40, .02);
  cursor: zoom-in;
  transition: transform .22s ease, box-shadow .22s ease;
}

.photo-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-light);
}

.photo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-frame {
  position: absolute;
  inset: 0;
  padding: 12px;
  display: flex;
  align-items: flex-end;
  background: linear-gradient(to top, rgba(10, 15, 25, .62), transparent 55%);
}

.photo-overlay {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo-title {
  color: #fff;
  font-size: 0.98rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .35);
}

.photo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.photo-tag {
  --el-tag-bg-color: rgba(255, 255, 255, 0.18);
  --el-tag-border-color: rgba(255, 255, 255, .18);
  --el-tag-text-color: #fff;
}

.lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(8, 11, 19, .94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 24px;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 46px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
}

.lightbox-prev {
  left: 18px;
}

.lightbox-next {
  right: 18px;
}

.lightbox-content {
  max-width: min(1120px, 92vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.lightbox-stage {
  max-height: 78vh;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, .03);
  box-shadow: 0 24px 60px rgba(0, 0, 0, .32);
}

.lightbox-img {
  max-width: 100%;
  max-height: 78vh;
  display: block;
  object-fit: contain;
}

.lightbox-toolbar {
  display: flex;
  justify-content: center;
}

.lightbox-info {
  text-align: center;
  color: #fff;
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}

.lightbox-title {
  margin: 0 0 6px;
  font-size: 1.06rem;
}

.lightbox-desc {
  margin: 0;
  color: rgba(255, 255, 255, .7);
  font-size: 0.9rem;
  line-height: 1.6;
}

.lightbox-meta {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, .58);
  font-size: .78rem;
  line-height: 1.5;
}

.original-button {
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, .08);
  cursor: pointer;
  font-size: 12px;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity .22s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .album-hero,
  .photos-section {
    padding-left: 16px;
    padding-right: 16px;
  }

  .photo-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .tag-select {
    width: 100%;
  }

  .result-count {
    margin-left: 0;
  }

  .lightbox-backdrop {
    padding: 18px;
  }

  .lightbox-nav {
    width: 40px;
    height: 40px;
  }
}
</style>
