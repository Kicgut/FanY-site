<script setup lang="ts">
interface PortfolioItem { id: number; title: string; slug: string; description?: string | null; content?: string | null; coverImage?: string | null; link?: string | null; tags?: string | null; category?: string | null; featured: boolean }
const { data, pending, error } = await useFetch<{ success: boolean; data: PortfolioItem[] }>('/api/portfolio')
const items = computed(() => data.value?.data || [])
const tags = (item: PortfolioItem) => (item.tags || '').split(',').map(v => v.trim()).filter(Boolean)
useHead({ title: '作品集' })
</script>
<template>
  <main class="portfolio-page"><section class="intro"><span class="eyebrow">PORTFOLIO / 创作档案</span><h1>作品集</h1><p>这里不只展示照片，也记录项目、视频、图文笔记和正在发生的创作。</p></section>
    <section class="content"><div v-if="pending" class="loading"><el-skeleton :rows="6" animated /></div><el-alert v-else-if="error" type="error" title="加载失败" description="暂时无法获取作品列表，请稍后再试。" show-icon :closable="false" /><el-empty v-else-if="!items.length" description="还没有发布作品" />
      <div v-else class="grid"><NuxtLink v-for="item in items" :key="item.id" :to="`/portfolio/${item.slug}`" class="card"><div class="cover"><img v-if="item.coverImage" :src="item.coverImage" :alt="item.title" /><div v-else class="cover-fallback">{{ item.category || '作品' }}</div></div><div class="body"><div class="meta"><span>{{ item.category || '项目记录' }}</span><span v-if="item.featured">精选</span></div><h2>{{ item.title }}</h2><p>{{ item.description || '打开查看完整图文内容。' }}</p><div class="tags"><el-tag v-for="tag in tags(item)" :key="tag" size="small" effect="plain">{{ tag }}</el-tag></div></div></NuxtLink></div>
    </section>
  </main>
</template>
<style scoped>
.portfolio-page{min-height:100vh;background:#f8f7f3;color:#20231f}.intro{padding:80px 24px 56px;max-width:1080px;margin:auto}.eyebrow{font-size:12px;letter-spacing:.16em;color:#8a6a43}.intro h1{font-size:clamp(40px,7vw,76px);line-height:1;margin:14px 0 18px}.intro p{max-width:560px;font-size:18px;line-height:1.7;color:#666}.content{max-width:1080px;margin:auto;padding:0 24px 80px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}.card{background:white;border-radius:18px;overflow:hidden;color:inherit;text-decoration:none;box-shadow:0 8px 30px #28251d0d;transition:transform .2s,box-shadow .2s}.card:hover{transform:translateY(-5px);box-shadow:0 14px 36px #28251d18}.cover{height:210px;background:#e8e4dc}.cover img{width:100%;height:100%;object-fit:cover}.cover-fallback{height:100%;display:grid;place-items:center;font-size:28px;color:#897557}.body{padding:20px}.meta{display:flex;justify-content:space-between;color:#99744a;font-size:12px;letter-spacing:.06em}.body h2{margin:10px 0 8px;font-size:22px}.body p{color:#70736d;line-height:1.6;margin:0 0 14px}.tags{display:flex;gap:6px;flex-wrap:wrap}
</style>
