<script setup lang="ts">
const { data: articlesData, status } = await useFetch('/api/articles', {
  query: { status: 'published', limit: 100 },
})

const articles = computed(() => articlesData.value?.articles || [])

useHead({
  title: '博客',
})

useSeoMeta({
  title: '技术博客',
  description: '分享技术心得与生活感悟',
  ogTitle: '技术博客',
  ogDescription: '分享技术心得与生活感悟',
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const pageSize = 4
const currentPage = ref(1)
const activeTag = ref<string | null>(null)

const allTags = computed(() => {
  if (!articles.value) return []
  const tagSet = new Set<string>()
  for (const post of articles.value) {
    for (const tag of post.tags?.map((t: any) => t.name) ?? []) {
      tagSet.add(tag)
    }
  }
  return Array.from(tagSet).sort()
})

const filteredPosts = computed(() => {
  if (!articles.value) return []
  if (!activeTag.value) return articles.value
  return articles.value.filter((p: any) =>
    p.tags?.some((t: any) => t.name === activeTag.value)
  )
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredPosts.value.length / pageSize))
})

const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredPosts.value.slice(start, start + pageSize)
})

const handleTagClick = (tag: string) => {
  if (activeTag.value === tag) {
    activeTag.value = null
  } else {
    activeTag.value = tag
  }
  currentPage.value = 1
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const clearFilter = () => {
  activeTag.value = null
  currentPage.value = 1
}
</script>

<template>
  <div class="page-wrapper">
    <el-row justify="center">
      <el-col :xs="24" :sm="20" :md="18" :lg="16">
        <h1 class="page-title">博客</h1>
        <p class="page-desc">分享技术心得与生活感悟</p>

        <!-- Tags filter -->
        <div v-if="allTags.length" class="tags-filter">
          <el-tag
            v-for="tag in allTags"
            :key="tag"
            :type="activeTag === tag ? '' : 'info'"
            :effect="activeTag === tag ? 'dark' : 'plain'"
            class="tag-item"
            @click="handleTagClick(tag)"
          >
            {{ tag }}
          </el-tag>
          <el-button
            v-if="activeTag"
            type="primary"
            link
            size="small"
            @click="clearFilter"
          >
            清除筛选
          </el-button>
        </div>

        <!-- Loading -->
        <div v-if="status === 'pending'" class="loading-state">
          <el-skeleton :rows="3" animated />
        </div>

        <!-- Articles list -->
        <div v-else-if="paginatedPosts?.length" class="posts-list">
          <article
            v-for="post in paginatedPosts"
            :key="post.id"
            class="post-card"
          >
            <NuxtLink :to="`/blog/${post.slug}`" class="post-link">
              <h2 class="post-title">{{ post.title }}</h2>
              <p v-if="post.description" class="post-excerpt">
                {{ post.description }}
              </p>
              <div class="post-meta">
                <span class="post-date">{{ formatDate(post.publishedAt || post.createdAt) }}</span>
                <div v-if="post.tags?.length" class="post-tags">
                  <el-tag
                    v-for="tag in post.tags"
                    :key="tag.id"
                    size="small"
                    type="info"
                    class="tag-badge"
                  >
                    {{ tag.name }}
                  </el-tag>
                </div>
              </div>
            </NuxtLink>
          </article>
        </div>

        <!-- Empty state -->
        <el-empty v-else description="暂无文章" />

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="filteredPosts.length"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 80vh;
  padding: var(--section-padding) 20px;
}

.page-title {
  font-size: 2.2rem;
  text-align: center;
  margin: 0 0 8px;
  color: var(--color-text);
}

.page-desc {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 1.05rem;
  margin: 0 0 32px;
}

/* Tags filter */
.tags-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}

.tag-item {
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.2s;
}

.tag-item:hover {
  transform: translateY(-1px);
}

/* Post list */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--color-primary);
}

.post-link {
  display: block;
  padding: 24px;
  text-decoration: none;
  color: inherit;
}

.post-title {
  font-size: 1.4rem;
  margin: 0 0 8px;
  color: var(--color-text);
  line-height: 1.4;
}

.post-excerpt {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.post-date {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.post-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-badge {
  border-radius: 10px;
  font-size: 0.75rem;
}

/* Loading */
.loading-state {
  padding: 20px;
}

/* Pagination */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
</style>
