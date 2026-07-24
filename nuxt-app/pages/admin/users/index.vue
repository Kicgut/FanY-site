<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const authFetch = useAuthFetch()

definePageMeta({ layout: 'admin' })

interface User {
  id: number
  username: string
  name: string
  role: string
  groups: string[] | string | null
  status: string
  aiAccess: boolean
  aiAccessLevel: string
  uploadQuotaMb: number
  usedQuotaMb: number
  createdAt: string
}

const { data, status, error, refresh } = await useAsyncData(
  'admin-users',
  () => authFetch<{ success: boolean; data: User[] }>('/api/admin/users'),
)

const currentUser = ref<{ id: number; username: string; role: string } | null>(null)
const users = computed(() => data.value?.data?.users ?? [])
const { data: groupData, refresh: refreshGroups } = await useAsyncData(
  'admin-groups',
  () => authFetch<{ success: boolean; data: { id: number; name: string }[] }>('/api/admin/groups'),
)
const knownGroups = computed(() => groupData.value?.data ?? [])
const newGroupName = ref('')

async function createGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  try {
    await authFetch('/api/admin/groups', { method: 'POST', body: { name } })
    newGroupName.value = ''
    await refreshGroups()
    ElMessage.success('Group created')
  } catch (e: any) { ElMessage.error(e?.data?.message || 'Failed to create group') }
}

onMounted(() => {
  try {
    currentUser.value = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    currentUser.value = null
  }
})

// ─── Edit Dialog ────────────────────────────────────────────────────────

const editDialogVisible = ref(false)
const createDialogVisible = ref(false)
const createForm = ref({ username: '', name: '', password: '', role: 'user', groups: [] as string[], aiAccess: false, aiAccessLevel: 'chat', uploadQuotaMb: 500 })
const editUser = ref<User | null>(null)
const editForm = ref({
  role: 'viewer',
  groups: [] as string[],
  status: 'active',
  aiAccess: false,
  aiAccessLevel: 'none',
  uploadQuotaMb: 500,
})

function openEditDialog(user: User) {
  editUser.value = user
  const groups = parseGroups(user.groups)
  editForm.value = {
    role: user.role,
    groups,
    status: user.status,
    aiAccess: user.aiAccess,
    aiAccessLevel: user.aiAccessLevel || 'none',
    uploadQuotaMb: user.uploadQuotaMb || 500,
  }
  editDialogVisible.value = true
}

function openCreateDialog() {
  createForm.value = { username: '', name: '', password: '', role: 'user', groups: [], aiAccess: false, aiAccessLevel: 'chat', uploadQuotaMb: 500 }
  createDialogVisible.value = true
}

async function handleCreate() {
  if (!createForm.value.username || !createForm.value.name || !createForm.value.password) return ElMessage.warning('请填写用户名、姓名和密码')
  try {
    await authFetch('/api/admin/users', { method: 'POST', body: createForm.value })
    ElMessage.success('用户已创建')
    createDialogVisible.value = false
    refresh()
  } catch (e: any) { ElMessage.error(e?.data?.message || '创建失败') }
}

function parseGroups(groups: string[] | string | null): string[] {
  if (Array.isArray(groups)) return groups
  if (typeof groups === 'string') {
    try { return JSON.parse(groups) } catch { return [] }
  }
  return []
}

