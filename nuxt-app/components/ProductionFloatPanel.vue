<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const route = useRoute()
const mounted = ref(false)
const expanded = ref(false)
const diagnosticsOpen = ref(false)
const latency = ref<number | null>(null)
const isAdmin = ref(false)
let latencyTimer: ReturnType<typeof setTimeout> | undefined

const isProduction = import.meta.env.PROD
const routeLabel = computed(() => route.fullPath || '/')
const latencyLabel = computed(() => latency.value === null ? '--' : `${latency.value} ms`)

function measureLatency() {
  if (typeof performance === 'undefined') return
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (!navigation) return
  const measured = navigation.responseStart - navigation.requestStart
  latency.value = Math.max(0, Math.round(Number.isFinite(measured) ? measured : navigation.duration))
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function refreshPage() {
  window.location.reload()
}

function toggleDiagnostics() {
  diagnosticsOpen.value = !diagnosticsOpen.value
  expanded.value = true
}

async function copyRoute() {
  try {
    await navigator.clipboard?.writeText(routeLabel.value)
  } catch {
    // Clipboard access is optional and may be unavailable on non-secure origins.
  }
}

onMounted(() => {
  mounted.value = true
  measureLatency()
  latencyTimer = setTimeout(measureLatency, 1200)
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    isAdmin.value = user?.role === 'admin' || user?.role === 'superadmin'
  } catch {
    isAdmin.value = false
  }
})

onUnmounted(() => {
  if (latencyTimer) clearTimeout(latencyTimer)
})
</script>

<template>
  <div
    v-if="isProduction && mounted"
    class="production-float-panel"
    :class="{ expanded, 'diagnostics-open': diagnosticsOpen }"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
  >
    <div v-if="expanded" class="production-float-panel__actions" aria-label="页面工具">
      <button type="button" title="返回顶部" aria-label="返回顶部" @click="scrollToTop">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16V4m0 0L5.5 8.5M10 4l4.5 4.5" /></svg>
      </button>
      <button type="button" title="刷新页面数据" aria-label="刷新页面数据" @click="refreshPage">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 8a6.2 6.2 0 1 0 .1 4M16 4v4h-4" /></svg>
      </button>
      <template v-if="isAdmin">
        <span class="production-float-panel__action-separator" />
        <button type="button" title="显示诊断信息" aria-label="显示诊断信息" :aria-pressed="diagnosticsOpen" @click="toggleDiagnostics">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.2" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" /></svg>
        </button>
        <button type="button" title="复制当前路由" aria-label="复制当前路由" @click="copyRoute">
          <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.5" y="6.5" width="9" height="9" rx="1.5" /><path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" /></svg>
        </button>
      </template>
    </div>

    <div v-if="diagnosticsOpen && isAdmin" class="production-float-panel__diagnostics">
      <span>ROUTE <b>{{ routeLabel }}</b></span>
      <span>VIEWPORT <b>{{ `${window.innerWidth} × ${window.innerHeight}` }}</b></span>
      <span>MODE <b>PRODUCTION</b></span>
    </div>

    <div class="production-float-panel__bar" :class="{ 'is-active': expanded }">
      <span class="production-float-panel__brand" aria-hidden="true">
        <svg viewBox="0 0 24 18"><path d="M2 15 8.2 3.2l3 5.8L15.1 2 22 15h-4.2l-2.8-5.3-3.8 5.3H2Z" /><path d="m8.2 3.2 3 5.8-2.5 2.7" /></svg>
      </span>
      <span class="production-float-panel__separator" />
      <span class="production-float-panel__latency" title="当前页面响应延时">
        <strong>{{ latencyLabel }}</strong>
      </span>
      <span class="production-float-panel__separator" />
      <button
        class="production-float-panel__inspect"
        type="button"
        :title="isAdmin ? '打开诊断信息' : '展开页面工具'"
        :aria-label="isAdmin ? '打开诊断信息' : '展开页面工具'"
        :aria-expanded="expanded"
        @click="isAdmin ? toggleDiagnostics() : expanded = !expanded"
      >
        <svg v-if="isAdmin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.2" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" /></svg>
        <span v-else class="production-float-panel__dots" aria-hidden="true"><i /><i /><i /></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.production-float-panel { position: fixed; z-index: 1000; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); color: #d8e4e8; font-family: var(--font-family); }
