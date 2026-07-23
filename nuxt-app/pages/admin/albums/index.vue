<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const authFetch = useAuthFetch()

function authImageUrl(url?: string | null) {
  if (!url || !import.meta.client) return url || ''
  const token = localStorage.getItem('token')
  if (!token || !url.startsWith('/api/photos/file')) return url
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
}
definePageMeta({ layout: 'admin' })

interface Album {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  photoCount: number
  visibility: 'public' | 'groups' | 'private'
  visibleTo?: string[] | null
  createdAt: string
}

// Fetch albums
const { data, status, error, refresh } = await useAsyncData(
  'admin-albums',
  () => authFetch<Album[]>('/api/albums'),
)

const albums = computed(() => data.value ?? [])

// Visibility helpers
const visibilityOptions = [
  { value: 'public', label: '公开', color: 'success' },
  { value: 'groups', label: '指定分组', color: 'warning' },
  { value: 'private', label: '私密', color: 'info' },
] as const

function getVisibilityLabel(v: string) {
  return visibilityOptions.find(o => o.value === v)?.label ?? v
}

function getVisibilityColor(v: string) {
  return (visibilityOptions.find(o => o.value === v)?.color ?? 'info') as 'success' | 'warning' | 'info'
}

// Create album
const createDialogVisible = ref(false)
const createForm = ref({ name: '', description: '', visibility: 'public' as string, visibleTo: [] as string[] })
const creating = ref(false)

function openCreateDialog() {
  createForm.value = { name: '', description: '', visibility: 'public', visibleTo: [] }
  createDialogVisible.value = true
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请输入相册名称')
    return
  }
  creating.value = true
  try {
    await authFetch('/api/albums', {
      method: 'POST',
      body: {
        name: createForm.value.name.trim(),
        description: createForm.value.description || null,
        visibility: createForm.value.visibility,
        visibleTo: createForm.value.visibleTo.map((group) => `group:${group}`),
      },
    })
    ElMessage.success('相册创建成功')
    createDialogVisible.value = false
    refresh()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

// Edit album
const editDialogVisible = ref(false)
const editForm = ref({
  id: 0,
  name: '',
  description: '',
  coverUrl: '',
  visibility: 'public' as string,
  visibleTo: [] as string[],
  originalVisibility: 'public' as string,
})
const editing = ref(false)
const cascadePhotos = ref(false)

function openEditDialog(album: Album) {
  editForm.value = {
    id: album.id,
    name: album.name,
    description: album.description || '',
    coverUrl: album.coverUrl || '',
    visibility: album.visibility || 'public',
    originalVisibility: album.visibility || 'public',
    visibleTo: Array.isArray(album.visibleTo) ? album.visibleTo.map((v) => String(v).replace(/^group:/, '')) : [],
  }
  cascadePhotos.value = false
  editDialogVisible.value = true
}

const visibilityChanged = computed(() => editForm.value.visibility !== editForm.value.originalVisibility)

async function handleEdit() {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入相册名称')
    return
  }
  editing.value = true
  try {
    // Update album info (name, description, coverUrl, visibility)
    await authFetch(`/api/albums/${editForm.value.id}`, {
      method: 'PUT',
      body: {
        name: editForm.value.name.trim(),
        description: editForm.value.description || null,
        coverUrl: editForm.value.coverUrl || null,
        visibility: editForm.value.visibility,
        visibleTo: editForm.value.visibleTo.map((group) => `group:${group}`),
      },
    })

    // Cascade visibility to photos if requested
    if (visibilityChanged.value && cascadePhotos.value) {
      const result = await authFetch<{ success: boolean; data?: { cascadeCount?: number } }>(
        `/api/admin/albums/${editForm.value.id}/visibility`,
        {
          method: 'PATCH',
          body: {
            visibility: editForm.value.visibility,
            cascadeToPhotos: true,
          },
        },
      )
      ElMessage.success(`相册已更新，同时更新了 ${result?.data?.cascadeCount ?? 0} 张照片的可见性`)
    } else {
      ElMessage.success('相册已更新')
    }

    editDialogVisible.value = false
    refresh()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '更新失败')
  } finally {
    editing.value = false
  }
}

