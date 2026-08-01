<script setup lang="ts">
interface Article {
  id: number
  slug: string
  title: string
  description?: string | null
  createdAt: string
  publishedAt?: string | null
  tags?: { id: number; name: string }[]
}

interface PortfolioItem {
  id: number
  slug: string
  title: string
  description?: string | null
  cover?: { url?: string | null } | null
  labels?: string[]
  type?: string
  featured: boolean
}

interface Album {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  photoCount: number
  previewPhotos?: { id: number; thumbnailUrl?: string | null }[]
  createdAt: string
}

const { data: articleResponse } = await useFetch<{ articles: Article[] }>('/api/articles', {
  query: { status: 'published', limit: 1 },
})
const { data: portfolioResponse } = await useFetch<{ success: boolean; data: { items: PortfolioItem[] } }>('/api/portfolio')
const { data: albumResponse } = await useFetch<{ success: boolean; data: Album[] }>('/api/albums/public')

const latestArticle = computed(() => articleResponse.value?.articles?.[0] || null)
const featuredWork = computed(() => portfolioResponse.value?.data?.items?.find(item => item.featured) || portfolioResponse.value?.data?.items?.[0] || null)
const latestAlbum = computed(() => albumResponse.value?.data?.[0] || null)
const companionPaused = ref(false)
const homeAssets = {
  hero: '/images/home/hero-moonland.webp',
  earth: '/images/home/earth-orb.webp',
}
const catRunFrames = Array.from({ length: 5 }, (_, index) => `/images/home/cat-run/frame-${String(index + 1).padStart(2, '0')}.png`)
const catIdleFrames = Array.from({ length: 4 }, (_, index) => `/images/home/cat-idle/frame-${String(index + 1).padStart(2, '0')}.png`)
const catFrame = ref(0)
const catImage = computed(() => companionPaused.value
  ? catIdleFrames[3]
  : catRunFrames[catFrame.value % catRunFrames.length])
let catTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  catTimer = setInterval(() => { catFrame.value += 1 }, 120)
})

onUnmounted(() => {
  if (catTimer) clearInterval(catTimer)
})

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' / ')
  : '最近更新'

const workTags = (item?: PortfolioItem | null) => (item?.labels || []).slice(0, 3)

useHead({ title: '首页' })
useSeoMeta({
  title: 'FAN / Y — 个人数字档案',
  description: '在代码、创作与影像之间，记录灵感，构建想象。',
})
</script>

