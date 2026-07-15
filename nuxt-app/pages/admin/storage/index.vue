<script setup lang="ts">
import { ref, computed } from 'vue'


const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

interface Photo {
  id: number
  visibility: string
  syncStatus: string | null
  storageLocation: string | null
  fileSize: number | null
}

const { data, status, error } = await useAsyncData(
  'admin-storage-stats',
  () => authFetch<{ photos: Photo[]; total: number }>('/api/photos', {
    query: { limit: 10000 },
  }),
)

const photos = computed(() => data.value?.photos ?? [])

// Count by visibility
const visibilityCounts = computed(() => {
  const counts: Record<string, number> = { public: 0, friends: 0, private: 0 }
  for (const p of photos.value) {
    if (p.visibility in counts) counts[p.visibility]++
  }
  return counts
})

// Count by syncStatus
const syncStatusCounts = computed(() => {
  const counts: Record<string, number> = { pending: 0, synced: 0, failed: 0 }
  for (const p of photos.value) {
    const s = p.syncStatus || 'pending'
    if (s in counts) counts[s]++
    else counts.pending++
  }
  return counts
})

// Count by storageLocation
const storageLocationCounts = computed(() => {
  const counts: Record<string, number> = { local: 0, ecs: 0, cold: 0 }
  for (const p of photos.value) {
    const loc = p.storageLocation || 'local'
    if (loc in counts) counts[loc]++
    else counts.local++
  }
  return counts
})

// Total storage estimate
const totalStorageMb = computed(() => {
  const bytes = photos.value.reduce((sum, p) => sum + (p.fileSize || 0), 0)
  return (bytes / 1024 / 1024).toFixed(1)
})

const totalStorageGb = computed(() => {
  const bytes = photos.value.reduce((sum, p) => sum + (p.fileSize || 0), 0)
  return (bytes / 1024 / 1024 / 1024).toFixed(2)
})
</script>

<template>
  <div class="storage-page">
    <div class="page-header">
      <h2>存储状态</h2>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-msg">
      <el-alert :title="error.message" type="error" show-icon />
    </div>

    <div v-loading="status === 'pending'" class="stats-grid">
      <!-- Total -->
      <el-card shadow="hover">
        <template #header>
          <span>概览</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="照片总数">{{ photos.length }}</el-descriptions-item>
          <el-descriptions-item label="总存储大小">{{ totalStorageGb }} GB ({{ totalStorageMb }} MB)</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Visibility -->
      <el-card shadow="hover">
        <template #header>
          <span>按可见性分布</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="公开 (public)">
            <el-tag type="success" size="small">{{ visibilityCounts.public }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="好友可见 (friends)">
            <el-tag type="warning" size="small">{{ visibilityCounts.friends }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="私密 (private)">
            <el-tag type="info" size="small">{{ visibilityCounts.private }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Sync Status -->
      <el-card shadow="hover">
        <template #header>
          <span>按同步状态分布</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="待同步 (pending)">
            <el-tag type="warning" size="small">{{ syncStatusCounts.pending }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="已同步 (synced)">
            <el-tag type="success" size="small">{{ syncStatusCounts.synced }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="同步失败 (failed)">
            <el-tag type="danger" size="small">{{ syncStatusCounts.failed }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Storage Location -->
      <el-card shadow="hover">
        <template #header>
          <span>按存储位置分布</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="本地 (local)">
            <el-tag type="info" size="small">{{ storageLocationCounts.local }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ECS (ecs)">
            <el-tag type="primary" size="small">{{ storageLocationCounts.ecs }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="冷存储 (cold)">
            <el-tag type="warning" size="small">{{ storageLocationCounts.cold }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <el-card shadow="never" style="margin-top: 20px">
      <el-alert
        title="同步脚本"
        description="照片同步、冷存储迁移等操作请参考项目文档中的 sync scripts 部分。"
        type="info"
        show-icon
        :closable="false"
      />
    </el-card>
  </div>
</template>

<style scoped>
.storage-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.error-msg {
  margin-bottom: 16px;
}
</style>
