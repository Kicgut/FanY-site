<script setup lang="ts">
const description = '这里记录正在学习的技术、正在完成的项目，以及那些让我愿意慢下来观察的事。'
useHead({ title: '关于我' })
useSeoMeta({ title: '关于我', description })
</script>
<template>
  <main class="about-page shell"><div class="about-heading"><span class="eyebrow">ABOUT / A SHORT NOTE</span><h1>你好，<br><em>很高兴遇见。</em></h1></div><div class="about-body"><p class="lead">{{ description }}</p><p>我是一名全栈开发者，关注 Web 应用、内容系统和那些让复杂流程变得轻盈的工具。业余时间拍照、写字，也会整理自己的数字花园。</p><div class="facts"><div><span>BASE</span><strong>中国</strong></div><div><span>FOCUS</span><strong>Web · Content · Photo</strong></div><div><span>STATUS</span><strong>Open to good ideas</strong></div></div><NuxtLink to="/blog" class="about-link">去读一些笔记 →</NuxtLink></div></main>
</template>
<style scoped>
.shell{max-width:var(--max-width);margin:auto;padding-left:clamp(20px,8vw,110px);padding-right:clamp(20px,8vw,110px)}.about-page{display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,10vw,150px);padding-top:clamp(80px,14vh,150px);padding-bottom:140px}.eyebrow{font:11px var(--font-mono);letter-spacing:.14em;color:var(--color-accent)}h1{font-size:clamp(3.4rem,8vw,7rem);line-height:.92;letter-spacing:-.08em;margin:24px 0}h1 em{font-style:normal;color:var(--color-primary)}.about-body{padding-top:68px;max-width:480px}.about-body p{font-size:1rem;line-height:1.9;color:var(--color-text-secondary);margin:0 0 20px}.about-body .lead{font-size:clamp(1.35rem,3vw,2rem);line-height:1.35;letter-spacing:-.035em;color:var(--color-text)}.facts{display:grid;gap:14px;border-top:1px solid var(--color-border);border-bottom:1px solid var(--color-border);padding:20px 0;margin:34px 0}.facts div{display:flex;justify-content:space-between;gap:20px}.facts span{font:10px var(--font-mono);color:var(--color-accent);letter-spacing:.12em}.facts strong{font-size:13px;font-weight:500}.about-link{display:inline-block;color:var(--color-text);font-size:13px;text-underline-offset:6px}@media(max-width:720px){.about-page{grid-template-columns:1fr;padding-top:70px;padding-bottom:80px}.about-body{padding-top:0}}
</style>
