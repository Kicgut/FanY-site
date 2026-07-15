<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'

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

useHead({ title: 'Hermes Skills' })
definePageMeta({ layout: 'default' })

// State
const skills = ref<Skill[]>([])
const loading = ref(false)
const selectedCategory = ref<string>('')
const searchQuery = ref('')
const viewMode = ref<'card' | 'table'>('card')

// Detail view
const detailVisible = ref(false)
const detailSkill = ref<Skill | null>(null)
const detailContent = ref('')
const detailLoading = ref(false)

// Tree data
const treeData = ref<Record<string, Skill[]>>({})
const categories = ref<string[]>([])

// Load
async function loadTree() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: Skill[] }>('/api/skills')
    skills.value = res.data || []
    // Build tree from skills
    const tree: Record<string, Skill[]> = {}
    for (const s of skills.value) {
      const cat = s.category || 'base'
      if (!tree[cat]) tree[cat] = []
      tree[cat].push(s)
    }
    treeData.value = tree
    categories.value = Object.keys(tree).sort()
  } catch {
    // silent
  }
  loading.value = false
}

// Filtered skills
const filteredSkills = computed(() => {
  let list = skills.value
  if (selectedCategory.value) {
    list = list.filter((s) => (s.category || 'base') === selectedCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.author || '').toLowerCase().includes(q) ||
        s.tags.some((t) => t.tag.toLowerCase().includes(q))
    )
  }
  return list
})

// Category counts
const categoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const skill of skills.value) {
    const cat = skill.category || 'base'
    counts[cat] = (counts[cat] || 0) + 1
  }
  return counts
})

// Select category
function selectCategory(cat: string) {
  selectedCategory.value = selectedCategory.value === cat ? '' : cat
}

// View detail
async function viewDetail(skill: Skill) {
  detailLoading.value = true
  detailVisible.value = true
  detailSkill.value = skill
  detailContent.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: { content: string } }>(
      `/api/skills/${encodeURIComponent(skill.name)}`
    )
    detailContent.value = res.data?.content || ''
  } catch {
    detailContent.value = '⚠️ 加载失败'
  }
  detailLoading.value = false
}

// Render markdown
function renderMd(md: string): string {
  const cleaned = md.replace(/^---[\s\S]*?---\n?/, '')
  return marked.parse(cleaned, { breaks: true }) as string
}

// Status / risk helpers
function statusColor(s: string) {
  return { active: '#67c23a', new: '#409eff', experimental: '#e6a23c', deprecated: '#f56c6c' }[s] || '#909399'
}
function riskColor(r: string) {
  return { low: '#67c23a', medium: '#e6a23c', high: '#f56c6c' }[r] || '#909399'
}
function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

onMounted(loadTree)
</script>