.production-float-panel__bar, .production-float-panel__actions, .production-float-panel__diagnostics { border: 1px solid rgba(154, 174, 181, .22); background: rgba(8, 16, 21, .91); box-shadow: 0 10px 28px rgba(0, 0, 0, .28), inset 0 1px rgba(255, 255, 255, .06); backdrop-filter: blur(18px) saturate(.8); }
.production-float-panel__bar { display: flex; align-items: center; height: 34px; min-width: 178px; padding: 0 9px; border-radius: 18px; transition: border-color .16s ease, background .16s ease, box-shadow .16s ease; }
.production-float-panel__bar.is-active { border-color: rgba(91, 210, 243, .38); background: rgba(13, 25, 31, .95); }
.production-float-panel__brand { display: grid; place-items: center; width: 28px; color: #dbe7e9; }
.production-float-panel__brand svg { width: 22px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.production-float-panel__separator { width: 1px; height: 16px; margin: 0 9px; background: rgba(171, 190, 196, .2); }
.production-float-panel__latency { display: flex; align-items: center; justify-content: center; min-width: 70px; color: #f0f7f8; }
.production-float-panel__latency::before { width: 7px; height: 7px; margin-right: 9px; border-radius: 50%; background: #5bd2f3; box-shadow: 0 0 9px rgba(91, 210, 243, .75); content: ''; }
.production-float-panel__latency strong { font: 600 13px/1 var(--font-mono); letter-spacing: .02em; }
.production-float-panel__inspect { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 9px; color: #b8c8cc; background: transparent; cursor: pointer; }
.production-float-panel__inspect:hover, .production-float-panel__inspect:focus-visible { color: #f2f8f8; background: rgba(155, 181, 188, .13); outline: none; }
.production-float-panel__inspect svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.35; }
.production-float-panel__dots { display: flex; gap: 3px; }
.production-float-panel__dots i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
.production-float-panel__actions { display: flex; align-items: center; justify-content: center; gap: 4px; width: max-content; min-height: 35px; margin: 0 auto 6px; padding: 3px 4px; border-radius: 12px; opacity: 0; transform: translateY(5px); pointer-events: none; transition: opacity .16s ease, transform .16s ease; }
.production-float-panel.expanded .production-float-panel__actions { opacity: 1; transform: translateY(0); pointer-events: auto; }
.production-float-panel__actions button { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px; color: #c6d5d9; background: transparent; cursor: pointer; }
.production-float-panel__actions button:hover, .production-float-panel__actions button:focus-visible { color: #fff; background: rgba(155, 181, 188, .16); outline: none; }
.production-float-panel__actions svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.production-float-panel__action-separator { width: 1px; height: 16px; margin: 0 3px; background: rgba(171, 190, 196, .2); }
.production-float-panel__diagnostics { position: absolute; right: 0; bottom: 42px; display: grid; gap: 6px; min-width: 190px; padding: 10px 12px; border-radius: 10px; color: #aebfc7; font: 10px var(--font-mono); letter-spacing: .04em; }
.production-float-panel__diagnostics b { display: block; margin-top: 2px; color: #e3edf0; font-weight: 500; word-break: break-all; }
@media (prefers-reduced-motion: reduce) { .production-float-panel__actions { transition: none; } }
@media (max-width: 560px) { .production-float-panel__bar { min-width: 164px; }.production-float-panel__separator { margin: 0 6px; }.production-float-panel__latency { min-width: 63px; } }
</style>
