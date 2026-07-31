<script setup lang="ts">
import MarkdownIt from 'markdown-it'

const route = useRoute()
const slug = route.params.slug as string
const { data: post, status } = await useFetch(`/api/articles/slug/${slug}`)
const readingProgress = ref(0)
const copied = ref(false)
const tocOpen = ref(false)

useHead({ title: () => post.value?.title ? `${post.value.title} · FAN / Y` : '博客阅读' })
useSeoMeta({ title: () => post.value?.title, description: () => post.value?.description, ogType: 'article', ogLocale: 'zh_CN' })

const formatDate = (dateStr: string) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(dateStr)).replace(/\//g, ' / ')
const readingTime = computed(() => Math.max(1, Math.ceil((post.value?.content?.replace(/\s/g, '').length || 200) / 200)))
const headingSlug = (title: string, index: number) => {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return ascii || `section-${index + 1}`
}
const toc = computed(() => {
  const content = post.value?.content || ''
  let index = 0
  return [...content.matchAll(/^(##|###)\s+(.+)$/gm)].map((match) => ({ level: match[1].length, title: match[2].replace(/[*_`]/g, '').trim(), id: headingSlug(match[2], index++) }))
})

const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true })
md.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index]
  const language = token.info?.trim().split(/\s+/)[0] || 'code'
  const code = md.utils.escapeHtml(token.content)
  return `<div class="code-block"><div class="code-bar"><span>${language}</span><button type="button" data-copy-code="${encodeURIComponent(token.content)}" aria-label="复制${language}代码">复制</button></div><pre><code>${code}</code></pre></div>`
}
const renderedContent = computed(() => {
  if (!post.value?.content) return ''
  let headingIndex = 0
  return md.render(post.value.content).replace(/<(h[23])>(.*?)<\/\1>/g, (_full, tag, text) => {
    const plain = String(text).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    return `<${tag} id="${headingSlug(plain, headingIndex)}">${text}</${tag}>` + (headingIndex++, '')
  })
})

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  readingProgress.value = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0
}
function scrollToHeading(id: string) { tocOpen.value = false; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
async function copyCode(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-code]')
  if (!button) return
  await navigator.clipboard.writeText(decodeURIComponent(button.dataset.copyCode || ''))
  button.textContent = '已复制'
  copied.value = true
  window.setTimeout(() => { button.textContent = '复制'; copied.value = false }, 1400)
}
async function copyPageLink() {
  await navigator.clipboard?.writeText(window.location.href)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1400)
}

onMounted(() => { window.addEventListener('scroll', updateProgress, { passive: true }); updateProgress() })
onBeforeUnmount(() => window.removeEventListener('scroll', updateProgress))
</script>

