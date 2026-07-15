<script setup lang="ts">
import { ref, computed } from 'vue'


const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

const search = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const queryParams = computed(() => ({
  page: currentPage.value,
  limit: pageSize.value,
  ...(statusFilter.value ? { status: statusFilter.value } : {}),
}))

const { data, status, error, refresh } = await useAsyncData(
  'admin-articles',
  () => authFetch('/api/articles', { query: queryParams.value }),
  { watch: [queryParams] },
)

const articles = computed(() => data.value?.articles ?? [])
const total = computed(() => data.value?.total ?? 0)

const filteredArticles = computed(() => {
  if (!search.value) return articles.value
  const q = search.value.toLowerCase()
  return articles.value.filter((a: any) =>
    a.title.toLowerCase().includes(q),
  )
})

function statusType(status: string) {
  const map: Record<string, string> = {
    published: 'success',
    draft: 'info',
    archived: 'warning',
  }
  return map[status] || 'info'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('Are you sure you want to delete this article?', 'Confirm', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
    await authFetch(`/api/articles/${id}`, { method: 'DELETE' })
    ElMessage.success('Article deleted')
    refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('Failed to delete article')
    }
  }
}
</script>

<template>
  <div class="articles-page">
    <div class="page-header">
      <h2>Articles</h2>
      <NuxtLink to="/admin/articles/new">
        <el-button type="primary">New Article</el-button>
      </NuxtLink>
    </div>

    <div class="filters">
      <el-input
        v-model="search"
        placeholder="Search by title..."
        clearable
        style="width: 300px"
      />
      <el-select
        v-model="statusFilter"
        placeholder="All statuses"
        clearable
        style="width: 180px"
      >
        <el-option label="All" value="" />
        <el-option label="Draft" value="draft" />
        <el-option label="Published" value="published" />
        <el-option label="Archived" value="archived" />
      </el-select>
    </div>

    <el-table
      v-loading="status === 'pending'"
      :data="filteredArticles"
      stripe
      style="width: 100%"
    >
      <el-table-column prop="title" label="Title" min-width="200" show-overflow-tooltip />
      <el-table-column label="Status" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Tags" width="180">
        <template #default="{ row }">
          <el-tag
            v-for="tag in row.tags"
            :key="tag.id"
            size="small"
            class="tag-item"
          >
            {{ tag.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Date" width="120">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="160" fixed="right">
        <template #default="{ row }">
          <NuxtLink :to="`/admin/articles/${row.id}`">
            <el-button type="primary" text size="small">Edit</el-button>
          </NuxtLink>
          <el-button
            type="danger"
            text
            size="small"
            @click="handleDelete(row.id)"
          >
            Delete
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="error" class="error-msg">
      <el-alert :title="error.message" type="error" show-icon />
    </div>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
      />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.tag-item {
  margin-right: 4px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.error-msg {
  margin-top: 16px;
}
</style>
