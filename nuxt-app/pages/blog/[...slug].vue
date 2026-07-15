<script setup lang="ts">
import MarkdownIt from 'markdown-it'

const route = useRoute()
const slug = route.params.slug as string

const { data: post, status } = await useFetch(`/api/articles/slug/${slug}`)

// SEO meta tags
useHead({
  title: () => post.value?.title ?? '博客文章',
})

useSeoMeta({
  title: () => post.value?.title,
  description: () => post.value?.description,
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.description,
  ogType: 'article',
  ogLocale: 'zh_CN',
  twitterCard: 'summary_large_image',
})

// Markdown renderer
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

// Render markdown content
const renderedContent = computed(() => {
  if (!post.value?.content) return ''
  return md.render(post.value.content)
})

// Reading time estimate: ~200 Chinese chars per minute
const readingTime = computed(() => {
  if (!post.value?.content) return null
  const text = post.value.content
  const charCount = text.replace(/\s/g, '').length
  const minutes = Math.max(1, Math.ceil(charCount / 200))
  return minutes
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="page-wrapper">
    <el-row justify="center">
      <el-col :xs="24" :sm="20" :md="18" :lg="16">
        <!-- Loading -->
        <div v-if="status === 'pending'" class="loading-state">
          <el-skeleton :rows="10" animated />
        </div>

        <template v-else-if="post">
          <article class="post-detail">
            <header class="post-header">
              <h1 class="post-title">{{ post.title }}</h1>
              <p class="post-meta">
                <span class="post-date">{{ formatDate(post.publishedAt || post.createdAt) }}</span>
                <span v-if="readingTime" class="post-reading-time">
                  · 约 {{ readingTime }} 分钟阅读
                </span>
              </p>
              <div v-if="post.tags?.length" class="post-tags">
                <el-tag
                  v-for="tag in post.tags"
                  :key="tag.id"
                  size="small"
                  type="info"
                  class="tag-item"
                >
                  {{ tag.name }}
                </el-tag>
              </div>
            </header>

            <div class="prose" v-html="renderedContent" />

            <div class="post-footer">
              <NuxtLink to="/blog" class="back-link">
                ← 返回博客列表
              </NuxtLink>
            </div>
          </article>
        </template>

        <el-empty v-else description="文章不存在 (404)" />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 80vh;
  padding: var(--section-padding) 20px;
}

.post-detail {
  max-width: 800px;
  margin: 0 auto;
}

.post-header {
  margin-bottom: 40px;
  text-align: center;
}

.post-title {
  font-size: 2.2rem;
  margin: 0 0 12px;
  color: var(--color-text);
  line-height: 1.3;
}

.post-meta {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}

.post-reading-time {
  color: var(--color-text-secondary);
}

.post-tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  border-radius: 12px;
}

/* Prose styles for markdown content */
.prose :deep(h2) {
  font-size: 1.6rem;
  margin: 2em 0 0.8em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.prose :deep(h3) {
  font-size: 1.3rem;
  margin: 1.6em 0 0.6em;
  color: var(--color-text);
}

.prose :deep(h4) {
  font-size: 1.1rem;
  margin: 1.4em 0 0.5em;
  color: var(--color-text);
}

.prose :deep(p) {
  font-size: 1.05rem;
  line-height: 1.8;
  color: var(--color-text);
  margin: 0 0 1.2em;
}

.prose :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.prose :deep(a:hover) {
  border-bottom-color: var(--color-primary);
}

.prose :deep(code) {
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: #c7254e;
}

.prose :deep(pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 20px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  line-height: 1.6;
  font-size: 0.9rem;
}

.prose :deep(pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;
  font-size: inherit;
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: 1.5em;
  margin: 0 0 1.2em;
  line-height: 1.8;
}

.prose :deep(li) {
  margin-bottom: 0.4em;
  font-size: 1.05rem;
  color: var(--color-text);
}

.prose :deep(blockquote) {
  margin: 1.5em 0;
  padding: 12px 20px;
  border-left: 4px solid var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 0 8px 8px 0;
  color: var(--color-text-secondary);
}

.prose :deep(blockquote p) {
  margin: 0;
}

.prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 2em 0;
}

.prose :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}

.prose :deep(th),
.prose :deep(td) {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
}

.prose :deep(th) {
  background: var(--color-bg-secondary);
  font-weight: 600;
}

/* Post footer */
.post-footer {
  margin-top: 60px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.back-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 1rem;
  transition: opacity 0.2s;
}

.back-link:hover {
  opacity: 0.7;
}

/* Loading */
.loading-state {
  padding: 20px;
}
</style>