<template>
  <div class="reading-page">
    <div class="reading-stars" aria-hidden="true" />
    <div class="reading-orb" aria-hidden="true"><img src="/images/home/earth-orb.webp" alt="" /></div>
    <a class="skip-link" href="#article-content">跳到正文</a>
    <div v-if="status === 'pending'" class="reading-skeleton">正在载入文章…</div>
    <template v-else-if="post">
      <aside class="reading-tools" aria-label="阅读工具">
        <NuxtLink to="/blog" class="back-link">← 返回博客列表</NuxtLink>
        <div class="progress-copy"><span>阅读进度</span><b>{{ readingProgress }}%</b></div>
        <div class="progress-rail"><span :style="{ height: `${readingProgress}%` }" /></div>
        <button class="copy-link" type="button" @click="copyPageLink">⌘ <span>复制链接</span></button>
        <span class="copy-live" aria-live="polite">{{ copied ? '已复制' : '' }}</span>
      </aside>
      <main id="article-content" class="article-column" tabindex="-1">
        <div class="breadcrumb"><NuxtLink to="/blog">博客</NuxtLink><span>/</span><span>{{ post.tags?.[0]?.name || '技术笔记' }}</span></div>
        <header class="article-header">
          <span class="post-type">{{ post.tags?.[0]?.name?.toUpperCase() || 'TECHNICAL NOTE' }}</span>
          <h1>{{ post.title }}</h1>
          <p v-if="post.description" class="article-summary">{{ post.description }}</p>
          <div class="article-meta"><span>{{ formatDate(post.publishedAt || post.createdAt) }}</span><i>·</i><span>{{ readingTime }} 分钟阅读</span></div>
          <div class="article-tags"><span v-for="tag in post.tags" :key="tag.id || tag.name">{{ tag.name }}</span></div>
        </header>
        <div class="mobile-toc"><button type="button" :aria-expanded="tocOpen" @click="tocOpen = !tocOpen">本文目录 <span>{{ tocOpen ? '收起' : '展开' }}</span></button><nav v-if="tocOpen"><button v-for="item in toc" :key="item.id" type="button" @click="scrollToHeading(item.id)">{{ item.title }}</button></nav></div>
        <div class="prose" v-html="renderedContent" @click="copyCode" />
        <footer class="article-end"><span>本文结束 · 感谢阅读</span><NuxtLink to="/blog">返回博客列表 →</NuxtLink></footer>
      </main>
      <aside class="toc-panel" aria-label="本文目录"><h2>本文目录</h2><span class="toc-label">ON THIS PAGE</span><div class="toc-rule" /><nav><button v-for="item in toc" :key="item.id" type="button" :class="{ 'toc-sub': item.level === 3 }" :title="item.title" @click="scrollToHeading(item.id)">{{ item.title }}</button></nav></aside>
    </template>
    <div v-else class="not-found"><strong>文章不存在或尚未发布</strong><span>请返回博客列表，浏览其他内容。</span><NuxtLink to="/blog">返回博客列表</NuxtLink></div>
  </div>
</template>

