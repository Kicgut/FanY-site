<script setup lang="ts">
const description = '这里记录正在学习的技术、正在完成的项目，以及那些让我愿意慢下来观察的事。'

useHead({ title: '关于我' })
useSeoMeta({
  title: '关于我 · FAN / Y ARCHIVE',
  description,
})

const focuses = ['将复杂流程变得轻盈', '用图像记录观察', '持续整理数字档案']

const capabilities = [
  { title: '产品与前端', description: '从信息结构到可用的 Web 界面，让想法落在清晰、稳定的体验里。', to: '/portfolio', label: '浏览作品', icon: 'code' },
  { title: '内容与工具', description: '把零散的思考、知识与流程整理成便于长期使用的内容系统。', to: '/blog', label: '阅读文章', icon: 'notes' },
  { title: '影像与档案', description: '用照片留存日常的光线、地点与那些值得被重新看见的时刻。', to: '/albums', label: '查看影像', icon: 'camera' },
]
</script>

<template>
  <main class="about-page">
    <section class="about-hero" aria-labelledby="about-title">
      <div class="hero-background" aria-hidden="true" />
      <div class="hero-overlay" aria-hidden="true" />

      <div class="hero-content about-shell">
        <div class="identity-panel">
          <p class="section-kicker">ABOUT / PERSONAL NOTE</p>
          <h1 id="about-title">你好，<br>很高兴遇见。</h1>
          <p class="identity-role">开发者、数字创作者与长期记录者。</p>
          <div class="identity-copy">
            <p>{{ description }}</p>
            <p>我关注如何让复杂的系统与流程变得更轻盈、高效与可持续。<br>通过代码与图像，记录灵感、观察与思考，沉淀可复用的知识与经验。</p>
          </div>
          <div class="hero-actions">
            <NuxtLink class="primary-action" to="/portfolio">浏览作品 <span aria-hidden="true">↗</span></NuxtLink>
            <NuxtLink class="text-action" to="/blog">阅读文章</NuxtLink>
          </div>
        </div>

        <aside class="profile-card" aria-labelledby="profile-card-title">
          <h2 id="profile-card-title">个人档案</h2>
          <dl class="profile-facts">
            <div><dt>BASE</dt><dd>中国 · Remote</dd></div>
            <div><dt>FOCUS</dt><dd>Web · Content · Image</dd></div>
            <div><dt>CURRENTLY</dt><dd>Building personal archive.</dd></div>
          </dl>
          <div class="focus-list">
            <h3>创作关注</h3>
            <ul>
              <li v-for="focus in focuses" :key="focus">{{ focus }}</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>

    <section class="capabilities about-shell" aria-labelledby="capabilities-title">
      <div class="section-heading">
        <p class="section-kicker">WORKING AREAS</p>
        <h2 id="capabilities-title">能力范围</h2>
      </div>
      <div class="capability-grid">
        <article v-for="item in capabilities" :key="item.title" class="capability-card">
          <div class="capability-icon" aria-hidden="true">
            <svg v-if="item.icon === 'code'" viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" /></svg>
            <svg v-else-if="item.icon === 'notes'" viewBox="0 0 24 24"><path d="M7 4h11v16H7zM4 7v13h11M10 8h5M10 12h5M10 16h3" /></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M4 8h4l1.4-2h5.2L16 8h4v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></svg>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <NuxtLink :to="item.to">{{ item.label }} <span aria-hidden="true">↗</span></NuxtLink>
        </article>
      </div>
    </section>

    <section class="contact-section about-shell" aria-labelledby="contact-title">
      <div>
        <p class="section-kicker">CONTACT</p>
        <h2 id="contact-title">想聊聊？</h2>
        <p>目前以个人项目为主。欢迎从作品、文章或影像开始认识这里。</p>
      </div>
      <NuxtLink class="primary-action contact-action" to="/portfolio">访问作品主页 <span aria-hidden="true">↗</span></NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.about-page { position: relative; overflow: clip; color: #eaf2f5; background: #06121f; }
.about-shell { width: min(100% - 80px, 1420px); margin: 0 auto; }
.about-hero { position: relative; min-height: min(780px, 100svh); isolation: isolate; display: grid; align-items: center; }
.hero-background, .hero-overlay { position: absolute; inset: 0; z-index: -2; }
.hero-background { background: #07121f url('/images/about-background.webp') center bottom / cover no-repeat; }
.hero-overlay { z-index: -1; background: linear-gradient(90deg, rgba(3, 12, 21, .85) 0%, rgba(3, 12, 21, .55) 46%, rgba(3, 12, 21, .18) 100%), linear-gradient(0deg, rgba(3, 11, 19, .94) 0%, rgba(3, 11, 19, 0) 32%, rgba(3, 11, 19, .36) 100%); }
.hero-content { display: grid; grid-template-columns: minmax(0, 1fr) minmax(365px, 460px); align-items: center; gap: clamp(72px, 12vw, 190px); padding: 166px 5.1% 70px; }
.identity-panel { max-width: 630px; }
.section-kicker { margin: 0 0 28px; color: #64d8f5; font: 500 12px var(--font-mono); letter-spacing: .19em; }
h1, h2, h3, p { margin-top: 0; }
h1 { margin-bottom: 25px; color: #f7fbfc; font: 400 clamp(4.25rem, 6vw, 6.75rem) / .98 Georgia, 'Songti SC', 'STSong', serif; letter-spacing: .02em; text-wrap: balance; text-shadow: 0 4px 24px rgba(0, 0, 0, .3); }
.identity-role { margin-bottom: 25px; color: #dbe8ed; font-size: 20px; letter-spacing: .04em; }
.identity-copy { max-width: 650px; color: #bccbd3; font-size: 16px; line-height: 2; letter-spacing: .04em; }
.identity-copy p { margin-bottom: 8px; }
.hero-actions { display: flex; align-items: center; gap: 54px; margin-top: 35px; }
.primary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 57px; padding: 0 39px; border: 1px solid #64d8f5; border-radius: 12px; color: #062032; background: #5bcbed; box-shadow: 0 0 20px rgba(91, 203, 237, .42), inset 0 1px rgba(255,255,255,.5); font-size: 16px; font-weight: 600; letter-spacing: .12em; text-decoration: none; transition: transform .2s ease, background .2s ease, box-shadow .2s ease; }
.primary-action span { margin-left: 16px; font-size: 19px; }
.primary-action:hover { background: #8ae1f6; box-shadow: 0 0 28px rgba(91, 203, 237, .65); transform: translateY(-2px); }
.text-action, .capability-card a { color: #73d9f4; font-size: 15px; text-underline-offset: 9px; text-decoration-color: rgba(115, 217, 244, .58); }
.profile-card { padding: 37px 39px 27px; border: 1px solid rgba(122, 213, 242, .76); border-radius: 17px; background: rgba(8, 25, 39, .62); box-shadow: inset 0 1px rgba(255,255,255,.05), 0 25px 70px rgba(0,0,0,.13); backdrop-filter: blur(16px); }
.profile-card h2, .focus-list h3, .capability-card h3 { color: #f4f8f9; font: 400 23px/1.3 Georgia, 'Songti SC', 'STSong', serif; letter-spacing: .08em; }
.profile-card h2 { margin-bottom: 28px; }
.profile-facts { display: grid; gap: 24px; margin: 0; padding-bottom: 34px; border-bottom: 1px solid rgba(165, 210, 224, .23); }
.profile-facts div { display: grid; grid-template-columns: 112px 1fr; gap: 16px; }
.profile-facts dt { color: #b9cbd4; font: 14px var(--font-mono); letter-spacing: .12em; }
.profile-facts dd { margin: 0; color: #c9d5da; font: 15px var(--font-mono); line-height: 1.45; }
.focus-list { padding-top: 30px; }
.focus-list h3 { margin-bottom: 17px; font-size: 21px; }
.focus-list ul { margin: 0; padding: 0; list-style: none; }
.focus-list li { padding: 13px 0 13px 20px; border-bottom: 1px solid rgba(165, 210, 224, .22); color: #bdcbd2; font-size: 16px; letter-spacing: .04em; }
.focus-list li::before { content: ''; display: inline-block; width: 5px; height: 5px; margin: 0 14px 3px -20px; border-radius: 50%; background: #68d8f4; box-shadow: 0 0 8px #68d8f4; }
.capabilities { padding-top: 70px; padding-bottom: 110px; }
.section-heading { margin-bottom: 28px; }
.section-heading .section-kicker { margin-bottom: 12px; }
.section-heading h2, .contact-section h2 { margin-bottom: 0; color: #f4f8f9; font: 400 34px/1.2 Georgia, 'Songti SC', 'STSong', serif; letter-spacing: .09em; }
.capability-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.capability-card { min-height: 270px; padding: 31px 35px; border: 1px solid rgba(116, 199, 229, .43); border-radius: 16px; background: rgba(9, 27, 41, .66); box-shadow: inset 0 1px rgba(255,255,255,.04); backdrop-filter: blur(12px); }
.capability-icon { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 22px; border: 1px solid rgba(115, 210, 242, .38); border-radius: 8px; color: #a1deef; }
.capability-icon svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.25; }
.capability-card h3 { margin-bottom: 17px; }
.capability-card p { min-height: 52px; margin-bottom: 22px; color: #afc0c9; font-size: 15px; line-height: 1.75; }
.capability-card a span { margin-left: 8px; }
.contact-section { display: flex; justify-content: space-between; align-items: center; gap: 36px; padding: 70px 5.1% 90px; border-top: 1px solid rgba(151, 203, 220, .22); }
.contact-section .section-kicker { margin-bottom: 14px; }
.contact-section h2 { margin-bottom: 15px; }
.contact-section p:not(.section-kicker) { margin: 0; color: #b7c7cf; font-size: 16px; }
.contact-action { flex: 0 0 auto; }
@media (max-width: 960px) { .hero-content { grid-template-columns: 1fr; gap: 48px; padding-top: 150px; } .identity-panel { max-width: 680px; } .profile-card { max-width: 600px; } .capability-grid { gap: 20px; } }
@media (max-width: 760px) { .about-shell { width: min(100% - 40px, 620px); } .about-hero { min-height: auto; } .hero-background { background-position: 63% bottom; } .hero-overlay { background: linear-gradient(180deg, rgba(3, 12, 21, .55), rgba(3, 12, 21, .85) 37%, #06121f 83%); } .hero-content { gap: 36px; padding: calc(116px + env(safe-area-inset-top)) 0 56px; } .section-kicker { margin-bottom: 20px; font-size: 11px; } h1 { font-size: clamp(3.1rem, 15vw, 4.6rem); margin-bottom: 20px; } .identity-role { font-size: 17px; } .identity-copy { font-size: 15px; line-height: 1.85; } .hero-actions { gap: 27px; margin-top: 28px; } .primary-action { min-height: 50px; padding: 0 24px; font-size: 14px; } .profile-card { padding: 28px 23px 18px; } .profile-facts div { grid-template-columns: 1fr; gap: 8px; } .profile-facts { gap: 20px; } .capabilities { padding-top: 30px; padding-bottom: 65px; } .capability-grid { grid-template-columns: 1fr; gap: 16px; } .capability-card { min-height: 0; padding: 27px 25px; } .capability-card p { min-height: 0; } .contact-section { display: block; padding: 52px 0 calc(56px + env(safe-area-inset-bottom)); } .contact-action { width: 100%; margin-top: 27px; } }
@media (prefers-reduced-motion: reduce) { .primary-action { transition: none; } }
</style>
