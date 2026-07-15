<script setup lang="ts">
const { data: posts } = await useAsyncData('blog-archive', () => {
  return queryCollection('blog')
    .order('date', 'DESC')
    .all()
})

// Group posts by year-month
const groupedPosts = computed(() => {
  if (!posts.value) return []
  const groups: Record<string, typeof posts.value> = {}
  for (const post of posts.value) {
    const date = new Date(post.date)
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`
    if (!groups[key]) groups[key] = []
    groups[key].push(post)
  }
  return Object.entries(groups)
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

useHead({ title: '归档' })
useSeoMeta({
  title: '归档',
  description: '所有博客文章按时间归档',
  ogTitle: '归档',
  ogDescription: '所有博客文章按时间归档',
  ogLocale: 'zh_CN',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="page-wrapper">
    <el-row justify="center">
      <el-col :xs="24" :sm="20" :md="18" :lg="16">
        <div class="archive-page">
          <h1 class="archive-title">归档</h1>
          <p class="archive-count" v-if="posts">共 {{ posts.length }} 篇文章</p>

          <template v-if="groupedPosts.length">
            <section
              v-for="([month, items]) in groupedPosts"
              :key="month"
              class="archive-group"
            >
              <h2 class="group-heading">{{ month }}</h2>
              <ul class="archive-list">
                <li
                  v-for="post in items"
                  :key="post.path"
                  class="archive-item"
                >
                  <NuxtLink :to="post.path" class="archive-link">
                    <span class="archive-item-title">{{ post.title }}</span>
                    <span class="archive-item-date">{{ formatDate(post.date) }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </section>
          </template>

          <el-empty v-else description="暂无文章" />
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

.archive-page {
  max-width: 720px;
  margin: 0 auto;
}

.archive-title {
  font-size: 2rem;
  color: var(--color-text);
  margin: 0 0 8px;
  text-align: center;
}

.archive-count {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 0 0 40px;
  font-size: 0.95rem;
}

.archive-group {
  margin-bottom: 36px;
}

.group-heading {
  font-size: 1.25rem;
  color: var(--color-text);
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-primary);
}

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-item {
  margin-bottom: 2px;
}

.archive-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-text);
  transition: background 0.2s, color 0.2s;
}

.archive-link:hover {
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.04));
  color: var(--color-primary);
}

.archive-item-title {
  font-size: 1.05rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-item-date {
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-left: 16px;
}
</style>