<template>
  <div class="skills-public-page">
    <div class="skills-layout">
      <!-- Left: Category Tree -->
      <aside class="skills-sidebar">
        <div class="sidebar-header">
          <h3>📂 分类目录</h3>
        </div>
        <div class="tree-list">
          <div
            class="tree-item"
            :class="{ active: !selectedCategory }"
            @click="selectedCategory = ''"
          >
            <span class="tree-label">全部</span>
            <span class="tree-count">{{ skills.length }}</span>
          </div>
          <div
            v-for="cat in categories"
            :key="cat"
            class="tree-item"
            :class="{ active: selectedCategory === cat }"
            @click="selectCategory(cat)"
          >
            <span class="tree-label">{{ cat === 'base' ? '🏠 基础' : cat }}</span>
            <span class="tree-count">{{ categoryCounts[cat] || 0 }}</span>
          </div>
        </div>
      </aside>

      <!-- Right: Skills List -->
      <main class="skills-main">
        <!-- Toolbar -->
        <div class="skills-toolbar">
          <el-input
            v-model="searchQuery"
            placeholder="搜索 skills..."
            clearable
            style="width: 300px"
          />
          <div class="toolbar-right">
            <el-segmented v-model="viewMode" :options="[
              { label: '卡片', value: 'card' },
              { label: '列表', value: 'table' },
            ]" />
          </div>
        </div>

        <!-- Card View -->
        <div v-if="viewMode === 'card'" v-loading="loading" class="skills-grid">
          <div
            v-for="skill in filteredSkills"
            :key="skill.name"
            class="skill-card"
            @click="viewDetail(skill)"
          >
            <div class="card-header">
              <span class="card-name">{{ skill.name }}</span>
              <el-tag :color="statusColor(skill.status)" size="small" effect="dark" style="border: none">
                {{ skill.status }}
              </el-tag>
            </div>
            <p class="card-desc">{{ skill.description || '暂无描述' }}</p>
            <div class="card-meta">
              <span v-if="skill.author" class="meta-item">👤 {{ skill.author }}</span>
              <span v-if="skill.project" class="meta-item">📁 {{ skill.project }}</span>
              <span class="meta-item" :style="{ color: riskColor(skill.riskLevel) }">
                {{ { low: '🟢', medium: '🟡', high: '🔴' }[skill.riskLevel] || '⚪' }} {{ skill.riskLevel }}
              </span>
            </div>
            <div v-if="skill.tags.length" class="card-tags">
              <el-tag
                v-for="t in skill.tags"
                :key="t.id"
                size="small"
                :type="t.tagType === 'preset' ? 'warning' : 'info'"
                class="tag-item"
              >
                {{ t.tag }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <el-table v-else v-loading="loading" :data="filteredSkills" stripe border>
          <el-table-column prop="name" label="Name" min-width="160" sortable />
          <el-table-column prop="category" label="Category" width="120">
            <template #default="{ row }">{{ row.category || 'base' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />
          <el-table-column prop="author" label="Author" width="90">
            <template #default="{ row }">{{ row.author || '-' }}</template>
          </el-table-column>
          <el-table-column label="Status" width="100" align="center">
            <template #default="{ row }">
              <el-tag :color="statusColor(row.status)" size="small" effect="dark" style="border: none">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Last Used" width="100" align="center">
            <template #default="{ row }">{{ formatDate(row.lastUsedAt) }}</template>
          </el-table-column>
          <el-table-column prop="path" label="Path" min-width="200" show-overflow-tooltip />
          <el-table-column label="Tags" min-width="150">
            <template #default="{ row }">
              <el-tag v-for="t in row.tags" :key="t.id" size="small" class="tag-item" :type="t.tagType === 'preset' ? 'warning' : 'info'">
                {{ t.tag }}
              </el-tag>
              <span v-if="!row.tags.length" style="color: #999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="Action" width="80" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="viewDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </div>

    <!-- Detail Drawer -->
    <el-drawer
      v-model="detailVisible"
      :title="detailSkill?.name || 'Skill Detail'"
      size="70%"
      direction="rtl"
    >
      <div v-if="detailLoading" v-loading="true" style="min-height: 200px" />
      <template v-else-if="detailSkill">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 20px">
          <el-descriptions-item label="Category">{{ detailSkill.category || 'base' }}</el-descriptions-item>
          <el-descriptions-item label="Author">{{ detailSkill.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Project">{{ detailSkill.project || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Status">
            <el-tag :color="statusColor(detailSkill.status)" size="small" effect="dark" style="border: none">
              {{ detailSkill.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Risk">
            <span :style="{ color: riskColor(detailSkill.riskLevel) }">{{ detailSkill.riskLevel }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Usage">{{ detailSkill.usageCount }}</el-descriptions-item>
          <el-descriptions-item label="Last Used">{{ formatDate(detailSkill.lastUsedAt) }}</el-descriptions-item>
          <el-descriptions-item label="Path" :span="2">
            <code style="font-size: 12px; color: #666">{{ detailSkill.path }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="Tags" :span="2">
            <el-tag
              v-for="t in detailSkill.tags"
              :key="t.id"
              size="small"
              :type="t.tagType === 'preset' ? 'warning' : 'info'"
              class="tag-item"
            >
              {{ t.tag }}
            </el-tag>
            <span v-if="!detailSkill.tags.length" style="color: #999">-</span>
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="detailContent" class="detail-markdown" v-html="renderMd(detailContent)" />
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.skills-public-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.skills-layout {
  display: flex;
  gap: 20px;
}

/* Sidebar */
.skills-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.tree-list {
  padding: 8px;
}

.tree-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  color: #606266;
}

.tree-item:hover {
  background: #f5f7fa;
}

.tree-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

.tree-count {
  font-size: 12px;
  background: #f0f2f5;
  border-radius: 10px;
  padding: 2px 8px;
  color: #909399;
}

/* Main */
.skills-main {
  flex: 1;
  min-width: 0;
}

.skills-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

/* Card Grid */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.skill-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.card-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tag-item {
  margin-right: 4px;
}

/* Detail */
.detail-markdown {
  line-height: 1.8;
  color: #303133;
}

.detail-markdown :deep(h1),
.detail-markdown :deep(h2),
.detail-markdown :deep(h3) {
  margin-top: 16px;
  margin-bottom: 8px;
}

.detail-markdown :deep(code) {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.detail-markdown :deep(pre) {
  background: #1e1e2d;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .skills-layout {
    flex-direction: column;
  }
  .skills-sidebar {
    width: 100%;
  }
}
</style>
