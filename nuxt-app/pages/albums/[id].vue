<script setup lang="ts">
interface Photo {
  id: number
  title: string
  description?: string | null
  filename: string
  originalUrl: string
  thumbnailUrl?: string | null
  mediumUrl?: string | null
  width?: number | null
  height?: number | null
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
  }
}

const route = useRoute()
const albumId = route.params.id

const { data, pending, error } = await useFetch<AlbumResponse>(`/api/albums/public/${albumId}`)

const album = computed(() => data.value?.data?.album ?? null)
const photos = computed(() => data.value?.data?.photos ?? [])

// Lightbox
const lightboxVisible = ref(false)
const currentPhoto = ref<Photo | null>(null)

const openLightbox = (photo: Photo) => {
  currentPhoto.value = photo
  lightboxVisible.value = true
}

const closeLightbox = () => {
  lightboxVisible.value = false
  currentPhoto.value = null
}

const currentIndex = computed(() => {
  if (!currentPhoto.value) return -1
  return photos.value.findIndex(p => p.id === currentPhoto.value!.id)
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < photos.value.length - 1)

const goPrev = () => {
  if (hasPrev.value) currentPhoto.value = photos.value[currentIndex.value - 1]
}
const goNext = () => {
  if (hasNext.value) currentPhoto.value = photos.value[currentIndex.value + 1]
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!lightboxVisible.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') goPrev()
  if (e.key === 'ArrowRight') goNext()
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
    <!-- Loading -->
    <div v-if="pending" class="loading-container">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <el-skeleton :rows="6" animated />
        </el-col>
      </el-row>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <el-result
            icon="warning"
            title="相册未找到"
            sub-title="该相册可能不存在或不是公开相册。"
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

    <!-- Album Detail -->
    <template v-else-if="album">
      <section class="album-header">
        <el-row justify="center">
          <el-col :xs="24" :sm="22" :md="20" :lg="18">
            <NuxtLink to="/albums" class="back-link">← 返回相册列表</NuxtLink>
            <h1 class="album-title">{{ album.name }}</h1>
            <p v-if="album.description" class="album-desc">{{ album.description }}</p>
            <span class="album-count">{{ album.photoCount }} 张照片</span>
          </el-col>
        </el-row>
      </section>

      <section class="photos-section">
        <el-row justify="center">
          <el-col :xs="24" :sm="22" :md="20" :lg="18">
            <el-empty v-if="photos.length === 0" description="相册中暂无照片" />

            <div v-else class="photo-grid">
              <div
                v-for="photo in photos"
                :key="photo.id"
                class="photo-card"
                @click="openLightbox(photo)"
              >
                <img
                  :src="photo.mediumUrl || photo.originalUrl"
                  :alt="photo.title"
                  loading="lazy"
                  class="photo-img"
                />
                <div class="photo-overlay">
                  <span class="photo-title">{{ photo.title }}</span>
                  <div v-if="photo.tags?.length" class="photo-tags">
                    <el-tag
                      v-for="tag in photo.tags"
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
            </div>
          </el-col>
        </el-row>
      </section>
    </template>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="lightboxVisible && currentPhoto" class="lightbox-backdrop" @click.self="closeLightbox">
          <button class="lightbox-close" aria-label="关闭" @click="closeLightbox">×</button>

          <button
            v-if="hasPrev"
            class="lightbox-nav lightbox-prev"
            aria-label="上一张"
            @click="goPrev"
          >‹</button>

          <div class="lightbox-content">
            <img
              :src="currentPhoto.originalUrl"
              :alt="currentPhoto.title"
              class="lightbox-img"
            />
            <div class="lightbox-info">
              <h3 class="lightbox-title">{{ currentPhoto.title }}</h3>
              <p v-if="currentPhoto.description" class="lightbox-desc">
                {{ currentPhoto.description }}
              </p>
            </div>
          </div>

          <button
            v-if="hasNext"
            class="lightbox-nav lightbox-next"
            aria-label="下一张"
            @click="goNext"
          >›</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  color: var(--color-text);
  font-family: var(--font-family);
}

.loading-container,
.error-container {
  padding: 80px 20px;
}

/* Album Header */
.album-header {
  padding: 40px 20px 32px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 100%);
}

.back-link {
  display: inline-block;
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 16px;
  transition: opacity 0.2s;
}

.back-link:hover {
  opacity: 0.7;
}

.album-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--color-text);
}

.album-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 10px;
  line-height: 1.6;
}

.album-count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

/* Photos Section */
.photos-section {
  padding: 40px 20px 80px;
}

/* Masonry Grid */
.photo-grid {
  columns: 3;
  column-gap: 16px;
}

.photo-card {
  break-inside: avoid;
  margin-bottom: 16px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  box-shadow: var(--shadow-light, 0 2px 8px rgba(0,0,0,0.06));
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.photo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.photo-img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
}

.photo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.photo-tag {
  --el-tag-bg-color: rgba(255, 255, 255, 0.2);
  --el-tag-border-color: transparent;
  --el-tag-text-color: #fff;
  font-size: 0.7rem;
}

/* Lightbox */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 24px;
  background: none;
  border: none;
  color: #fff;
  font-size: 2.5rem;
  cursor: pointer;
  z-index: 10;
  line-height: 1;
  padding: 4px 8px;
  transition: opacity 0.2s;
}

.lightbox-close:hover { opacity: 0.7; }

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: #fff;
  font-size: 2.5rem;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background 0.2s;
  z-index: 10;
}

.lightbox-nav:hover { background: rgba(255, 255, 255, 0.25); }
.lightbox-prev { left: 16px; }
.lightbox-next { right: 16px; }

.lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
  border-radius: 4px;
}

.lightbox-info {
  text-align: center;
  margin-top: 16px;
  color: #fff;
}

.lightbox-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 4px;
}

.lightbox-desc {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* Transitions */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .photo-grid { columns: 2; }
}

@media (max-width: 640px) {
  .photo-grid { columns: 1; }
  .album-title { font-size: 1.5rem; }
  .lightbox-backdrop { padding: 20px; }
  .lightbox-nav { font-size: 1.8rem; padding: 6px 10px; }
}
</style>
