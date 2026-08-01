<script setup lang="ts">
import { ref, computed } from 'vue'


const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })
const route = useRoute()
const router = useRouter()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const statusFilter = ref(typeof route.query.status === 'string' ? route.query.status : '')
const currentPage = ref(Number(route.query.page) || 1)
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

watch([search, statusFilter, currentPage], () => {
  const query: Record<string, string> = {}
  if (search.value) query.q = search.value
  if (statusFilter.value) query.status = statusFilter.value
  if (currentPage.value > 1) query.page = String(currentPage.value)
  router.replace({ query })
})

const statusLabel = (status: string) => ({ published: '已公开', draft: '草稿', archived: '已归档' } as Record<string, string>)[status] || status

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
    await ElMessageBox.confirm('删除会永久移除该文章，并写入审计日志。请确认此操作已在本地受信任环境获授权。', '确认删除文章', {
      confirmButtonText: '删除文章',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await authFetch(`/api/articles/${id}`, { method: 'DELETE' })
    ElMessage.success('文章已删除')
    refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除文章失败')
    }
  }
}
</script>

<template>
  <div class="articles-page">
    <div class="page-header"><div><p class="kicker">CONTENT / ARTICLES</p><h1>文章管理</h1><p>管理文章草稿与公开状态；删除为高风险操作，受服务端本地信任校验保护。</p></div>
      <NuxtLink to="/admin/articles/new">
        <el-button type="primary">新建文章</el-button>
      </NuxtLink>
    </div>

    <div class="filters">
      <el-input
        v-model="search"
        placeholder="搜索标题"
        clearable
        style="width: 300px"
      />
      <el-select
        v-model="statusFilter"
        placeholder="全部状态"
        clearable
        style="width: 180px"
      >
        <el-option label="全部状态" value="" />
        <el-option label="草稿" value="draft" />
        <el-option label="已公开" value="published" />
        <el-option label="已归档" value="archived" />
      </el-select>
    </div>

    <div class="table-surface"><el-table
      v-loading="status === 'pending'"
      :data="filteredArticles"
      stripe
      style="width: 100%"
    >
      <el-table-column prop="title" label="文章" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标签" width="180">
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
      <el-table-column label="创建时间" width="120">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <NuxtLink :to="`/admin/articles/${row.id}`">
            <el-button type="primary" text size="small">编辑</el-button>
          </NuxtLink>
          <el-button
            type="danger"
            text
            size="small"
            @click="handleDelete(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table></div>

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
  align-items: flex-start;
  margin-bottom: 20px;
}

.kicker { margin: 0 0 8px; color: #72d9ed; font: 11px var(--font-mono); letter-spacing: .15em; }.page-header h1 { margin: 0; color: #edf8fb; font-size: 27px; }.page-header p:not(.kicker) { margin: 8px 0 0; color: #9eb5c2; font-size: 13px; }

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.table-surface { padding: 6px 12px 12px; border: 1px solid rgba(148,184,214,.2); border-radius: 14px; background: rgba(14,26,42,.72); }

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

@media (max-width: 700px) { .page-header { flex-direction: column; }.filters { flex-wrap: wrap; }.filters :deep(.el-input), .filters :deep(.el-select) { width: 100% !important; }.table-surface { padding: 6px; overflow: auto; }.table-surface :deep(.el-table) { min-width: 680px; }.pagination { justify-content: flex-start; overflow: auto; } }
</style>
