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
    case 'local_trusted': return '✅ Local Trusted'
    case 'remote_owner': return '⚠️ Remote Owner'
    case 'remote_user': return '🔒 Remote User'
    case 'public': return '🌐 Public'
    default: return '❓ Unknown'
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
    <h1>🔒 Security — Local Trust Operations</h1>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 24px"
    >
      <template #title>
        Remote admins have limited permissions
      </template>
      Even if you are logged in as an admin, <strong>dangerous operations</strong> (deletes, skill sync, shell execution)
      are only allowed when accessing from a <strong>local trusted network</strong>. This protects the system
      from remote compromise.
    </el-alert>

    <!-- Current Access Origin -->
    <el-card shadow="never" style="margin-bottom: 24px">
      <template #header>
        <span style="font-weight: 600">Your Current Access</span>
      </template>
      <div v-if="loading" v-loading="true" style="height: 40px" />
      <div v-else>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Access Origin">
            <el-tag :color="originColor(accessInfo?.origin)" effect="dark" style="border: none; color: #fff">
              {{ originLabel(accessInfo?.origin) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Your IP">
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
          You are a <strong>remote owner</strong>. You can manage content and users, but
          <strong>cannot perform destructive operations</strong> (delete, skill sync).
          Access from your local network to unlock full admin capabilities.
        </el-alert>
        <el-alert
          v-if="accessInfo?.origin === 'local_trusted'"
          type="success"
          :closable="false"
          show-icon
          style="margin-top: 12px"
        >
          You have <strong>local trusted</strong> access. All admin operations are available.
        </el-alert>
      </div>
    </el-card>

    <!-- Protected Operations Table -->
    <el-card shadow="never" style="margin-bottom: 24px">
      <template #header>
        <span style="font-weight: 600">Operations Requiring Local Trusted Access</span>
      </template>
      <el-table :data="dangerousOps" stripe>
        <el-table-column prop="name" label="Operation" width="160" />
        <el-table-column prop="endpoint" label="Endpoint" width="240">
          <template #default="{ row }">
            <code>{{ row.endpoint }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Description" />
        <el-table-column prop="requires" label="Requires" width="180">
          <template #default="{ row }">
            <el-tag type="danger" size="small">{{ row.requires }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Trusted CIDR Ranges -->
    <el-card shadow="never" style="margin-bottom: 24px">
      <template #header>
        <span style="font-weight: 600">Trusted Network Ranges (LOCAL_TRUSTED_CIDRS)</span>
      </template>
      <ul class="cidr-list">
        <li v-for="cidr in trustedCidrs" :key="cidr">{{ cidr }}</li>
      </ul>
      <p style="margin-top: 12px; color: #909399; font-size: 0.85rem">
        These are configured via the <code>LOCAL_TRUSTED_CIDRS</code> environment variable.
        Requests from IPs matching any of these CIDRs are considered <strong>local trusted</strong>.
      </p>
    </el-card>

    <!-- How to access locally -->
    <el-card shadow="never">
      <template #header>
        <span style="font-weight: 600">How to Access from Local Network</span>
      </template>
      <ol style="line-height: 2">
        <li>Connect to your home/office LAN (Wi-Fi or Ethernet).</li>
        <li>Access the admin panel via the local IP, e.g. <code>http://192.168.x.x:3000/admin</code>.</li>
        <li>Or via a VPN that routes your traffic into the trusted CIDR range.</li>
        <li>Your IP will be checked against <code>LOCAL_TRUSTED_CIDRS</code> automatically.</li>
      </ol>
    </el-card>
  </div>
</template>

<style scoped>
.local-ops-page {
  max-width: 960px;
}

.local-ops-page h1 {
  margin-bottom: 24px;
  font-size: 1.5rem;
}

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
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85rem;
}
</style>