async function handleSave() {
  if (!editUser.value) return
  if (editForm.value.status === 'disabled' && editUser.value.id === currentUser.value?.id) {
    ElMessage.warning('不能禁用自己')
    return
  }
  try {
    await authFetch(`/api/admin/users/${editUser.value.id}`, {
      method: 'PUT',
      body: editForm.value,
    })
    ElMessage.success('用户已更新')
    editDialogVisible.value = false
    refresh()
  } catch (e: any) {
    ElMessage.error(e.data?.message || '更新失败')
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function roleType(role: string) {
  const map: Record<string, string> = {
    admin: 'danger',
    superadmin: 'danger',
    user: 'info',
  }
  return map[role] || 'info'
}

function groupsDisplay(groups: string[] | string | null): string[] {
  return parseGroups(groups)
}
</script>

<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <div style="display:flex; gap:8px"><el-input v-model="newGroupName" placeholder="新建分组" style="width:150px" @keyup.enter="createGroup" /><el-button @click="createGroup">新建分组</el-button><el-button type="primary" @click="openCreateDialog">创建用户</el-button></div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-msg">
      <el-alert :title="error.message" type="error" show-icon />
    </div>

    <!-- Users Table -->
    <el-table v-loading="status === 'pending'" :data="users" stripe border style="width: 100%">
      <el-table-column prop="name" label="姓名" width="120" />

      <el-table-column prop="username" label="用户名" width="120" />

      <el-table-column label="角色" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="roleType(row.role)" size="small">
            {{ row.role }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="分组" min-width="160">
        <template #default="{ row }">
          <el-tag
            v-for="g in groupsDisplay(row.groups)"
            :key="g"
            size="small"
            effect="plain"
            class="group-tag"
          >
            {{ g }}
          </el-tag>
          <span v-if="groupsDisplay(row.groups).length === 0" class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '活跃' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="AI 访问" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.aiAccess ? 'success' : 'info'" size="small">
            {{ row.aiAccess ? '允许' : '禁止' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="AI 级别" width="100" align="center">
        <template #default="{ row }">
          {{ row.aiAccessLevel || 'none' }}
        </template>
      </el-table-column>

      <el-table-column label="配额" width="140" align="center">
        <template #default="{ row }">
          {{ row.usedQuotaMb || 0 }} / {{ row.uploadQuotaMb || 0 }} MB
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createDialogVisible" title="创建用户" width="520px">
      <el-form label-width="100px">
        <el-form-item label="用户名"><el-input v-model="createForm.username" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="createForm.name" /></el-form-item>
        <el-form-item label="初始密码"><el-input v-model="createForm.password" type="password" show-password /></el-form-item>
        <el-form-item label="角色"><el-select v-model="createForm.role" style="width:100%"><el-option label="管理员（后台管理）" value="admin" /><el-option label="普通用户（上传与个人照片）" value="user" /></el-select></el-form-item>
        <el-form-item label="分组"><el-select v-model="createForm.groups" filterable multiple style="width:100%" placeholder="选择已有分组"><el-option v-for="group in knownGroups" :key="group.id" :label="group.name" :value="group.name" /></el-select></el-form-item>
        <el-form-item label="AI 访问"><el-switch v-model="createForm.aiAccess" /></el-form-item>
        <el-form-item label="上传配额"><el-input-number v-model="createForm.uploadQuotaMb" :min="0" :step="100" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="createDialogVisible = false">取消</el-button><el-button type="primary" @click="handleCreate">创建</el-button></template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="520px">
      <el-form v-if="editUser" label-width="100px">
        <el-form-item label="用户">
          <el-input :model-value="`${editUser.name} (${editUser.username})`" disabled />
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户（上传与个人照片）" value="user" />
          </el-select>
        </el-form-item>

        <el-form-item label="分组">
          <el-select v-model="editForm.groups" filterable multiple style="width: 100%" placeholder="选择已有分组"><el-option v-for="group in knownGroups" :key="group.id" :label="group.name" :value="group.name" /></el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option label="活跃" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
          <el-alert
            v-if="editForm.status === 'disabled' && editUser.id === currentUser?.id"
            title="不能禁用自己"
            type="warning"
            :closable="false"
            style="margin-top: 8px"
          />
        </el-form-item>

        <el-form-item label="AI 访问">
          <el-switch v-model="editForm.aiAccess" />
        </el-form-item>

        <el-form-item label="AI 级别">
          <el-select v-model="editForm.aiAccessLevel" style="width: 100%">
            <el-option label="None" value="none" />
            <el-option label="Chat" value="chat" />
            <el-option label="Limited" value="limited" />
            <el-option label="Owner" value="owner" />
          </el-select>
        </el-form-item>

        <el-form-item label="上传配额 (MB)">
          <el-input-number v-model="editForm.uploadQuotaMb" :min="0" :step="100" style="width: 100%" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page {
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

.group-tag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.text-muted {
  color: #909399;
  font-size: 0.85rem;
}

.error-msg {
  margin-bottom: 16px;
}
</style>
