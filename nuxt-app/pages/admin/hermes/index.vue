<script setup lang="ts">
import { ref, onMounted } from 'vue'


const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

const skillCount = ref(0)
const lastSyncTime = ref<string | null>(null)
const loading = ref(true)

async function loadStats() {
  loading.value = true
  try {
    const res = await authFetch<{ success: boolean; data: any[] }>('/api/admin/skills')
    skillCount.value = res.data?.length ?? 0
  } catch {
    // ignore
  }
  loading.value = false
}

onMounted(loadStats)
</script>

<template>
  <div class="hermes-dashboard">
    <div class="page-header">
      <h2>Hermes Dashboard</h2>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>Registered Skills</span>
          </template>
          <div class="stat-value">{{ skillCount }}</div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>Last Sync</span>
          </template>
          <div class="stat-value">{{ lastSyncTime || 'Never' }}</div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>Integration Status</span>
          </template>
          <el-tag type="success" size="large">Active</el-tag>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="info-card" shadow="never">
      <template #header>
        <div class="info-header">
          <span>Hermes Integration</span>
          <NuxtLink to="/admin/hermes/skills">
            <el-button type="primary" size="small">View Skills</el-button>
          </NuxtLink>
        </div>
      </template>
      <p>
        Hermes is an AI assistant framework that manages skills for content generation,
        photo analysis, and workflow automation. Skills are read-only from this interface —
        source files cannot be modified remotely.
      </p>
      <el-descriptions :column="1" border size="small" style="margin-top: 16px">
        <el-descriptions-item label="Skills Directory">~/.hermes/skills/</el-descriptions-item>
        <el-descriptions-item label="Access Mode">Read-Only</el-descriptions-item>
        <el-descriptions-item label="Sync">Manual (admin trigger)</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.hermes-dashboard {
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

.stats-row {
  margin-bottom: 24px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #303133;
  text-align: center;
  padding: 12px 0;
}

.info-card {
  margin-top: 8px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
