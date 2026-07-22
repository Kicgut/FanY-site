<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

interface SkillTag {
  id: number
  tag: string
  tagType: string
}

interface Skill {
  id: number
  name: string
  category: string | null
  description: string | null
  path: string
  author: string | null
  project: string | null
  status: string
  riskLevel: string
  usageCount: number
  lastUsedAt: string | null
  notes: string | null
  tags: SkillTag[]
  createdAt: string
  updatedAt: string
}

const skills = ref<Skill[]>([])
const loading = ref(false)
const syncing = ref(false)
const localTrusted = ref(false)

// Filters
const statusFilter = ref('')
const categoryFilter = ref('')
const authorFilter = ref('')
const projectFilter = ref('')
const tagFilter = ref('')

// Detail
const detailDialogVisible = ref(false)
const detailSkill = ref<{ skill: Skill; content: string } | null>(null)
const detailLoading = ref(false)

// Tag management
const tagDialogVisible = ref(false)
const tagTargetSkill = ref<Skill | null>(null)
const newTagName = ref('')
const newTagType = ref('custom')
const presetTags = ref<Record<string, string[]>>({})
const existingTags = ref<{ tag: string; tagType: string }[]>([])

// Filter options
const categories = computed(() => {
  const set = new Set(skills.value.map((s) => s.category).filter(Boolean))
  return Array.from(set).sort()
})
const authors = computed(() => {
  const set = new Set(skills.value.map((s) => s.author).filter(Boolean))
  return Array.from(set).sort()
})
const projects = computed(() => {
  const set = new Set(skills.value.map((s) => s.project).filter(Boolean))
  return Array.from(set).sort()
})

async function loadSkills() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (categoryFilter.value) params.set('category', categoryFilter.value)
    if (authorFilter.value) params.set('author', authorFilter.value)
    if (projectFilter.value) params.set('project', projectFilter.value)
    if (tagFilter.value) params.set('tag', tagFilter.value)
    const qs = params.toString()
    const url = '/api/admin/skills' + (qs ? `?${qs}` : '')

    const res = await authFetch<{ success: boolean; data: Skill[] }>(url)
    skills.value = res.data ?? []
  } catch {
    ElMessage.error('Failed to load skills')
  }
  loading.value = false
}

async function loadTags() {
  try {
    const res = await authFetch<{ success: boolean; data: { presetTags: Record<string, string[]>; existingTags: { tag: string; tagType: string }[] } }>(
      '/api/admin/skills/tags'
    )
    presetTags.value = res.data.presetTags
    existingTags.value = res.data.existingTags
  } catch {
    // silent
  }
}

async function handleSync() {
  syncing.value = true
  try {
    const res = await authFetch<{ success: boolean; data: { synced: number; total: number } }>(
      '/api/admin/skills/sync',
      { method: 'POST' }
    )
    ElMessage.success(`Synced ${res.data.synced} of ${res.data.total} skills`)
    await loadSkills()
  } catch {
    ElMessage.error('Sync failed')
  }
  syncing.value = false
}

async function viewDetail(skill: Skill) {
  detailLoading.value = true
  detailDialogVisible.value = true
  detailSkill.value = null
  try {
    const res = await authFetch<{ success: boolean; data: { skill: Skill; content: string } }>(
      `/api/admin/skills/${encodeURIComponent(skill.name)}`
    )
    detailSkill.value = res.data
  } catch {
    ElMessage.error('Failed to load skill details')
  }
  detailLoading.value = false
}

// Tag management dialog
function openTagDialog(skill: Skill) {
  tagTargetSkill.value = skill
  newTagName.value = ''
  newTagType.value = 'custom'
  tagDialogVisible.value = true
}

