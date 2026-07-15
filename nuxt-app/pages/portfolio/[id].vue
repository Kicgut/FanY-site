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
  fileSize?: number | null
  mimeType?: string | null
  location?: string | null
  takenAt?: string | null
  status: string
  createdAt: string
  updatedAt: string
  tags?: { id: number; name: string }[]
  albums?: { id: number; order: number; album: { id: number; name: string } }[]
}

const route = useRoute()
const photoId = route.params.id

const { data: photo, pending, error } = await useFetch<Photo>(`/api/photos/${photoId}`)

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const resolution = computed(() => {
  if (!photo.value) return null
  const { width, height } = photo.value
  if (width && height) return `${width} × ${height}`
  return null
})

useHead({
  title: computed(() => photo.value ? photo.value.title : '照片详情'),
})

useSeoMeta({
  title: computed(() => photo.value ? `${photo.value.title} - 摄影作品集` : '照片详情'),
  description: computed(() => photo.value?.description || '摄影作品详情'),
})
</script>

<template>
  <div class="page-wrapper">
    <!-- Loading -->
    <div v-if="pending" class="loading-container">
      <el-row justify="center">
        <el-col :xs="24" :sm="20" :md="16">
          <el-skeleton :rows="8" animated />
        </el-col>
      </el-row>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <el-row justify="center">
        <el-col :xs="24" :sm="20" :md="16">
          <el-result
            icon="warning"
            title="照片未找到"
            sub-title="该照片可能已被删除或链接无效。"
          >
            <template #extra>
              <NuxtLink to="/portfolio">
                <el-button type="primary">返回作品集</el-button>
              </NuxtLink>
            </template>
          </el-result>
        </el-col>
      </el-row>
    </div>

    <!-- Photo detail -->
    <template v-else-if="photo">
      <section class="detail-header">
        <el-row justify="center">
          <el-col :xs="24" :sm="22" :md="20" :lg="18">
            <NuxtLink to="/portfolio" class="back-link">
              ← 返回作品集
            </NuxtLink>
          </el-col>
        </el-row>
      </section>

      <section class="detail-section">
        <el-row justify="center">
          <el-col :xs="24" :sm="22" :md="20" :lg="18">
            <div class="detail-layout">
              <!-- Image -->
              <div class="detail-image-wrapper">
                <img
                  :src="photo.originalUrl"
                  :alt="photo.title"
                  class="detail-image"
                />
              </div>

              <!-- Info panel -->
              <div class="detail-info">
                <h1 class="detail-title">{{ photo.title }}</h1>

                <p v-if="photo.description" class="detail-description">
                  {{ photo.description }}
                </p>

                <!-- Tags -->
                <div v-if="photo.tags?.length" class="detail-tags">
                  <el-tag
                    v-for="tag in photo.tags"
                    :key="tag.id"
                    effect="plain"
                    class="detail-tag"
                  >
                    {{ tag.name }}
                  </el-tag>
                </div>

                <!-- Meta info -->
                <el-divider />

                <div class="meta-grid">
                  <div v-if="photo.location" class="meta-item">
                    <span class="meta-label">📍 位置</span>
                    <span class="meta-value">{{ photo.location }}</span>
                  </div>

                  <div v-if="photo.takenAt" class="meta-item">
                    <span class="meta-label">📅 拍摄时间</span>
                    <span class="meta-value">{{ formatDate(photo.takenAt) }}</span>
                  </div>

                  <div v-if="resolution" class="meta-item">
                    <span class="meta-label">📐 分辨率</span>
                    <span class="meta-value">{{ resolution }}</span>
                  </div>

                  <div v-if="photo.fileSize" class="meta-item">
                    <span class="meta-label">📦 文件大小</span>
                    <span class="meta-value">{{ formatFileSize(photo.fileSize) }}</span>
                  </div>

                  <div v-if="photo.mimeType" class="meta-item">
                    <span class="meta-label">🖼️ 格式</span>
                    <span class="meta-value">{{ photo.mimeType }}</span>
                  </div>

                  <div v-if="photo.filename" class="meta-item">
                    <span class="meta-label">📄 文件名</span>
                    <span class="meta-value mono">{{ photo.filename }}</span>
                  </div>
                </div>

                <!-- Albums -->
                <template v-if="photo.albums?.length">
                  <el-divider />
                  <div class="detail-albums">
                    <span class="meta-label">📁 所属相册</span>
                    <div class="album-list">
                      <el-tag
                        v-for="ap in photo.albums"
                        :key="ap.id"
                        type="info"
                        effect="plain"
                      >
                        {{ ap.album.name }}
                      </el-tag>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </el-col>
        </el-row>
      </section>
    </template>
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

.detail-header {
  padding: 32px 20px 0;
}

.back-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: opacity 0.2s;
}

.back-link:hover {
  opacity: 0.7;
}

.detail-section {
  padding: 24px 20px 80px;
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 32px;
  align-items: start;
}

.detail-image-wrapper {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-light);
  background: var(--color-bg-secondary);
}

.detail-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.detail-info {
  position: sticky;
  top: calc(var(--nav-height) + 24px);
}

.detail-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--color-text);
}

.detail-description {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-tag {
  border-radius: 16px;
}

.meta-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.meta-value {
  font-size: 0.95rem;
  color: var(--color-text);
}

.meta-value.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.detail-albums {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.album-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Responsive */
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-info {
    position: static;
  }
}

@media (max-width: 640px) {
  .detail-title {
    font-size: 1.35rem;
  }
}
</style>