<template>
  <div class="home-page">
    <section class="hero-scene">
      <div class="hero-atmosphere" :style="{ '--hero-image': `url(${homeAssets.hero})` }" aria-hidden="true" />
      <div class="hero-moon" aria-hidden="true" />
      <div class="hero-stars" aria-hidden="true" />
      <div class="hero-horizon" aria-hidden="true" />

      <div class="home-shell hero-content">
        <div class="hero-copy">
          <p class="hero-kicker">DEVELOPER &amp; DIGITAL ARTIST</p>
          <h1>Code, Create,<br>Capture the Unknown<span>.</span></h1>
          <p class="hero-description">在代码与像素之间，记录灵感，构建想象。<br>这里是我的数字世界档案馆。</p>
          <div class="hero-actions">
            <NuxtLink to="/portfolio" class="hero-button hero-button-primary">探索作品 <span>→</span></NuxtLink>
            <NuxtLink to="/blog" class="hero-button hero-button-secondary">阅读文章 <span>···</span></NuxtLink>
          </div>
        </div>

        <div class="companion" aria-label="蔚蓝地球陪伴组件">
          <div class="companion-orbit" aria-hidden="true">
            <span class="orbit-cat" :class="{ paused: companionPaused }" aria-hidden="true"><img :src="catImage" alt="" /></span>
          </div>
          <span class="earth-equator earth-equator-back" aria-hidden="true" />
          <div class="earth" aria-hidden="true"><img :src="homeAssets.earth" alt="" /></div>
          <span class="earth-equator earth-equator-front" aria-hidden="true" />
          <div class="companion-caption"><span>ORBITAL COMPANION</span><button type="button" :aria-label="companionPaused ? '播放陪伴动画' : '暂停陪伴动画'" @click="companionPaused = !companionPaused">{{ companionPaused ? '▶' : 'Ⅱ' }}</button></div>
        </div>
      </div>

      <div class="home-shell content-dock">
        <section class="content-panel article-panel">
          <div class="panel-heading"><span>LATEST WRITING</span><NuxtLink to="/blog">更多 <b>→</b></NuxtLink></div>
          <NuxtLink v-if="latestArticle" :to="`/blog/${latestArticle.slug}`" class="article-feature">
            <div class="article-thumb"><span>✦</span></div>
            <div class="panel-copy"><h2>{{ latestArticle.title }}</h2><p>{{ latestArticle.description || '从思考、知识沉淀到输出迭代，分享正在发生的创作与思考。' }}</p><div class="panel-meta"><time>{{ formatDate(latestArticle.publishedAt || latestArticle.createdAt) }}</time><span v-for="tag in latestArticle.tags?.slice(0, 2)" :key="tag.id">{{ tag.name }}</span></div></div>
          </NuxtLink>
          <NuxtLink v-else to="/blog" class="empty-panel">还没有公开文章，去博客看看 →</NuxtLink>
        </section>

        <section class="content-panel work-panel">
          <div class="panel-heading"><span>SELECTED PROJECTS</span><NuxtLink to="/portfolio">更多 <b>→</b></NuxtLink></div>
          <NuxtLink v-if="featuredWork" :to="`/portfolio/${featuredWork.slug}`" class="work-feature">
            <div class="work-thumb"><img v-if="featuredWork.cover?.url" :src="featuredWork.cover.url" :alt="featuredWork.title" loading="lazy"><span v-else>◌</span></div>
            <div class="panel-copy"><h2>{{ featuredWork.title }}</h2><p>{{ featuredWork.description || '项目、实验与内容系统的精选记录。' }}</p><div class="panel-meta"><span v-for="tag in workTags(featuredWork)" :key="tag">{{ tag }}</span><span v-if="featuredWork.type">{{ featuredWork.type }}</span></div></div>
          </NuxtLink>
          <NuxtLink v-else to="/portfolio" class="empty-panel">作品正在整理中，去作品集看看 →</NuxtLink>
        </section>

        <section class="content-panel visual-panel">
          <div class="panel-heading"><span>VISUAL LOG</span><NuxtLink to="/albums">更多 <b>→</b></NuxtLink></div>
          <NuxtLink v-if="latestAlbum" :to="`/albums/${latestAlbum.id}`" class="visual-feature">
            <div class="visual-grid"><img v-for="photo in latestAlbum.previewPhotos?.slice(0, 3)" :key="photo.id" :src="photo.thumbnailUrl || latestAlbum.coverUrl || ''" :alt="latestAlbum.name" loading="lazy"><div v-if="!latestAlbum.previewPhotos?.length && latestAlbum.coverUrl" class="visual-fallback"><img :src="latestAlbum.coverUrl" :alt="latestAlbum.name"></div></div>
            <div class="visual-footer"><span>{{ latestAlbum.name }} · {{ latestAlbum.photoCount }} 张</span><span>进入影像日志　→</span></div>
          </NuxtLink>
          <NuxtLink v-else to="/albums" class="empty-panel">还没有公开影像，去相册看看 →</NuxtLink>
        </section>
      </div>
    </section>

    <section class="home-intro home-shell">
      <p class="home-kicker">A LIVING ARCHIVE</p>
      <h2>把做过的事留下，<br>让下一次出发有迹可循。</h2>
      <NuxtLink to="/about" class="text-link">了解更多关于我 <span>↗</span></NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.home-page { min-height: 100vh; background: #07121f; color: #e6edf5; }
.home-shell { width: min(1440px, calc(100% - 80px)); margin: 0 auto; }
.hero-scene { position: relative; min-height: 900px; padding-bottom: 70px; overflow: hidden; isolation: isolate; background: #07121f; }
.hero-atmosphere { position: absolute; inset: 0; z-index: -5; background: linear-gradient(180deg, rgba(4, 14, 24, .05) 0%, rgba(5, 15, 25, .08) 44%, rgba(4, 12, 21, .42) 100%), var(--hero-image) center center / cover no-repeat; }
.hero-atmosphere::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5, 16, 27, .18), transparent 54%, rgba(4, 15, 27, .16)); }
.hero-moon { display: none; }
.hero-stars { position: absolute; z-index: -3; inset: 0; opacity: .55; background-image: radial-gradient(circle at 74% 28%, #8edcff 0 1px, transparent 1.5px), radial-gradient(circle at 91% 17%, #4fbbe3 0 1px, transparent 1.5px), radial-gradient(circle at 80% 36%, #8edcff 0 2px, transparent 2.5px), radial-gradient(circle at 66% 19%, #4fbbe3 0 1px, transparent 1.5px); }
.hero-horizon { position: absolute; z-index: -2; left: 0; right: 0; bottom: 230px; height: 80px; background: radial-gradient(ellipse at 60% 80%, rgba(245, 198, 112, .75), transparent 6%, rgba(177, 205, 212, .15) 18%, transparent 52%); filter: blur(3px); }
.hero-horizon::after { content: ''; position: absolute; left: 0; right: 0; bottom: -240px; height: 260px; background: linear-gradient(180deg, rgba(8, 20, 30, .25), #050d17 70%), repeating-linear-gradient(164deg, transparent 0 27px, rgba(133, 165, 177, .08) 28px, transparent 30px); }
.hero-content { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; align-items: center; min-height: 680px; padding-top: 100px; }
.hero-copy { padding-left: clamp(16px, 4vw, 58px); max-width: 720px; }
.hero-kicker, .home-kicker, .panel-heading > span { color: #55c9ef; font: 11px var(--font-mono); letter-spacing: .2em; }
.hero-kicker { margin: 0 0 22px; }
.hero-copy h1 { margin: 0; max-width: none; color: #e7edf3; font-size: clamp(2.6rem, 4.6vw, 4.5rem); font-weight: 350; line-height: .99; letter-spacing: -.07em; white-space: nowrap; }
.hero-copy h1 span { color: #53c6ec; }
.hero-description { margin: 28px 0 30px; color: #aab9c5; font-size: clamp(1rem, 1.7vw, 1.18rem); line-height: 1.9; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 20px; }
.hero-button { display: inline-flex; align-items: center; justify-content: space-between; gap: 30px; min-width: 174px; padding: 15px 18px; border: 1px solid rgba(178, 208, 223, .55); border-radius: 10px; color: #e9f4fb; text-decoration: none; font-size: 14px; transition: transform .25s ease, border-color .25s ease, background .25s ease; }
.hero-button:hover { transform: translateY(-3px); border-color: #69d2f2; }
.hero-button-primary { color: #062033; background: rgba(72, 193, 229, .88); border-color: rgba(146, 230, 250, .78); box-shadow: 0 7px 28px rgba(48, 188, 232, .26); }
.hero-button-secondary { background: rgba(113, 133, 146, .18); border-color: rgba(190, 207, 217, .48); backdrop-filter: blur(14px); }
.companion { position: relative; justify-self: end; width: min(330px, 50vw); height: 370px; margin-top: -12px; margin-right: -16px; }
.companion-orbit { position: absolute; width: 220px; height: 220px; left: 170px; top: 5px; pointer-events: none; }
.earth { position: absolute; z-index: 1; left: 185px; top: 20px; width: 190px; height: 190px; overflow: visible; border-radius: 50%; filter: drop-shadow(-18px 14px 24px rgba(0, 0, 0, .5)) drop-shadow(0 0 12px rgba(104, 215, 247, .7)); }
.earth img { display: block; width: 100%; height: 100%; object-fit: contain; }
.earth-equator { position: absolute; left: 170px; top: 80px; width: 220px; height: 70px; border: 1px solid rgba(92, 207, 244, .9); border-radius: 50%; transform: rotate(-18deg); filter: drop-shadow(0 0 7px rgba(70, 199, 242, .68)); pointer-events: none; }
.earth-equator-back { z-index: 0; clip-path: inset(0 0 50% 0); }
.earth-equator-front { z-index: 2; clip-path: inset(50% 0 0 0); }
.orbit-cat { position: absolute; z-index: 3; left: 86px; top: 4px; width: 48px; height: 32px; animation: cat-orbit 8s linear infinite; transform-origin: 24px 106px; }
.orbit-cat.paused { animation-play-state: paused; }
.orbit-cat img { display: block; width: 100%; height: 100%; object-fit: contain; transform: scaleX(-1); }
.companion-caption { position: absolute; left: 25px; right: 6px; bottom: 58px; display: flex; align-items: center; justify-content: space-between; color: #aebdca; font: 11px var(--font-mono); letter-spacing: .16em; }
.companion-caption button { width: 24px; height: 24px; padding: 0; border: 1px solid #92a9b8; border-radius: 50%; color: #c4d4dc; background: transparent; cursor: pointer; }
.solitary-figure { position: absolute; z-index: 1; left: calc(50% - 7px); bottom: 228px; width: 13px; height: 55px; border-radius: 45% 45% 10% 10%; background: #07111a; box-shadow: 0 0 10px rgba(121, 178, 193, .15); }.solitary-figure::before { content: ''; position: absolute; top: -10px; left: 2px; width: 9px; height: 12px; border-radius: 50%; background: #07111a; }
.content-dock { position: relative; z-index: 4; display: grid; grid-template-columns: 1.04fr 1fr 1.04fr; gap: 20px; transform: translateY(42px); }
.content-panel { min-width: 0; min-height: 230px; padding: 24px 28px 22px; border: 1px solid rgba(205, 214, 218, .38); border-radius: 20px; background: rgba(76, 88, 95, .42); box-shadow: 0 22px 45px rgba(0, 0, 0, .24), inset 0 1px rgba(238, 244, 246, .12); backdrop-filter: blur(18px) saturate(.72); }
.panel-heading { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 20px; }.panel-heading a { color: #9eb1be; text-decoration: none; font: 12px var(--font-mono); }.panel-heading b { color: #d6e4eb; font-size: 18px; font-weight: 400; }
.article-feature, .work-feature { display: grid; grid-template-columns: 135px minmax(0, 1fr); gap: 20px; color: inherit; text-decoration: none; }.article-thumb, .work-thumb { height: 130px; border: 1px solid rgba(173, 204, 219, .38); border-radius: 8px; overflow: hidden; background: radial-gradient(circle, rgba(100, 219, 247, .55), transparent 4%), linear-gradient(145deg, #263e54, #0b1928); display: grid; place-items: center; }.article-thumb span, .work-thumb span { font-size: 40px; color: #96e4f9; }.work-thumb img { width: 100%; height: 100%; object-fit: cover; }.panel-copy h2 { margin: 3px 0 9px; color: #e3eaf0; font-size: 16px; font-weight: 500; line-height: 1.35; text-wrap: balance; }.panel-copy p { display: -webkit-box; margin: 0; overflow: hidden; color: #9eafba; font-size: 12px; line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }.panel-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 15px; color: #9eafba; font: 11px var(--font-mono); }.panel-meta span { padding: 4px 8px; border: 1px solid rgba(165, 195, 210, .4); border-radius: 5px; }.empty-panel { display: block; padding: 35px 0; color: #a5b7c3; text-decoration: none; font-size: 14px; }.visual-feature { display: block; color: inherit; text-decoration: none; }.visual-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 10px; height: 126px; }.visual-grid img, .visual-fallback img { width: 100%; height: 100%; display: block; object-fit: cover; border: 1px solid rgba(173, 204, 219, .38); border-radius: 7px; }.visual-grid img:first-child { grid-row: span 1; }.visual-fallback { grid-column: 1 / -1; }.visual-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 15px; color: #a9bbc5; font: 11px var(--font-mono); }.visual-footer span:last-child { color: #d2dee5; }
.home-intro { padding: 150px 0 180px; }.home-intro h2 { margin: 20px 0 28px; color: #dce8ee; font-size: clamp(2.4rem, 5vw, 5rem); font-weight: 350; line-height: 1.06; letter-spacing: -.06em; }.text-link { color: #65caea; font-size: 14px; text-decoration: none; }.text-link span { margin-left: 8px; }
@media (max-width: 1100px) { .home-shell { width: min(100% - 40px, 900px); }.hero-scene { min-height: 1000px; }.content-dock { grid-template-columns: 1fr; }.content-panel { min-height: 0; }.hero-content { min-height: 680px; }.solitary-figure { display: none; } }
@media (max-width: 680px) { .home-shell { width: min(100% - 32px, 560px); }.hero-scene { min-height: 0; padding-bottom: 84px; }.hero-content { display: block; min-height: 0; padding: 125px 0 190px; }.hero-copy { padding: 0; }.hero-copy h1 { font-size: clamp(2.8rem, 14vw, 5rem); white-space: normal; }.hero-description { font-size: .95rem; }.companion { width: 300px; height: 300px; margin: 36px auto -38px; transform: scale(.85); transform-origin: top center; }.earth { left: 90px; }.companion-orbit { left: 18px; }.hero-moon { width: 125vw; left: -37vw; top: -14%; }.hero-horizon { bottom: 180px; }.content-dock { gap: 12px; transform: translateY(28px); }.content-panel { padding: 20px; border-radius: 16px; }.article-feature, .work-feature { grid-template-columns: 100px minmax(0, 1fr); gap: 14px; }.article-thumb, .work-thumb { height: 108px; }.panel-copy p { -webkit-line-clamp: 2; }.visual-grid { height: 100px; }.home-intro { padding: 100px 0 130px; } }
@media (prefers-reduced-motion: reduce) { .hero-button { transition: none; } }

@keyframes cat-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 680px) {
  .companion-orbit { left: 80px; }
  .earth-equator { left: 80px; }
}
</style>