async function addTag() {
  if (!tagTargetSkill.value || !newTagName.value.trim()) return
  try {
    await authFetch('/api/admin/skills/tags', {
      method: 'POST',
      body: {
        skillName: tagTargetSkill.value.name,
        tag: newTagName.value.trim(),
        tagType: newTagType.value,
      },
    })
    ElMessage.success('Tag added')
    newTagName.value = ''
    await loadSkills()
    await loadTags()
    // Update detail if viewing
    if (detailSkill.value?.skill.name === tagTargetSkill.value.name) {
      const idx = skills.value.findIndex((s) => s.name === tagTargetSkill.value!.name)
      if (idx >= 0) detailSkill.value.skill = skills.value[idx]
    }
  } catch (err: any) {
    if (err?.statusCode === 409) {
      ElMessage.warning('Tag already exists')
    } else {
      ElMessage.error('Failed to add tag')
    }
  }
}

async function removeTag(skillName: string, tag: string) {
  try {
    await authFetch('/api/admin/skills/tags', {
      method: 'DELETE',
      body: { skillName, tag },
    })
    ElMessage.success('Tag removed')
    await loadSkills()
    if (detailSkill.value?.skill.name === skillName) {
      const idx = skills.value.findIndex((s) => s.name === skillName)
      if (idx >= 0) detailSkill.value.skill = skills.value[idx]
    }
  } catch {
    ElMessage.error('Failed to remove tag')
  }
}

function addPresetTag(tag: string) {
  newTagName.value = tag
  newTagType.value = 'preset'
  addTag()
}

// Helpers
function statusType(status: string): string {
  return { active: 'success', new: 'info', experimental: 'warning', deprecated: 'danger' }[status] || 'info'
}
function riskType(risk: string): string {
  return { low: 'success', medium: 'warning', high: 'danger' }[risk] || 'info'
}
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  loadSkills()
  loadTags()
  authFetch<{ success: boolean; data: { origin: string } }>('/api/admin/access-origin').then((res) => { localTrusted.value = res.data.origin === 'local_trusted' }).catch(() => {})
})
</script>

