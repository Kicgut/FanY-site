<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const authFetch = useAuthFetch()
const router = useRouter()
const q = ref('')
const type = ref('')
const status = ref('')
const reviewStatus = ref('')
const page = ref(1)
const query = computed(() => ({ page: page.value, pageSize: 20, ...(q.value ? { q: q.value } : {}), ...(type.value ? { type: type.value } : {}), ...(status.value ? { status: status.value } : {}), ...(reviewStatus.value ? { reviewStatus: reviewStatus.value } : {}) }))
const { data, status: loading, error, refresh } = await useAsyncData('admin-portfolio', () => authFetch<any>('/api/admin/portfolio', { query: query.value }), { watch: [query] })
const items = computed(() => data.value?.data?.items || [])
const pagination = computed(() => data.value?.data?.pagination || { total: 0 })
const statusLabel = (value: string) => ({ draft: '草稿', published: '已公开', archived: '已归档' } as Record<string, string>)[value] || value
const reviewLabel = (value: string) => ({ pending: '待配置', submitted: '待审核', reviewing: '审核中', approved: '已批准', rejected: '已拒绝', changes_requested: '需修改' } as Record<string, string>)[value] || value
const typeLabel = (value: string) => ({ project: '项目 / 实验', visual: '视觉 / 影像', tool: '工具 / 仓库' } as Record<string, string>)[value] || value
const statusType = (value: string) => ({ published: 'success', archived: 'warning', draft: 'info' } as Record<string, string>)[value] || 'info'
const reviewType = (value: string) => ({ approved: 'success', rejected: 'danger', changes_requested: 'warning', submitted: 'warning' } as Record<string, string>)[value] || 'info'
function formatDate(value: string) { return value ? new Date(value).toLocaleDateString('zh-CN') : '—' }
async function createDraft() {
  const result = await ElMessageBox.prompt('先填写一个作品标题，之后可在编辑器补充媒体与内容。', '新建作品草稿', { inputPlaceholder: '例如：潮汐信号：生成式影像实验', confirmButtonText: '创建草稿', cancelButtonText: '取消' }).catch(() => null)
  if (!result) return
  try {
    const response: any = await authFetch('/api/admin/portfolio', { method: 'POST', body: { title: result.value, type: 'project' } })
    ElMessage.success('草稿已创建')
    router.push(`/admin/portfolio/${response.data.id}`)
  } catch (e: any) { ElMessage.error(e?.data?.message || '创建草稿失败') }
}
</script>

<template>
  <section class="portfolio-admin">
    <header class="page-header"><div><p class="kicker">CONTENT / PORTFOLIO</p><h1>作品管理</h1><p>创建结构化草稿，完成预览、审核与公开发布；公开作品仍由状态门禁保护。</p></div><el-button type="primary" @click="createDraft">新建作品</el-button></header>
    <div class="filters"><el-input v-model="q" clearable placeholder="搜索标题或 slug" style="width:260px" @clear="page = 1" /><el-select v-model="type" clearable placeholder="全部类型" style="width:150px"><el-option label="项目 / 实验" value="project" /><el-option label="视觉 / 影像" value="visual" /><el-option label="工具 / 仓库" value="tool" /></el-select><el-select v-model="status" clearable placeholder="发布状态" style="width:140px"><el-option label="草稿" value="draft" /><el-option label="已公开" value="published" /><el-option label="已归档" value="archived" /></el-select><el-select v-model="reviewStatus" clearable placeholder="审核状态" style="width:150px"><el-option label="待审核" value="submitted" /><el-option label="已批准" value="approved" /><el-option label="需修改" value="changes_requested" /></el-select></div>
    <el-alert v-if="error" type="error" title="作品管理加载失败" :description="error.message" show-icon :closable="false" />
    <div class="table-surface"><el-table v-loading="loading === 'pending'" :data="items" row-key="id" style="width:100%"><el-table-column label="作品" min-width="260"><template #default="{ row }"><div class="title-cell"><strong>{{ row.title }}</strong><small>{{ row.slug }}</small></div></template></el-table-column><el-table-column label="类型" width="140"><template #default="{ row }"><el-tag size="small" effect="plain">{{ typeLabel(row.type) }}</el-tag></template></el-table-column><el-table-column label="发布" width="100"><template #default="{ row }"><el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column><el-table-column label="审核" width="110"><template #default="{ row }"><el-tag size="small" :type="reviewType(row.reviewStatus)">{{ reviewLabel(row.reviewStatus) }}</el-tag></template></el-table-column><el-table-column label="更新时间" width="125"><template #default="{ row }">{{ formatDate(row.updatedAt) }}</template></el-table-column><el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><NuxtLink :to="`/admin/portfolio/${row.id}`"><el-button text type="primary">编辑</el-button></NuxtLink></template></el-table-column></el-table></div>
    <div class="pagination"><el-pagination v-model:current-page="page" :page-size="20" :total="pagination.total || 0" layout="total, prev, pager, next" /></div>
  </section>
</template>

<style scoped>
.portfolio-admin{max-width:1280px}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:20px}.kicker{margin:0 0 8px;color:#72d9ed;font:11px var(--font-mono);letter-spacing:.15em}.page-header h1{margin:0;color:#eff9fc;font-size:28px}.page-header p:not(.kicker){margin:8px 0 0;color:#9eb5c2;font-size:13px;line-height:1.6}.filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.table-surface{padding:6px 12px 12px;border:1px solid rgba(148,184,214,.2);border-radius:14px;background:rgba(14,26,42,.74)}.title-cell{display:grid;gap:4px}.title-cell strong{color:#e9f8fb;font-weight:600}.title-cell small{color:#7894a4;font:11px var(--font-mono)}.pagination{display:flex;justify-content:flex-end;margin-top:16px}@media(max-width:700px){.page-header{flex-direction:column}.filters>*{width:100%!important}.table-surface{overflow:auto}.table-surface :deep(.el-table){min-width:760px}.pagination{justify-content:flex-start;overflow:auto}}
</style>
