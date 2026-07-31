<script setup lang="ts">
interface Photo { id:number; title:string; description?:string|null; originalUrl?:string|null; mediumUrl?:string|null; thumbnailUrl?:string|null; width?:number|null; height?:number|null; takenAt?:string|null; location?:string|null; cameraMake?:string|null; cameraModel?:string|null; lens?:string|null; iso?:number|null; focalLength?:number|null; allowOriginalDownload?:boolean; tags?:{id:number;name:string}[]; albums?:{album?:{name:string}}[] }
interface GalleryResponse { success:boolean; photos:Photo[]; total:number }
const route = useRoute()
const router = useRouter()
const { data, pending, error } = await useAsyncData<Photo>(`photo-${route.params.id}`, () => useAuthFetch()(`/api/photos/${route.params.id}`), { server:false })
const { data: galleryResponse } = await useAsyncData<GalleryResponse>('viewer-gallery', () => useAuthFetch()('/api/photos?limit=100&sort=takenAt'), { server:false })
const photo = computed(() => data.value)
const galleryPhotos = computed(() => galleryResponse.value?.photos || [])
const currentIndex = computed(() => galleryPhotos.value.findIndex(item => item.id === photo.value?.id))
const positionLabel = computed(() => currentIndex.value >= 0 ? `${String(currentIndex.value + 1).padStart(2, '0')} / ${galleryPhotos.value.length}` : '')
const canGoPrevious = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value >= 0 && currentIndex.value < galleryPhotos.value.length - 1)
const showInfo = ref(true)
const original = ref(false)
const fullscreen = ref(false)
const imageSrc = computed(() => { const item=photo.value; if(!item)return ''; return original.value && item.allowOriginalDownload ? item.originalUrl || item.mediumUrl || item.thumbnailUrl : item.mediumUrl || item.thumbnailUrl || item.originalUrl || '' })
function formatDate(value?:string|null) { return value ? new Date(value).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}) : '未标注日期' }
function goBack() {
  const from = String(route.query.from || '')
  if (from.startsWith('album:')) {
    const albumId = from.slice('album:'.length)
    if (albumId) return router.push(`/albums/${albumId}`)
  }
  if (from === 'archive') return router.push({ path: '/albums', query: { view: 'photos' } })
  return router.push('/albums')
}
function goToPhoto(id:number) { router.push({ path:`/photos/${id}`, query:route.query }) }
function goPrevious() { if(canGoPrevious.value) goToPhoto(galleryPhotos.value[currentIndex.value - 1].id) }
function goNext() { if(canGoNext.value) goToPhoto(galleryPhotos.value[currentIndex.value + 1].id) }
function onKeydown(e:KeyboardEvent) { if(e.key==='Escape') fullscreen.value=false; if(e.key==='i') showInfo.value=!showInfo.value; if(e.key==='ArrowLeft') goPrevious(); if(e.key==='ArrowRight') goNext() }
onMounted(()=>document.addEventListener('keydown',onKeydown)); onUnmounted(()=>document.removeEventListener('keydown',onKeydown))
useHead({title:computed(()=>photo.value?.title || '影像查看器')})
</script>