<style scoped>
.reading-page { position: relative; min-height: calc(100vh - 100px); overflow: hidden; isolation: isolate; background: radial-gradient(circle at 72% 9%, rgba(48, 136, 176, .12), transparent 19%), linear-gradient(180deg, #071827 0%, #061322 100%); color: #dfecef; }.reading-stars { position: absolute; z-index: -1; inset: 0; opacity: .52; background-image: radial-gradient(circle at 66% 14%, #66d7ff 0 1px, transparent 1.5px), radial-gradient(circle at 88% 38%, #55b8dd 0 1px, transparent 1.5px), radial-gradient(circle at 28% 48%, #447d9a 0 1px, transparent 1.5px); background-size: 350px 320px, 520px 480px, 700px 600px; }.reading-orb { position: absolute; z-index: -1; top: 58px; right: 24%; width: 50px; filter: drop-shadow(0 0 10px rgba(71, 202, 244, .72)); }.reading-orb img { width: 100%; }.skip-link { position: fixed; z-index: 300; top: 10px; left: 10px; padding: 10px 14px; transform: translateY(-150%); border-radius: 6px; color: #061322; background: #61d8ff; }.skip-link:focus { transform: translateY(0); }.reading-page:has(.article-column) { display: grid; grid-template-columns: 160px minmax(0, 700px) 220px; justify-content: center; gap: 54px; width: min(1240px, calc(100% - 150px)); margin: 0 auto; padding: 65px 0 80px; }.reading-tools { position: sticky; top: 126px; align-self: start; height: 600px; padding-top: 24px; border-right: 1px solid rgba(158, 195, 210, .28); }.back-link { display: block; margin-bottom: 46px; color: #d2e2e7; text-decoration: none; font-size: 12px; }.back-link:hover { color: #63d7ff; }.progress-copy { display: grid; gap: 10px; color: #899eaa; font-size: 12px; }.progress-copy b { color: #61d8ff; font: 14px var(--font-mono); }.progress-rail { position: relative; width: 3px; height: 250px; margin: 12px 0 30px 14px; border-radius: 3px; background: rgba(151, 193, 210, .2); overflow: hidden; }.progress-rail span { position: absolute; inset: auto 0 0; border-radius: inherit; background: #5bd6fa; box-shadow: 0 0 9px #49cbee; transition: height .2s ease; }.copy-link { display: flex; align-items: center; gap: 8px; border: 0; color: #93a9b5; background: transparent; cursor: pointer; font-size: 12px; }.copy-link:hover { color: #63d7ff; }.copy-live { display: block; min-height: 15px; margin-top: 5px; color: #62d8ff; font-size: 11px; }.article-column { min-width: 0; outline: 0; }.breadcrumb { display: flex; gap: 13px; margin-bottom: 32px; color: #a7bac2; font-size: 13px; }.breadcrumb a { color: inherit; text-decoration: none; }.breadcrumb a:hover { color: #63d7ff; }.article-header { padding-bottom: 20px; border-bottom: 1px solid rgba(157, 193, 207, .24); }.article-header h1 { margin: 0 0 17px; color: #eef5f6; font-size: clamp(36px, 4vw, 53px); font-weight: 500; line-height: 1.18; letter-spacing: -.045em; text-wrap: balance; }.article-summary { max-width: 650px; margin: 0 0 24px; color: #98adb7; font-size: 15px; line-height: 1.8; }.article-meta { display: flex; gap: 10px; color: #91a6b1; font: 12px var(--font-mono); }.article-meta i { color: #527788; font-style: normal; }.article-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }.article-tags span { padding: 5px 11px; border: 1px solid rgba(156, 194, 208, .32); border-radius: 6px; color: #a9bec6; font-size: 11px; }.prose { padding-top: 8px; color: #aebec5; font-size: 15px; line-height: 1.9; }.prose :deep(h2),.prose :deep(h3) { scroll-margin-top: 120px; color: #edf3f4; font-weight: 500; text-wrap: balance; }.prose :deep(h2) { margin: 39px 0 13px; font-size: 25px; line-height: 1.35; }.prose :deep(h3) { margin: 28px 0 10px; font-size: 19px; }.prose :deep(p) { max-width: 68ch; margin: 0 0 18px; }.prose :deep(a) { color: #5fd4f5; text-underline-offset: 4px; }.prose :deep(ul),.prose :deep(ol) { padding-left: 1.4em; }.prose :deep(li) { margin: 5px 0; }.prose :deep(blockquote) { margin: 22px 0; padding: 12px 16px; border: 1px solid rgba(153, 196, 211, .2); border-left: 2px solid #4bc8ec; border-radius: 8px; color: #a9bac2; background: rgba(30, 58, 77, .46); }.prose :deep(code) { padding: 2px 6px; border: 1px solid rgba(137, 184, 203, .18); border-radius: 4px; color: #b9e9f6; background: rgba(11, 32, 48, .86); font: .88em var(--font-mono); }.prose :deep(.code-block) { margin: 20px 0; overflow: hidden; border: 1px solid rgba(142, 186, 203, .35); border-radius: 9px; background: rgba(8, 23, 36, .9); }.prose :deep(.code-bar) { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(142, 186, 203, .22); color: #8faab6; font: 11px var(--font-mono); }.prose :deep(.code-bar button) { border: 0; color: #aec4cb; background: transparent; cursor: pointer; }.prose :deep(.code-bar button:hover) { color: #5fd4f5; }.prose :deep(pre) { margin: 0; padding: 14px; overflow-x: auto; color: #bde5eb; font: 12px/1.7 var(--font-mono); }.prose :deep(pre code) { padding: 0; border: 0; color: inherit; background: transparent; }.prose :deep(img) { display: block; width: 100%; height: auto; margin: 24px 0 8px; border: 1px solid rgba(153, 195, 210, .25); border-radius: 10px; }.prose :deep(table) { display: block; width: 100%; margin: 20px 0; overflow-x: auto; border-collapse: collapse; }.prose :deep(th),.prose :deep(td) { min-width: 120px; padding: 9px 12px; border: 1px solid rgba(143, 184, 200, .24); text-align: left; }.prose :deep(th) { color: #dcebee; background: rgba(34, 65, 82, .56); }.article-end { display: flex; justify-content: space-between; gap: 15px; margin-top: 48px; padding-top: 20px; border-top: 1px solid rgba(157, 193, 207, .24); color: #7f98a4; font-size: 12px; }.article-end a { color: #b8d8e1; text-decoration: none; }.article-end a:hover { color: #5fd4f5; }.toc-panel { position: sticky; top: 150px; align-self: start; margin-top: 90px; padding: 23px 20px; border: 1px solid rgba(151, 191, 207, .33); border-radius: 14px; background: rgba(21, 45, 62, .55); box-shadow: inset 0 1px rgba(224, 244, 250, .06); }.toc-panel h2 { margin: 0 0 5px; color: #e0ebee; font-size: 17px; font-weight: 500; }.toc-label { color: #849ca7; font: 10px var(--font-mono); letter-spacing: .14em; }.toc-rule { height: 1px; margin: 18px 0 13px; background: rgba(156, 193, 207, .2); }.toc-panel nav { display: grid; gap: 3px; }.toc-panel button,.mobile-toc button { display: block; width: 100%; padding: 7px 0; border: 0; color: #a8bbc2; background: transparent; text-align: left; cursor: pointer; font: inherit; font-size: 12px; line-height: 1.4; }.toc-panel button:hover,.toc-panel button:focus-visible,.mobile-toc button:hover { color: #62d8ff; }.toc-panel .toc-sub { padding-left: 10px; color: #8199a5; }.mobile-toc { display: none; }.reading-skeleton,.not-found { width: min(700px, calc(100% - 32px)); margin: 100px auto; color: #9cb0ba; }.not-found { display: grid; gap: 12px; text-align: center; }.not-found strong { color: #edf4f5; font-size: 22px; }.not-found a { color: #62d8ff; text-decoration: none; }
@media (max-width: 1050px) { .reading-page:has(.article-column) { grid-template-columns: 120px minmax(0, 680px); width: min(820px, calc(100% - 64px)); gap: 34px; }.toc-panel { display: none; } }
@media (max-width: 700px) { .reading-page:has(.article-column) { display: block; width: 100%; padding: 34px 16px 60px; }.reading-tools { position: fixed; z-index: 20; top: auto; right: 0; bottom: 0; left: 0; display: flex; align-items: center; gap: 14px; width: auto; height: 3px; padding: 0; border: 0; background: rgba(125, 173, 193, .2); }.reading-tools .back-link,.reading-tools .progress-copy,.reading-tools .progress-rail,.reading-tools .copy-link,.reading-tools .copy-live { display: none; }.reading-tools .progress-rail { display: block; width: 100%; height: 3px; margin: 0; }.breadcrumb { margin-bottom: 25px; }.article-header h1 { font-size: clamp(32px, 10vw, 44px); }.article-summary { font-size: 14px; }.prose { font-size: 15px; line-height: 1.85; }.prose :deep(h2) { font-size: 23px; }.mobile-toc { display: block; margin-top: 18px; border: 1px solid rgba(151, 191, 207, .28); border-radius: 8px; background: rgba(21, 45, 62, .48); }.mobile-toc > button { display: flex; justify-content: space-between; padding: 12px 14px; color: #d6e6ea; }.mobile-toc > button span { color: #62d8ff; font-size: 11px; }.mobile-toc nav { display: grid; gap: 0; padding: 4px 14px 10px; border-top: 1px solid rgba(151, 191, 207, .2); }.article-end { flex-direction: column; }.reading-orb { top: 32px; right: 8%; width: 42px; } }
@media (prefers-reduced-motion: reduce) { .progress-rail span { transition: none; } }
</style>
