<script setup lang="ts">
const { data: articlesData, status } = await useFetch('/api/articles', {
  query: { status: 'published', limit: 100 },
})

const articles = computed(() => articlesData.value?.articles || [])
const searchText = ref('')
const activeTag = ref<string | null>(null)
const selectedYear = ref('全部')
const sortOrder = ref('newest')
const pageSize = 9
const currentPage = ref(1)

useHead({ title: '博客 · FAN / Y ARCHIVE' })
useSeoMeta({ title: '博客 · FAN / Y ARCHIVE', description: '关于技术、产品、视觉与思考的记录与分享。' })

const dateOf = (post: any) => new Date(post.publishedAt || post.createdAt)
const formatDate = (dateStr: string) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(dateStr)).replace(/\//g, ' / ')
const readingTime = (post: any) => Math.max(1, Math.ceil((post.content?.replace(/\s/g, '').length || (post.description?.length ?? 80)) / 200))
const allTags = computed(() => [...new Set(articles.value.flatMap((post: any) => post.tags?.map((tag: any) => tag.name) || []))].sort())
const years = computed(() => [...new Set(articles.value.map((post: any) => String(dateOf(post).getFullYear())))].sort().reverse())

const filteredPosts = computed(() => articles.value
  .filter((post: any) => {
    const query = searchText.value.trim().toLowerCase()
    const searchable = `${post.title} ${post.description || ''} ${post.tags?.map((tag: any) => tag.name).join(' ') || ''}`.toLowerCase()
    return (!query || searchable.includes(query))
      && (!activeTag.value || post.tags?.some((tag: any) => tag.name === activeTag.value))
      && (selectedYear.value === '全部' || String(dateOf(post).getFullYear()) === selectedYear.value)
  })
  .sort((a: any, b: any) => sortOrder.value === 'newest' ? dateOf(b).getTime() - dateOf(a).getTime() : dateOf(a).getTime() - dateOf(b).getTime()))
const featuredPost = computed(() => filteredPosts.value[0])
const gridPosts = computed(() => filteredPosts.value.slice(1))
const totalPages = computed(() => Math.max(1, Math.ceil(gridPosts.value.length / pageSize)))
const paginatedPosts = computed(() => gridPosts.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const clearFilters = () => { searchText.value = ''; activeTag.value = null; selectedYear.value = '全部'; currentPage.value = 1 }
const selectTag = (tag: string) => { activeTag.value = activeTag.value === tag ? null : tag; currentPage.value = 1 }
</script>

<template>
  <div class="blog-page">
    <div class="blog-stars" aria-hidden="true" />
    <div class="blog-orb" aria-hidden="true"><img src="/images/home/earth-orb.webp" alt="" /></div>
    <div class="blog-layout">
      <main class="blog-main">
        <header class="archive-header">
          <p class="archive-kicker">BLOG ARCHIVE</p>
          <h1>博客</h1>
          <p>关于技术、产品、视觉与思考的记录与分享。</p>
          <span class="archive-count"><b>{{ filteredPosts.length }}</b> 篇已发布</span>
        </header>

        <div v-if="status === 'pending'" class="archive-loading" aria-label="正在加载博客">正在载入内容…</div>
        <template v-else-if="featuredPost">
          <NuxtLink :to="`/blog/${featuredPost.slug}`" class="featured-post">
            <div>
              <span class="post-type">TECHNICAL NOTE</span>
              <h2>{{ featuredPost.title }}</h2>
              <p v-if="featuredPost.description">{{ featuredPost.description }}</p>
              <div class="post-meta"><span>{{ formatDate(featuredPost.publishedAt || featuredPost.createdAt) }}</span><i>·</i><span>{{ readingTime(featuredPost) }} 分钟阅读</span></div>
              <div class="post-tags"><span v-for="tag in featuredPost.tags?.slice(0, 3)" :key="tag.id || tag.name">{{ tag.name }}</span></div>
            </div>
            <span class="post-arrow" aria-hidden="true">→</span>
          </NuxtLink>

          <div class="archive-grid">
            <NuxtLink v-for="(post, index) in paginatedPosts" :key="post.id" :to="`/blog/${post.slug}`" class="post-card">
              <span class="card-index">{{ String((currentPage - 1) * pageSize + index + 1).padStart(2, '0') }}</span>
              <span class="post-type">{{ post.tags?.[0]?.name?.toUpperCase() || 'FIELD NOTE' }}</span>
              <h2>{{ post.title }}</h2>
              <p v-if="post.description">{{ post.description }}</p>
              <div class="post-meta"><span>{{ formatDate(post.publishedAt || post.createdAt) }}</span><i>·</i><span>{{ readingTime(post) }} 分钟阅读</span></div>
              <div class="post-bottom"><div class="post-tags"><span v-for="tag in post.tags?.slice(0, 2)" :key="tag.id || tag.name">{{ tag.name }}</span></div><span class="post-arrow" aria-hidden="true">→</span></div>
            </NuxtLink>
          </div>
        </template>
        <div v-else class="empty-state"><strong>没有找到匹配的博客</strong><span>尝试清除筛选或换一个关键词。</span><button type="button" @click="clearFilters">清除筛选</button></div>
        <div v-if="totalPages > 1" class="pagination"><button v-for="page in totalPages" :key="page" type="button" :class="{ active: currentPage === page }" @click="currentPage = page">{{ page }}</button></div>
      </main>

      <aside class="filter-panel" aria-label="筛选博客">
        <div class="filter-heading"><h2>筛选博客</h2><button v-if="searchText || activeTag || selectedYear !== '全部'" type="button" @click="clearFilters">清除</button></div>
        <label class="filter-label" for="blog-search">搜索关键词</label>
        <div class="search-field"><span aria-hidden="true">⌕</span><input id="blog-search" v-model="searchText" type="search" placeholder="搜索标题、内容或标签…" @input="currentPage = 1" /></div>
        <fieldset><legend>分类</legend><div class="filter-options"><button type="button" :class="{ selected: !activeTag }" @click="activeTag = null">全部</button><button v-for="tag in allTags.slice(0, 7)" :key="tag" type="button" :class="{ selected: activeTag === tag }" @click="selectTag(tag)">{{ tag }}</button></div></fieldset>
        <label class="filter-label" for="blog-year">年份</label><select id="blog-year" v-model="selectedYear" @change="currentPage = 1"><option>全部</option><option v-for="year in years" :key="year">{{ year }}</option></select>
        <label class="filter-label" for="blog-sort">排序方式</label><select id="blog-sort" v-model="sortOrder" @change="currentPage = 1"><option value="newest">最新发布</option><option value="oldest">最早发布</option></select>
        <p class="filter-result">找到 <b>{{ filteredPosts.length }}</b> 篇博客</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.blog-page { position: relative; min-height: calc(100vh - 100px); overflow: hidden; isolation: isolate; background: radial-gradient(circle at 80% 15%, rgba(42, 131, 173, .14), transparent 20%), linear-gradient(180deg, #071827 0%, #061322 58%, #071a2b 100%); color: #e7f0f4; }
.blog-page::after { content: ''; position: absolute; z-index: -2; inset: 0; background: radial-gradient(ellipse at 100% -10%, rgba(188, 220, 236, .22), transparent 25%), linear-gradient(105deg, transparent 55%, rgba(58, 159, 201, .08) 70%, transparent 71%); pointer-events: none; }
.blog-stars { position: absolute; z-index: -1; inset: 0; opacity: .55; background-image: radial-gradient(circle at 22% 13%, #67d8ff 0 1px, transparent 1.5px), radial-gradient(circle at 62% 12%, #8be2ff 0 1px, transparent 1.5px), radial-gradient(circle at 76% 34%, #5dbada 0 1px, transparent 1.5px), radial-gradient(circle at 94% 64%, #67d8ff 0 1px, transparent 1.5px), radial-gradient(circle at 38% 62%, #397e9b 0 1px, transparent 1.5px); background-size: 310px 240px, 420px 380px, 560px 500px, 380px 420px, 680px 620px; }
.blog-orb { position: absolute; z-index: -1; top: 42px; right: 4%; width: 92px; opacity: .75; filter: drop-shadow(0 0 14px rgba(69, 205, 246, .68)); }
.blog-orb img { display: block; width: 100%; }
.blog-layout { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; width: min(1440px, calc(100% - 96px)); margin: 0 auto; padding: 60px 0 72px; }
.archive-header { margin: 0 0 26px 6px; }.archive-kicker,.post-type { margin: 0 0 12px; color: #59c9ef; font: 11px var(--font-mono); letter-spacing: .17em; }.archive-header h1 { margin: 0; font-size: clamp(42px, 4.2vw, 62px); letter-spacing: -.06em; line-height: 1; }.archive-header p:not(.archive-kicker) { margin: 14px 0 8px; color: #96a9b5; font-size: 15px; }.archive-count { color: #8ea3af; font-size: 13px; }.archive-count b { color: #62d8ff; font: 16px var(--font-mono); }
.featured-post,.post-card,.filter-panel { border: 1px solid rgba(159, 194, 209, .3); background: linear-gradient(145deg, rgba(23, 48, 67, .76), rgba(10, 28, 45, .72)); box-shadow: inset 0 1px rgba(225, 245, 251, .06), 0 16px 36px rgba(0, 0, 0, .12); backdrop-filter: blur(14px); }.featured-post,.post-card { position: relative; display: block; color: inherit; text-decoration: none; transition: transform .25s ease, border-color .25s ease, background .25s ease; }.featured-post:hover,.post-card:hover { transform: translateY(-3px); border-color: rgba(83, 207, 245, .72); background: linear-gradient(145deg, rgba(27, 58, 78, .88), rgba(12, 35, 54, .84)); }.featured-post { display: flex; justify-content: space-between; gap: 30px; min-height: 160px; padding: 25px 30px 23px; border-radius: 13px; }.featured-post h2 { margin: 0 0 8px; font-size: clamp(22px, 2vw, 28px); font-weight: 500; letter-spacing: .01em; }.featured-post p { max-width: 680px; margin: 0 0 14px; color: #9eb0bb; font-size: 13px; line-height: 1.55; }.post-meta { display: flex; flex-wrap: wrap; gap: 9px; color: #8fa5b1; font: 11px var(--font-mono); }.post-meta i { color: #4d7080; font-style: normal; }.post-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }.post-tags span { padding: 5px 10px; border: 1px solid rgba(153, 191, 207, .31); border-radius: 5px; color: #9eb5c0; font-size: 11px; }.post-arrow { align-self: center; color: #b9cbd2; font-size: 27px; transition: transform .25s ease, color .25s ease; }.featured-post:hover .post-arrow,.post-card:hover .post-arrow { color: #62d8ff; transform: translateX(5px); }
.archive-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }.post-card { min-height: 148px; padding: 17px 22px 16px; border-radius: 10px; }.post-card .card-index { position: absolute; top: 14px; right: 17px; color: #8398a4; font: 12px var(--font-mono); }.post-card .post-type { margin-bottom: 14px; font-size: 10px; }.post-card h2 { max-width: calc(100% - 25px); margin: 0 0 4px; font-size: 16px; font-weight: 500; line-height: 1.35; }.post-card p { display: -webkit-box; margin: 0 0 10px; overflow: hidden; color: #9cafba; font-size: 12px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }.post-card .post-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }.post-card .post-tags { margin-top: 10px; }.post-card .post-tags span { padding: 4px 8px; font-size: 10px; }.post-card .post-arrow { font-size: 22px; }
.filter-panel { align-self: start; margin-top: 167px; padding: 24px; border-radius: 13px; }.filter-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.filter-heading h2 { margin: 0 0 24px; font-size: 19px; font-weight: 500; }.filter-heading button,.empty-state button { border: 0; color: #62d8ff; background: transparent; cursor: pointer; font-size: 12px; }.filter-label, fieldset legend { display: block; margin: 0 0 9px; color: #94a8b4; font-size: 12px; }.search-field, select { width: 100%; min-height: 40px; border: 1px solid rgba(147, 185, 202, .28); border-radius: 9px; color: #dce9ed; background: rgba(33, 61, 79, .42); }.search-field { display: flex; align-items: center; gap: 8px; padding: 0 11px; }.search-field span { color: #b6ced7; font-size: 20px; }.search-field input, select { border: 0; outline: 0; color: inherit; background: transparent; font-size: 12px; }.search-field input { flex: 1; min-width: 0; }.search-field input::placeholder { color: #77909e; }fieldset { margin: 25px 0; padding: 0; border: 0; }.filter-options { display: flex; flex-wrap: wrap; gap: 9px; }.filter-options button { padding: 8px 13px; border: 1px solid rgba(147, 185, 202, .28); border-radius: 8px; color: #b0c1c9; background: rgba(33, 61, 79, .34); cursor: pointer; font-size: 12px; }.filter-options button:hover,.filter-options button.selected { border-color: #52c8ee; color: #e5f6fb; background: rgba(29, 126, 163, .28); box-shadow: 0 0 0 1px rgba(82, 200, 238, .12); }select { display: block; margin-bottom: 22px; padding: 0 12px; }.filter-result { margin: 36px 0 0; color: #98acb7; font-size: 13px; }.filter-result b { color: #62d8ff; font: 18px var(--font-mono); }.pagination { display: flex; justify-content: center; gap: 8px; margin-top: 25px; }.pagination button { width: 34px; height: 34px; border: 1px solid rgba(147, 185, 202, .28); border-radius: 7px; color: #a8bac2; background: transparent; cursor: pointer; }.pagination button.active,.pagination button:hover { border-color: #59c9ef; color: #061322; background: #59c9ef; }.empty-state { display: grid; gap: 10px; padding: 60px 20px; border: 1px dashed rgba(159, 194, 209, .3); text-align: center; color: #9fb0b8; }.empty-state strong { color: #e7f0f4; }.archive-loading { padding: 50px 0; color: #8ea8b4; }
@media (max-width: 1050px) { .blog-layout { width: min(100% - 48px, 900px); grid-template-columns: 1fr; }.filter-panel { order: -1; margin-top: 0; }.filter-heading h2 { margin-bottom: 0; }.filter-panel { display: grid; grid-template-columns: 1fr 1.5fr; gap: 12px 18px; align-items: center; }.filter-heading { grid-column: 1 / -1; }.filter-heading h2 { grid-column: 1 / -1; }.filter-panel fieldset { margin: 0; }.filter-result { margin: 8px 0 0; } }
@media (max-width: 680px) { .blog-layout { width: calc(100% - 32px); padding-top: 43px; }.blog-orb { top: 20px; right: -12px; width: 70px; }.archive-header { margin-left: 0; }.archive-header h1 { font-size: 46px; }.featured-post { min-height: 0; padding: 20px; }.featured-post .post-arrow { display: none; }.archive-grid { grid-template-columns: 1fr; }.filter-panel { display: block; padding: 18px; }.filter-heading { margin-bottom: 22px; }.filter-heading h2 { margin: 0; }fieldset { margin: 21px 0; }.filter-result { margin-top: 30px; }.site-shell.is-blog .site-footer { margin-top: 0; } }
</style>

<style scoped>
.blog-layout { padding-top: 124px; }

@media (max-width: 680px) {
  .blog-layout { padding-top: 96px; }
}
</style>