<template>
  <div class="viewer-page" :class="{'is-fullscreen':fullscreen}">
    <header class="viewer-header"><button class="back-button" @click="goBack"><span>×</span> 返回影像</button><span v-if="positionLabel" class="position">{{ positionLabel }}</span><div class="viewer-actions"><button @click="showInfo=!showInfo">信息</button><button @click="fullscreen=!fullscreen" aria-label="全屏">⛶</button><button v-if="photo?.allowOriginalDownload" class="original-link" @click="original=!original">{{ original ? '查看预览' : '查看原图' }}</button></div></header>
    <main v-if="pending" class="viewer-loading">正在打开影像…</main>
    <main v-else-if="error || !photo" class="viewer-loading">影像不可用<button @click="goBack">返回影像</button></main>
    <main v-else class="viewer-main">
      <section class="stage"><div class="stage-controls"><button class="nav-button prev" :disabled="!canGoPrevious" aria-label="上一张" @click="goPrevious">‹</button><div class="image-wrap"><img :src="imageSrc" :alt="photo.title" @dblclick="fullscreen=!fullscreen" /></div><button class="nav-button next" :disabled="!canGoNext" aria-label="下一张" @click="goNext">›</button></div><div v-if="galleryPhotos.length" class="thumbnail-strip"><button v-for="item in galleryPhotos.slice(Math.max(0,currentIndex-2), currentIndex+3)" :key="item.id" :class="{active:item.id===photo.id}" @click="goToPhoto(item.id)"><img :src="item.thumbnailUrl || item.mediumUrl || item.originalUrl || ''" :alt="item.title" /></button></div></section>
      <aside v-if="showInfo" class="detail-panel"><span class="panel-kicker">PHOTO DETAIL</span><h1>{{ photo.title }}</h1><p class="date">{{ formatDate(photo.takenAt) }}</p><p v-if="photo.description" class="description">{{ photo.description }}</p><div v-if="photo.tags?.length" class="tags">⌑ <span v-for="tag in photo.tags" :key="tag.id">{{ tag.name }}</span></div><div v-if="photo.albums?.[0]?.album" class="album-pill">▧ 相册：{{ photo.albums[0].album.name }}</div><section class="meta-section"><h2>拍摄信息</h2><dl><template v-if="photo.cameraModel"><dt>相机</dt><dd>{{ [photo.cameraMake,photo.cameraModel].filter(Boolean).join(' ') }}</dd></template><template v-if="photo.lens"><dt>镜头</dt><dd>{{ photo.lens }}</dd></template><template v-if="photo.focalLength"><dt>焦距</dt><dd>{{ photo.focalLength }}mm</dd></template><template v-if="photo.iso"><dt>ISO</dt><dd>{{ photo.iso }}</dd></template><dt v-if="photo.width">分辨率</dt><dd v-if="photo.width">{{ photo.width }} × {{ photo.height }}</dd></dl></section><section v-if="photo.location" class="meta-section"><h2>位置信息</h2><p class="location">● {{ photo.location }}</p></section><footer>▢ 原图仅在授权时提供</footer></aside>
    </main>
  </div>
</template>