// Delete album
async function handleDelete(album: Album) {
  try {
    await ElMessageBox.confirm(
      `确定删除相册「${album.name}」？相册中的照片不会被删除。`,
      '删除相册',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await authFetch(`/api/albums/${album.id}`, {
      method: 'DELETE',
    })
    ElMessage.success('相册已删除')
    refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// Date formatting
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <div class="albums-page">
    <div class="page-header">
      <h2>相册管理</h2>
      <el-button type="primary" @click="openCreateDialog">创建相册</el-button>
    </div>

    <div v-if="error" class="error-msg">
      <el-alert :title="error.message" type="error" show-icon />
    </div>

    <div v-loading="status === 'pending'" class="albums-grid">
      <el-empty v-if="!status && albums.length === 0" description="暂无相册" />

      <div v-for="album in albums" :key="album.id" class="album-card">
        <div class="album-cover">
          <img
            v-if="album.coverUrl"
            :src="authImageUrl(album.coverUrl)"
            :alt="album.name"
          />
          <div v-else class="album-cover-placeholder">
            <span>📁</span>
          </div>
        </div>
        <div class="album-info">
          <div class="album-name-row">
            <h3 class="album-name">{{ album.name }}</h3>
            <el-tag
              :type="getVisibilityColor(album.visibility)"
              size="small"
              effect="light"
            >
              {{ getVisibilityLabel(album.visibility) }}
            </el-tag>
          </div>
          <p v-if="album.description" class="album-desc">{{ album.description }}</p>
          <div class="album-meta">
            <span class="photo-count">{{ album.photoCount }} 张照片</span>
            <span class="album-date">{{ formatDate(album.createdAt) }}</span>
          </div>
        </div>
        <div class="album-actions">
          <el-button text type="primary" size="small" @click="navigateTo(`/admin/albums/${album.id}`)">
            管理照片
          </el-button>
          <el-button text type="primary" size="small" @click="openEditDialog(album)">
            编辑
          </el-button>
          <el-button text type="danger" size="small" @click="handleDelete(album)">
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- Create dialog -->
    <el-dialog v-model="createDialogVisible" title="创建相册" width="480px">
      <el-form label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="createForm.name" placeholder="相册名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选描述"
          />
        </el-form-item>
        <el-form-item label="可见性">
          <el-radio-group v-model="createForm.visibility">
            <el-radio value="public">公开</el-radio>
            <el-radio value="groups">指定分组</el-radio>
            <el-radio value="private">私密</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="createForm.visibility === 'groups'" label="分组"><el-select v-model="createForm.visibleTo" allow-create filterable multiple style="width:100%" placeholder="输入分组后回车" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- Edit dialog -->
    <el-dialog v-model="editDialogVisible" title="编辑相册" width="480px">
      <el-form label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" placeholder="相册名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选描述"
          />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input v-model="editForm.coverUrl" placeholder="封面图片 URL（可选）" />
        </el-form-item>
        <el-form-item label="可见性">
          <el-radio-group v-model="editForm.visibility">
            <el-radio value="public">公开</el-radio>
            <el-radio value="groups">指定分组</el-radio>
            <el-radio value="private">私密</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="editForm.visibility === 'groups'" label="分组"><el-select v-model="editForm.visibleTo" allow-create filterable multiple style="width:100%" placeholder="输入分组后回车" /></el-form-item>
        <el-form-item v-if="visibilityChanged" label="批量更新">
          <el-checkbox v-model="cascadePhotos">
            同时修改成员照片可见性
          </el-checkbox>
          <div class="cascade-hint">
            将把该相册中所有照片的可见性同步变更为「{{ getVisibilityLabel(editForm.visibility) }}」
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.albums-page {
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

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.album-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.album-card:hover {
  border-color: #c6e2ff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.album-cover {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: #f5f7fa;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: linear-gradient(135deg, #ecf5ff 0%, #f5f7fa 100%);
}

.album-info {
  padding: 16px;
}

.album-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.album-name {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.album-desc {
  font-size: 0.85rem;
  color: #909399;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.album-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #909399;
}

.photo-count {
  font-weight: 500;
}

.album-actions {
  padding: 0 16px 12px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.error-msg {
  margin-bottom: 16px;
}

.cascade-hint {
  font-size: 0.8rem;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
