<script setup lang="ts">
const name = 'Your Name'
const tagline = '把复杂的事，做得清楚、稳定、可回看。'
const bio = '这是一个记录工作、实验、照片和想法的个人站点。它既是作品集，也是内容后台和影像归档。'
const skills = ['Vue 3', 'Nuxt 3', 'TypeScript', 'Node.js', 'Docker', 'Photography']

useHead({ title: '首页' })
useSeoMeta({
  title: '个人主页',
  description: bio,
})
</script>

<template>
  <div class="home-page">
    <section class="hero shell">
      <div class="hero-copy">
        <span class="eyebrow">PERSONAL ARCHIVE / 2026</span>
        <h1>
          {{ name }}
          <em>把复杂的事做清楚。</em>
        </h1>
        <p class="tagline">{{ tagline }}</p>
        <div class="hero-actions">
          <NuxtLink to="/portfolio" class="button button-primary">
            查看作品 <span>↗</span>
          </NuxtLink>
          <NuxtLink to="/albums" class="button button-secondary">
            浏览照片
          </NuxtLink>
        </div>
      </div>

      <div class="hero-panel" aria-label="个人简介">
        <div class="panel-top">
          <span>Archive status</span>
          <strong>Online</strong>
        </div>
        <div class="orbital">
          <div class="orbital-ring ring-a" />
          <div class="orbital-ring ring-b" />
          <div class="orbital-core">
            <span>FY</span>
            <small>build · observe · share</small>
          </div>
        </div>
        <div class="panel-stats">
          <div>
            <strong>Content</strong>
            <span>博客 / 作品 / 相册</span>
          </div>
          <div>
            <strong>Focus</strong>
            <span>产品、前端、影像</span>
          </div>
        </div>
      </div>
    </section>

    <section class="intro shell">
      <div class="section-label">ABOUT</div>
      <div>
        <p class="intro-text">{{ bio }}</p>
        <div class="skill-list">
          <span v-for="skill in skills" :key="skill">{{ skill }}</span>
        </div>
      </div>
    </section>

    <section class="routes shell">
      <div class="section-label">EXPLORE</div>
      <div class="route-grid">
        <NuxtLink to="/albums" class="route route-photo">
          <span class="route-kicker">VISUAL NOTES</span>
          <strong>照片</strong>
          <small>按相册浏览的影像记录，支持搜索与筛选。</small>
        </NuxtLink>
        <NuxtLink to="/blog" class="route route-blog">
          <span class="route-kicker">FIELD NOTES</span>
          <strong>博客</strong>
          <small>关于技术、产品和日常思考的文章沉淀。</small>
        </NuxtLink>
        <NuxtLink to="/portfolio" class="route route-work">
          <span class="route-kicker">SELECTED WORK</span>
          <strong>作品</strong>
          <small>项目、实验与内容系统的精选入口。</small>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
}

.shell {
  max-width: var(--max-width);
  margin: 0 auto;
  padding-left: clamp(18px, 4vw, 44px);
  padding-right: clamp(18px, 4vw, 44px);
}

.hero {
  min-height: calc(100vh - 68px);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
  align-items: center;
  gap: 48px;
  padding-top: 60px;
  padding-bottom: 84px;
}

.eyebrow,
.section-label,
.route-kicker {
  font: 11px var(--font-mono);
  letter-spacing: .16em;
  color: var(--color-accent);
}

.hero h1 {
  font-size: clamp(3rem, 7.8vw, 6.8rem);
  line-height: .94;
  letter-spacing: -.07em;
  margin: 18px 0 22px;
  max-width: 12ch;
  text-wrap: balance;
}

.hero h1 em {
  display: block;
  color: var(--color-primary);
  font-style: normal;
}

.tagline {
  max-width: 46ch;
  font-size: 1.08rem;
  line-height: 1.72;
  color: var(--color-text-secondary);
  margin: 0 0 30px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-radius: 999px;
  text-decoration: none;
  font-size: 13px;
  border: 1px solid transparent;
}

.button-primary {
  background: linear-gradient(145deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  box-shadow: var(--shadow-light);
}

.button-secondary {
  background: rgba(255, 255, 255, .74);
  color: var(--color-text);
  border-color: var(--color-border);
}

.hero-panel {
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid rgba(208, 213, 221, .82);
  border-radius: var(--radius-xl);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .94), rgba(238, 242, 248, .96));
  box-shadow: var(--shadow-light);
}

.panel-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font: 12px var(--font-mono);
  color: var(--color-text-secondary);
}

.panel-top strong {
  color: var(--color-primary);
}

.orbital {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(37, 99, 235, .22), transparent 26%),
    radial-gradient(circle at 68% 70%, rgba(15, 118, 110, .16), transparent 25%),
    linear-gradient(145deg, #f8fbff, #e8eef8);
  overflow: hidden;
}

.orbital-ring {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, .34);
}

.ring-b {
  inset: 22% 14%;
}

.orbital-core {
  position: absolute;
  inset: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  box-shadow: 0 18px 40px rgba(16, 24, 40, .12);
}

.orbital-core span {
  font: 700 clamp(2.2rem, 5vw, 4rem) var(--font-mono);
  letter-spacing: -.08em;
}

.orbital-core small {
  margin-top: 8px;
  font: 10px var(--font-mono);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.panel-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.panel-stats > div {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, .72);
  border: 1px solid rgba(208, 213, 221, .68);
}

.panel-stats strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
}

.panel-stats span {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.intro,
.routes {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 36px;
  border-top: 1px solid rgba(208, 213, 221, .82);
  padding-top: 34px;
  padding-bottom: 96px;
}

.intro-text {
  font-size: clamp(1.2rem, 2.5vw, 2rem);
  line-height: 1.35;
  letter-spacing: -.03em;
  max-width: 34ch;
  margin: 0 0 28px;
  text-wrap: pretty;
}

.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-list span {
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, .8);
  color: var(--color-text-secondary);
  font: 11px var(--font-mono);
}

.route-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.route {
  min-height: 220px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--color-text);
  text-decoration: none;
  border: 1px solid rgba(208, 213, 221, .88);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 1px rgba(16, 24, 40, .02);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}

.route:hover {
  transform: translateY(-4px);
  border-color: rgba(37, 99, 235, .38);
  box-shadow: var(--shadow-light);
}

.route strong {
  font-size: clamp(1.7rem, 2.8vw, 2.4rem);
  letter-spacing: -.05em;
}

.route small {
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.route-photo {
  background: linear-gradient(180deg, #f9fbff, #e9f0ff);
}

.route-blog {
  background: linear-gradient(180deg, #f7fbfa, #e7f4f1);
}

.route-work {
  background: linear-gradient(180deg, #fffaf7, #f4ece6);
}

@media (max-width: 840px) {
  .hero {
    min-height: auto;
    grid-template-columns: 1fr;
    padding-top: 48px;
    padding-bottom: 72px;
  }

  .hero h1 {
    max-width: 14ch;
  }

  .hero-panel {
    max-width: 520px;
  }

  .intro,
  .routes {
    grid-template-columns: 1fr;
    gap: 14px;
    padding-bottom: 72px;
  }

  .route-grid {
    grid-template-columns: 1fr;
  }
}
</style>
