<script setup lang="ts">
interface PublicAlbum {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  photoCount: number
  previewPhotos?: { id: number; thumbnailUrl?: string | null; mediumUrl?: string | null; originalUrl: string }[]
}

interface AlbumsResponse {
  success: boolean
  data: PublicAlbum[]
}

const { data, pending, error } = await useFetch<AlbumsResponse>('/api/albums/public')

const albums = computed(() => data.value?.data ?? [])

useHead({ title: '照片相册' })
useSeoMeta({
  title: '照片相册',
  description: '浏览精选照片相册，记录生活中的美好瞬间。',
  ogTitle: '照片相册',
  ogDescription: '浏览精选照片相册，记录生活中的美好瞬间。',
})
</script>

<template>
  <div class="page-wrapper">
    <section class="albums-header">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <h1 class="page-title">照片相册</h1>
          <p class="page-subtitle">精选相册，用影像讲述故事</p>
        </el-col>
      </el-row>
    </section>

    <section class="albums-section">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <!-- Loading -->
          <div v-if="pending" class="loading-state">
            <el-skeleton :rows="4" animated />
          </div>

          <!-- Error -->
          <el-alert
            v-else-if="error"
            type="error"
            title="加载失败"
            description="无法获取相册列表，请稍后再试。"
            show-icon
            :closable="false"
          />

          <!-- Empty -->
          <el-empty v-else-if="albums.length === 0" description="暂无公开相册" />

          <!-- Album grid -->
          <div v-else class="albums-grid">
            <NuxtLink
              v-for="album in albums"
              :key="album.id"
              :to="`/albums/${album.id}`"
              class="album-card"
            >
              <!-- Cover area -->
              <div class="album-cover">
                <!-- Preview mosaic if album has preview photos -->
                <template v-if="album.previewPhotos?.length">
                  <div class="preview-mosaic">
                    <img
                      v-for="(p, i) in album.previewPhotos.slice(0, 4)"
                      :key="p.id"
                      :src="p.thumbnailUrl || p.mediumUrl || p.originalUrl"
                      :alt="album.name"
                      :class="['mosaic-img', `mosaic-${album.previewPhotos.length > 4 ? 4 : album.previewPhotos.length}-${i}`]"
                      loading="lazy"
                    />
                  </div>
                </template>
                <img
                  v-else-if="album.coverUrl"
                  :src="album.coverUrl"
                  :alt="album.name"
                  class="cover-img"
                  loading="lazy"
                />
                <div v-else class="cover-placeholder">
                  <span>📷</span>
                </div>
              </div>

              <!-- Info -->
              <div class="album-info">
                <h3 class="album-name">{{ album.name }}</h3>
                <p v-if="album.description" class="album-desc">{{ album.description }}</p>
                <span class="album-count">{{ album.photoCount }} 张照片</span>
              </div>
            </NuxtLink>
          </div>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  color: var(--color-text);
  font-family: var(--font-family);
}

.albums-header {
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

.albums-section {
  padding: 40px 20px 80px;
}

.loading-state {
  padding: 40px 0;
}

/* Albums Grid */
.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.album-card {
  display: block;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-bg, #fff);
  box-shadow: var(--shadow-light, 0 2px 8px rgba(0,0,0,0.06));
  text-decoration: none;
  color: inherit;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.album-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Cover */
.album-cover {
  width: 100%;
  height: 220px;
  overflow: hidden;
  background: var(--color-bg-secondary, #f5f7fa);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.album-card:hover .cover-img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: linear-gradient(135deg, #ecf5ff 0%, #f5f7fa 100%);
}

/* Preview Mosaic */
.preview-mosaic {
  display: grid;
  width: 100%;
  height: 100%;
  gap: 2px;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.mosaic-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 1 photo: full width */
.mosaic-1-0 {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}

/* 2 photos: side by side */
.mosaic-2-0 { grid-column: 1; grid-row: 1 / -1; }
.mosaic-2-1 { grid-column: 2; grid-row: 1 / -1; }

/* 3 photos */
.mosaic-3-0 { grid-column: 1; grid-row: 1 / -1; }
.mosaic-3-1 { grid-column: 2; grid-row: 1; }
.mosaic-3-2 { grid-column: 2; grid-row: 2; }

/* 4 photos: default 2x2 grid, no override needed */

/* Album Info */
.album-info {
  padding: 16px;
}

.album-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--color-text, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #909399);
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.album-count {
  font-size: 0.8rem;
  color: var(--color-text-muted, #909399);
  font-weight: 500;
}

/* Responsive */
@media (max-width: 640px) {
  .albums-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 1.75rem;
  }
}
</style>