<style scoped>
.viewer-page{min-height:100vh;background:#050f1c;color:#e7f0f3}.viewer-header{height:58px;border-bottom:1px solid rgba(164,194,205,.2);display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:relative;z-index:2}.viewer-header button{border:0;background:none;color:#dce9ed;cursor:pointer;font-size:15px}.back-button{display:flex;align-items:center;gap:13px}.back-button span{font-size:34px;font-weight:200;line-height:0}.position{font:18px var(--font-mono);letter-spacing:.08em}.viewer-actions{display:flex;align-items:center;gap:28px}.viewer-actions .original-link{color:#67c9e7}.viewer-main{min-height:calc(100vh - 58px);display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:28px;padding:24px 26px 28px}.stage{min-width:0;display:flex;align-items:center;justify-content:center;gap:22px}.image-wrap{height:min(80vh,780px);width:min(72vw,900px);display:flex;align-items:center;justify-content:center}.image-wrap img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.28);cursor:zoom-in}.nav-button{width:52px;height:52px;flex:0 0 auto;border:1px solid rgba(182,207,215,.13);border-radius:50%;background:rgba(183,204,212,.1);color:#e8f3f5;font-size:44px;font-weight:200;line-height:0;cursor:pointer}.nav-button:hover{background:rgba(112,203,233,.18)}.detail-panel{max-height:calc(100vh - 106px);overflow:auto;padding:28px 25px 22px;border:1px solid rgba(165,197,209,.2);border-radius:14px;background:linear-gradient(145deg,rgba(27,42,56,.78),rgba(16,29,42,.82));scrollbar-color:#536a76 transparent}.panel-kicker,.meta-section h2{color:#69cae7;font:12px var(--font-mono);letter-spacing:.15em}.detail-panel h1{font:28px Georgia,serif;font-weight:400;margin:18px 0 7px}.date{color:#b4c5cb;margin:0 0 25px;font:13px var(--font-mono)}.description{color:#b9cbd0;line-height:1.8;font-size:14px}.tags{color:#64cbed;display:flex;gap:8px;flex-wrap:wrap;margin:23px 0}.tags span{color:#7fd2e9}.album-pill{display:inline-flex;padding:8px 11px;border:1px solid rgba(182,207,215,.18);border-radius:8px;color:#b5c8cf;font-size:12px}.meta-section{margin-top:28px;padding-top:23px;border-top:1px solid rgba(170,199,207,.17)}.meta-section h2{margin:0 0 17px;letter-spacing:.08em}.meta-section dl{display:grid;grid-template-columns:70px 1fr;gap:12px 10px;margin:0;font-size:13px}.meta-section dt{color:#a1b5bc}.meta-section dd{margin:0;text-align:right;color:#dae7ea}.location{color:#d5e4e8;font-size:13px}.detail-panel footer{margin-top:30px;padding-top:20px;border-top:1px solid rgba(170,199,207,.17);color:#9aadb4;font-size:12px}.viewer-loading{min-height:calc(100vh - 58px);display:grid;place-items:center;color:#91a9b1}.viewer-loading button{margin-left:14px;padding:8px 12px;border:1px solid #5cc9eb;border-radius:5px;color:#70d1ee;background:none}.is-fullscreen .viewer-header{position:fixed;inset:0 0 auto}.is-fullscreen .viewer-main{display:block;padding:58px 0 0}.is-fullscreen .stage{height:100vh}.is-fullscreen .detail-panel{display:none}@media(max-width:900px){.viewer-main{grid-template-columns:1fr;padding:16px}.stage{min-height:56vh}.detail-panel{max-height:none}.image-wrap{width:calc(100vw - 80px);height:60vh}.viewer-actions{gap:14px}.viewer-actions button:first-child{display:none}}@media(max-width:560px){.viewer-header{padding:0 14px}.position{display:none}.viewer-actions{gap:11px}.nav-button{width:40px;height:40px;font-size:34px}.stage{gap:8px}.detail-panel{padding:22px 18px}}
.stage{flex-direction:column;gap:16px}.stage-controls{min-width:0;width:100%;display:flex;align-items:center;justify-content:center;gap:22px}.nav-button:disabled{opacity:.25;cursor:not-allowed}.thumbnail-strip{display:flex;justify-content:center;gap:18px;max-width:820px}.thumbnail-strip button{width:112px;height:78px;padding:0;border:1px solid rgba(182,207,215,.28);border-radius:7px;overflow:hidden;background:#142433;cursor:pointer;opacity:.8}.thumbnail-strip button.active{border:2px solid #5cc9eb;opacity:1}.thumbnail-strip img{width:100%;height:100%;object-fit:cover;display:block}.is-fullscreen .thumbnail-strip{display:none}@media(max-width:900px){.stage-controls{gap:8px}.thumbnail-strip{gap:8px}.thumbnail-strip button{width:76px;height:54px}}
</style>

<style scoped>
.viewer-page { min-height: 100dvh; }
.viewer-main {
  height: calc(100dvh - 58px);
  min-height: 0;
  padding: 16px 24px 20px;
  overflow: hidden;
}
.stage { min-height: 0; height: 100%; gap: 12px; }
.stage-controls { flex: 1; min-height: 0; gap: 18px; }
.image-wrap {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.image-wrap img {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: contain;
}
.thumbnail-strip { flex: 0 0 auto; gap: 12px; }

@media (max-width: 900px) {
  .viewer-main { height: auto; min-height: calc(100dvh - 58px); overflow: visible; }
}
</style>