<template>
  <div class="skills-page">
    <div class="page-header">
      <h2>Hermes Skills</h2>
      <div class="header-actions">
        <el-select v-model="statusFilter" placeholder="Status" clearable style="width: 130px" @change="loadSkills">
          <el-option label="New" value="new" />
          <el-option label="Active" value="active" />
          <el-option label="Experimental" value="experimental" />
          <el-option label="Deprecated" value="deprecated" />
        </el-select>
        <el-select v-model="categoryFilter" placeholder="Category" clearable style="width: 150px" @change="loadSkills">
          <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
        </el-select>
        <el-select v-model="authorFilter" placeholder="Author" clearable style="width: 120px" @change="loadSkills">
          <el-option v-for="a in authors" :key="a" :label="a" :value="a" />
        </el-select>
        <el-select v-model="projectFilter" placeholder="Project" clearable style="width: 150px" @change="loadSkills">
          <el-option v-for="p in projects" :key="p" :label="p" :value="p" />
        </el-select>
        <el-button v-if="localTrusted" type="primary" :loading="syncing" @click="handleSync">
          Sync Skills
        </el-button>
        <el-tag v-else type="warning">远程只读；本地可信网络才可同步</el-tag>
      </div>
    </div>

    <el-table v-loading="loading" :data="skills" stripe border style="width: 100%">
      <el-table-column prop="name" label="Name" min-width="160" />

      <el-table-column prop="category" label="Category" width="140">
        <template #default="{ row }">{{ row.category || '-' }}</template>
      </el-table-column>

      <el-table-column prop="author" label="Author" width="100">
        <template #default="{ row }">{{ row.author || '-' }}</template>
      </el-table-column>

      <el-table-column label="Status" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Risk" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="riskType(row.riskLevel)" size="small">{{ row.riskLevel }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Tags" min-width="200">
        <template #default="{ row }">
          <el-tag
            v-for="t in row.tags"
            :key="t.id"
            size="small"
            closable
            :type="t.tagType === 'preset' ? 'warning' : 'info'"
            class="tag-item"
            @close="removeTag(row.name, t.tag)"
          >
            {{ t.tag }}
          </el-tag>
          <el-button type="primary" text size="small" @click="openTagDialog(row)">+ Tag</el-button>
        </template>
      </el-table-column>

      <el-table-column label="Actions" width="140" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="viewDetail(row)">Details</el-button>
          <el-button type="warning" text size="small" @click="openTagDialog(row)">Tags</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailDialogVisible" title="Skill Details" width="750px">
      <div v-if="detailLoading" v-loading="true" style="min-height: 100px" />
      <template v-else-if="detailSkill">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="Name">{{ detailSkill.skill.name }}</el-descriptions-item>
          <el-descriptions-item label="Category">{{ detailSkill.skill.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Author">{{ detailSkill.skill.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Project">{{ detailSkill.skill.project || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Status">
            <el-tag :type="statusType(detailSkill.skill.status)" size="small">{{ detailSkill.skill.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Risk Level">
            <el-tag :type="riskType(detailSkill.skill.riskLevel)" size="small">{{ detailSkill.skill.riskLevel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Usage">{{ detailSkill.skill.usageCount }}</el-descriptions-item>
          <el-descriptions-item label="Last Used">{{ formatDate(detailSkill.skill.lastUsedAt) }}</el-descriptions-item>
          <el-descriptions-item label="Tags" :span="2">
            <el-tag
              v-for="t in detailSkill.skill.tags"
              :key="t.id"
              size="small"
              closable
              :type="t.tagType === 'preset' ? 'warning' : 'info'"
              class="tag-item"
              @close="removeTag(detailSkill.skill.name, t.tag)"
            >
              {{ t.tag }}
            </el-tag>
            <span v-if="!detailSkill.skill.tags.length" style="color: #999">无标签</span>
          </el-descriptions-item>
          <el-descriptions-item label="Path" :span="2">{{ detailSkill.skill.path }}</el-descriptions-item>
          <el-descriptions-item v-if="detailSkill.skill.notes" label="Notes" :span="2">
            {{ detailSkill.skill.notes }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 16px; margin-bottom: 8px">SKILL.md Content</h4>
        <el-input
          type="textarea"
          :model-value="detailSkill.content"
          :autosize="{ minRows: 6, maxRows: 20 }"
          readonly
        />
      </template>
    </el-dialog>

    <!-- Tag Management Dialog -->
    <el-dialog v-model="tagDialogVisible" title="Manage Tags" width="500px">
      <template v-if="tagTargetSkill">
        <p><strong>{{ tagTargetSkill.name }}</strong></p>

        <!-- Current Tags -->
        <div style="margin-bottom: 16px">
          <span style="font-size: 13px; color: #606266; margin-right: 8px">Current:</span>
          <el-tag
            v-for="t in tagTargetSkill.tags"
            :key="t.id"
            closable
            :type="t.tagType === 'preset' ? 'warning' : 'info'"
            class="tag-item"
            @close="removeTag(tagTargetSkill!.name, t.tag)"
          >
            {{ t.tag }}
          </el-tag>
          <span v-if="!tagTargetSkill.tags.length" style="color: #999">None</span>
        </div>

        <!-- Preset Tags Quick Add -->
        <div v-for="(tags, group) in presetTags" :key="group" style="margin-bottom: 12px">
          <span style="font-size: 12px; color: #909399; text-transform: capitalize">{{ group }}:</span>
          <el-button
            v-for="pt in tags"
            :key="pt"
            size="small"
            text
            :disabled="tagTargetSkill.tags.some((t) => t.tag === pt)"
            @click="addPresetTag(pt)"
          >
            + {{ pt }}
          </el-button>
        </div>

        <!-- Custom Tag Input -->
        <el-divider />
        <el-input
          v-model="newTagName"
          placeholder="自定义标签..."
          style="width: 300px; margin-right: 8px"
          @keyup.enter="addTag"
        />
        <el-button type="primary" :disabled="!newTagName.trim()" @click="addTag">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.skills-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header h2 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.tag-item {
  margin-right: 4px;
  margin-bottom: 2px;
}
</style>
