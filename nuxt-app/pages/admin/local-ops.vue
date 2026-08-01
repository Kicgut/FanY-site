<script setup lang="ts">
import { ref, onMounted } from 'vue'


const authFetch = useAuthFetch()
definePageMeta({
  layout: 'admin',
})

interface AccessInfo {
  origin: string
  ip: string
}

const accessInfo = ref<AccessInfo | null>(null)
const loading = ref(true)

const dangerousOps = [
  {
    name: 'Delete Article',
    endpoint: 'DELETE /api/articles/:id',
    description: 'Permanently removes an article from the database.',
    requires: 'local_trusted + admin',
  },
  {
    name: 'Delete Photo',
    endpoint: 'DELETE /api/photos/:id',
    description: 'Permanently removes a photo and its files from storage.',
    requires: 'local_trusted + admin',
  },
  {
    name: 'Delete Album',
    endpoint: 'DELETE /api/albums/:id',
    description: 'Permanently removes an album. Photos inside may become orphaned.',
    requires: 'local_trusted + admin',
  },
  {
    name: 'Sync Skills',
    endpoint: 'POST /api/admin/skills/sync',
    description: 'Synchronizes skill definitions from the filesystem to the database.',
    requires: 'local_trusted + admin',
  },
]

const trustedCidrs = [
  '127.0.0.1/32 (localhost)',
  '192.168.0.0/16 (private LAN)',
  '10.0.0.0/8 (private LAN)',
]

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await authFetch<{ success: boolean; data: AccessInfo }>('/api/admin/access-origin', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.success) accessInfo.value = res.data
  } catch {
    // silently ignore — will show unknown
  } finally {
    loading.value = false
  }
})

function originLabel(origin: string | undefined): string {
  switch (origin) {
    case 'local_trusted': return '本地受信任'
    case 'remote_owner': return '远程受限'
    case 'remote_user': return '远程用户'
    case 'public': return '公共访问'
    default: return '未知环境'
  }
}

function originColor(origin: string | undefined): string {
  switch (origin) {
    case 'local_trusted': return '#67c23a'
    case 'remote_owner': return '#e6a23c'
    case 'remote_user': return '#409eff'
    case 'public': return '#909399'
    default: return '#c0c4cc'
  }
}
</script>

<template>
  <div class="local-ops-page">
    <header class="page-header"><div><p class="kicker">RESTRICTED / LOCAL TRUST</p><h1>本地高权限</h1><p>这些操作由服务端再次校验访问来源；页面可见性不能替代权限验证。</p></div></header>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 24px"
    >
      <template #title>
        远程访问受限
      </template>
      即使是超级管理员，删除、Skill 同步等<strong>高风险操作</strong>也只能在<strong>本地受信任网络</strong>中执行。这用于降低远程账户受损后的影响范围。
    </el-alert>

    <!-- Current Access Origin -->
    <el-card shadow="never" style="margin-bottom: 24px">
      <template #header>
        <span style="font-weight: 600">当前访问环境</span>
      </template>
      <div v-if="loading" v-loading="true" style="height: 40px" />
      <div v-else>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="访问环境">
            <el-tag :color="originColor(accessInfo?.origin)" effect="dark" style="border: none; color: #fff">
              {{ originLabel(accessInfo?.origin) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="来源地址">
            {{ accessInfo?.ip ?? 'Unknown' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="accessInfo?.origin === 'remote_owner'"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 12px"
        >
          当前是<strong>远程受限</strong>环境。你仍可管理内容和用户，但无法执行删除、Skill 同步等高风险操作；请在本地受信任网络访问。
        </el-alert>
        <el-alert
          v-if="accessInfo?.origin === 'local_trusted'"
          type="success"
          :closable="false"
          show-icon
          style="margin-top: 12px"
        >
          当前是<strong>本地受信任</strong>环境。高风险操作仍需要服务端权限校验与审计记录。
        </el-alert>
      </div>
    </el-card>

    <!-- Protected operations remain unavailable remotely. -->
    <el-card v-if="accessInfo?.origin === 'local_trusted'" shadow="never" style="margin-bottom: 24px">
      <template #header>
        <span style="font-weight: 600">受限操作说明</span>
      </template>
      <el-table :data="dangerousOps" stripe>
        <el-table-column prop="name" label="操作" width="180" />
        <el-table-column prop="endpoint" label="服务端入口" width="240">
          <template #default="{ row }">
            <code>{{ row.endpoint }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="影响说明" />
        <el-table-column prop="requires" label="权限要求" width="180">
          <template #default="{ row }">
            <el-tag type="danger" size="small">{{ row.requires }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="accessInfo?.origin === 'local_trusted'" shadow="never" style="margin-bottom: 24px">
      <template #header>
        <span style="font-weight: 600">受信任网络范围</span>
      </template>
      <ul class="cidr-list">
        <li v-for="cidr in trustedCidrs" :key="cidr">{{ cidr }}</li>
      </ul>
      <p style="margin-top: 12px; color: #909399; font-size: 0.85rem">
        这些范围由 <code>LOCAL_TRUSTED_CIDRS</code> 配置；命中后仍需完成账户和服务端权限校验。
      </p>
    </el-card>

    <el-card v-if="accessInfo?.origin !== 'local_trusted'" shadow="never">
      <template #header>
        <span style="font-weight: 600">如何获得本地受信任访问</span>
      </template>
      <ol style="line-height: 2">
        <li>连接到配置为受信任的本地网络。</li>
        <li>通过本地入口访问后台，并重新登录。</li>
        <li>系统会根据 <code>LOCAL_TRUSTED_CIDRS</code> 自动判定访问环境。</li>
      </ol>
    </el-card>
  </div>
</template>

<style scoped>
.local-ops-page {
  max-width: 960px;
}

.page-header { margin-bottom: 20px; }.kicker { margin: 0 0 8px; color: #dfb467; font: 11px var(--font-mono); letter-spacing: .14em; }.page-header h1 { margin: 0; color: #edf8fb; font-size: 27px; }.page-header p:not(.kicker) { margin: 8px 0 0; color: #9eb5c2; font-size: 13px; }

.cidr-list {
  margin: 0;
  padding-left: 20px;
  line-height: 2;
}

.cidr-list li {
  font-family: monospace;
  font-size: 0.95rem;
}

code {
  background: rgba(148,184,214,.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85rem;
}
</style>
