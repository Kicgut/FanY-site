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

interface PhotoResponse {
  photos: Photo[]
  total: number
}

const route = useRoute()
const router = useRouter()

// Filter state from URL
const selectedTag = ref((route.query.tag as string) || '')
const searchTitle = ref((route.query.q as string) || '')

// Build query params for API
const queryParams = computed(() => ({
  status: 'published',
  limit: 50,
  ...(selectedTag.value ? { tag: selectedTag.value } : {}),
  ...(searchTitle.value ? { title: searchTitle.value } : {}),
}))

const { data, pending, error } = await useFetch<PhotoResponse>('/api/photos', {
  query: queryParams,
})

const photos = computed(() => data.value?.photos ?? [])

// Extract unique tags from photos
const { data: allPhotosData } = await useFetch<PhotoResponse>('/api/photos', {
  query: { status: 'published', limit: 100 },
})

const availableTags = computed(() => {
  const tagSet = new Map<string, string>()
  for (const p of allPhotosData.value?.photos ?? []) {
    for (const t of p.tags ?? []) {
      tagSet.set(t.name, t.name)
    }
  }
  return [...tagSet.values()].sort()
})

// Sync filters to URL
watch([selectedTag, searchTitle], ([tag, q]) => {
  const query: Record<string, string> = {}
  if (tag) query.tag = tag
  if (q) query.q = q
  router.replace({ query })
})

function selectTag(tag: string) {
  selectedTag.value = selectedTag.value === tag ? '' : tag
}

function resetFilters() {
  selectedTag.value = ''
  searchTitle.value = ''
}

// Lightbox state
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
  return photos.value.findIndex((p) => p.id === currentPhoto.value!.id)
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < photos.value.length - 1)

const goPrev = () => {
  if (hasPrev.value) {
    currentPhoto.value = photos.value[currentIndex.value - 1]
  }
}

const goNext = () => {
  if (hasNext.value) {
    currentPhoto.value = photos.value[currentIndex.value + 1]
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!lightboxVisible.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') goPrev()
  if (e.key === 'ArrowRight') goNext()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

useHead({
  title: '作品集',
})

useSeoMeta({
  title: '摄影作品集',
  description: '浏览我的摄影作品，记录生活中的美好瞬间。',
  ogTitle: '摄影作品集',
  ogDescription: '浏览我的摄影作品，记录生活中的美好瞬间。',
})
</script>

<template>
  <div class="page-wrapper">
    <section class="gallery-header">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <h1 class="page-title">摄影作品</h1>
          <p class="page-subtitle">用镜头记录生活中的每一个美好瞬间</p>
        </el-col>
      </el-row>
    </section>

    <section class="gallery-section">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <!-- Filters -->
          <div class="filter-bar">
            <el-input
              v-model="searchTitle"
              placeholder="搜索照片标题..."
              clearable
              class="search-input"
            >
              <template #prefix>
                <span>🔍</span>
              </template>
            </el-input>

            <div v-if="availableTags.length" class="tag-pills">
              <button
                v-for="tag in availableTags"
                :key="tag"
                :class="['tag-pill', { active: selectedTag === tag }]"
                @click="selectTag(tag)"
              >
                {{ tag }}
              </button>
              <button
                v-if="selectedTag || searchTitle"
                class="tag-pill reset"
                @click="resetFilters"
              >
                重置
              </button>
            </div>
          </div>

          <!-- Active filter info -->
          <div v-if="selectedTag || searchTitle" class="filter-info">
            <span>
              筛选结果：
              <template v-if="searchTitle">标题包含 "{{ searchTitle }}"</template>
              <template v-if="selectedTag && searchTitle"> &amp; </template>
              <template v-if="selectedTag">标签 "{{ selectedTag }}"</template>
              — 共 {{ photos.length }} 张照片
            </span>
          </div>

          <!-- Loading state -->
          <div v-if="pending" class="loading-state">
            <el-skeleton :rows="5" animated />
          </div>

          <!-- Error state -->
          <el-alert
            v-else-if="error"
            type="error"
            title="加载失败"
            description="无法获取照片列表，请稍后再试。"
            show-icon
            :closable="false"
          />

          <!-- Empty state -->
          <el-empty v-else-if="photos.length === 0" :description="selectedTag || searchTitle ? '没有匹配的照片' : '暂无照片'" />

          <!-- Photo grid -->
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
          >
            ‹
          </button>

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
              <NuxtLink :to="`/portfolio/${currentPhoto.id}`" class="lightbox-detail-link">
                查看详情 →
              </NuxtLink>
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
  font-family: var(--font-family);
}

.gallery-header {
  text-align: center;
  padding: 60px 20px 32px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 100%);
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--color-text);
}

.page-subtitle {
  font-size: 1.05rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.gallery-section {
  padding: 40px 20px 80px;
}

/* Filter bar */
.filter-bar {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input {
  max-width: 360px;
}

.tag-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  padding: 6px 16px;
  border: 1px solid var(--color-border, #dcdfe6);
  border-radius: 20px;
  background: var(--color-bg, #fff);
  color: var(--color-text-secondary, #606266);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tag-pill:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}

.tag-pill.active {
  background: var(--color-primary, #409eff);
  border-color: var(--color-primary, #409eff);
  color: #fff;
}

.tag-pill.reset {
  border-color: var(--color-danger, #f56c6c);
  color: var(--color-danger, #f56c6c);
}

.tag-pill.reset:hover {
  background: var(--color-danger, #f56c6c);
  color: #fff;
}

.filter-info {
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--color-text-secondary, #909399);
}

.loading-state {
  padding: 40px 0;
}

/* Masonry-like grid using CSS columns */
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
  box-shadow: var(--shadow-light);
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

/* Responsive columns */
@media (max-width: 1024px) {
  .photo-grid {
    columns: 2;
  }
}

@media (max-width: 640px) {
  .photo-grid {
    columns: 1;
  }

  .page-title {
    font-size: 1.75rem;
  }
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

.lightbox-close:hover {
  opacity: 0.7;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: #fff;
  font-size: 3rem;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.2s;
  z-index: 10;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.25);
}

.lightbox-prev {
  left: 16px;
}

.lightbox-next {
  right: 16px;
}

.lightbox-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 90vw;
  max-height: 85vh;
}

.lightbox-img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 6px;
}

.lightbox-info {
  text-align: center;
  margin-top: 16px;
  color: #fff;
}

.lightbox-title {
  font-size: 1.25rem;
  margin: 0 0 8px;
}

.lightbox-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 8px;
}

.lightbox-detail-link {
  color: var(--color-primary);
  font-size: 0.9rem;
  text-decoration: none;
}

.lightbox-detail-link:hover {
  text-decoration: underline;
}

/* Lightbox transitions */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
