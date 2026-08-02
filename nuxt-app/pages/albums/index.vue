<script setup lang="ts">
interface Album { id:number; name:string; description?:string|null; coverUrl?:string|null; photoCount:number; previewPhotos?:Photo[]; createdAt:string }
interface Photo { id:number; title:string; description?:string|null; thumbnailUrl?:string|null; mediumUrl?:string|null; originalUrl?:string|null; width?:number|null; height?:number|null; takenAt?:string|null; location?:string|null; cameraModel?:string|null; tags?:{id:number;name:string}[]; albums?:{album?:{id:number;name:string}}[] }

const authFetch = useAuthFetch()
const route = useRoute()
const router = useRouter()
const { authImageUrl } = usePhotoImageUrl()
const activeView = computed(() => route.query.view === 'albums' ? 'albums' : 'photos')
const query = ref(String(route.query.q || ''))
const year = ref(String(route.query.year || 'all'))
const month = ref(String(route.query.month || 'all'))
const selectedTags = ref<string[]>(String(route.query.tags || '').split(',').filter(Boolean))
const onlyUnfiled = ref(route.query.unfiled === '1')
const sort = ref(String(route.query.sort || 'takenAt-desc'))
const moreFilters = ref(false)
const tagsOpen = ref(false)

const [{ data: albumResponse, pending: albumPending }, { data: photoResponse, pending: photoPending }] = await Promise.all([
  useAsyncData<{ success:boolean; data:Album[] }>('public-albums', () => authFetch('/api/albums/public'), { server:false }),
  useAsyncData<{ success:boolean; photos:Photo[]; total:number; nextCursor?:string|null }>('public-photos', () => authFetch('/api/photos?limit=100&sort=takenAt'), { server:false }),
])
const albums = computed(() => albumResponse.value?.data || [])
const extraPhotos = ref<Photo[]>([])
const nextCursor = ref('')
const loadingMore = ref(false)
watch(photoResponse, value => { extraPhotos.value = []; nextCursor.value = value?.nextCursor || '' }, { immediate:true })
const photos = computed(() => [...(photoResponse.value?.photos || []), ...extraPhotos.value])
const allTags = computed(() => [...new Set(photos.value.flatMap(p => p.tags?.map(t => t.name) || []))])
const years = computed(() => [...new Set(photos.value.map(p => p.takenAt ? new Date(p.takenAt).getFullYear() : null).filter(Boolean) as number[])] .sort((a,b)=>b-a))
const months = computed(() => year.value === 'all' ? [] : [...new Set(photos.value.filter(p => p.takenAt && new Date(p.takenAt).getFullYear() === Number(year.value)).map(p => new Date(p.takenAt!).getMonth()+1))].sort((a,b)=>a-b))
const filteredPhotos = computed(() => {
  const q = query.value.trim().toLowerCase()
  return [...photos.value].filter(photo => {
    const date = photo.takenAt ? new Date(photo.takenAt) : null
    const matchesQ = !q || `${photo.title} ${photo.description || ''} ${photo.location || ''} ${photo.tags?.map(t=>t.name).join(' ') || ''}`.toLowerCase().includes(q)
    const matchesDate = year.value === 'all' || date?.getFullYear() === Number(year.value)
      ? month.value === 'all' || date?.getMonth() === Number(month.value)-1 : false
    const matchesTags = !selectedTags.value.length || selectedTags.value.every(tag => photo.tags?.some(t => t.name === tag))
    const matchesUnfiled = !onlyUnfiled.value || !photo.albums?.length
    return matchesQ && matchesDate && matchesTags && matchesUnfiled
  }).sort((a,b) => sort.value === 'title' ? a.title.localeCompare(b.title,'zh-CN') : new Date(b.takenAt || 0).getTime() - new Date(a.takenAt || 0).getTime())
})
const totalPhotos = computed(() => photos.value.length)
const featuredAlbum = computed(() => albums.value[0])
const loading = computed(() => albumPending.value || photoPending.value)
function imageSrc(photo:Photo) { return authImageUrl(photo.thumbnailUrl || photo.mediumUrl || photo.originalUrl) }
function formatDate(value?:string|null) { return value ? new Date(value).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}) : '未标注日期' }
function updateQuery(next:Record<string,any> = {}) { const value:any = { ...route.query, ...next }; Object.keys(value).forEach(k => { if (value[k] === undefined || value[k] === '' || value[k] === 'all' || value[k] === false || (Array.isArray(value[k]) && !value[k].length)) delete value[k] }); router.replace({ query:value }) }
function switchView(view:'albums'|'photos') { updateQuery({view:view === 'photos' ? undefined : 'albums'}) }
function toggleTag(tag:string) { selectedTags.value = selectedTags.value.includes(tag) ? selectedTags.value.filter(t=>t!==tag) : [...selectedTags.value,tag]; updateQuery({tags:selectedTags.value.join(',')}) }
function removeTag(tag:string) { selectedTags.value = selectedTags.value.filter(t=>t!==tag); updateQuery({tags:selectedTags.value.join(',')}) }
function clearFilters() { query.value=''; year.value='all'; month.value='all'; selectedTags.value=[]; onlyUnfiled.value=false; updateQuery({q:undefined,year:undefined,month:undefined,tags:undefined,unfiled:undefined}) }
async function loadMorePhotos() { if (!nextCursor.value || loadingMore.value) return; loadingMore.value = true; try { const response = await authFetch<{success:boolean;photos:Photo[];nextCursor?:string|null}>(`/api/photos?limit=100&sort=takenAt&cursor=${encodeURIComponent(nextCursor.value)}`); extraPhotos.value.push(...(response.photos || [])); nextCursor.value = response.nextCursor || '' } finally { loadingMore.value = false } }
function openPhoto(photo:Photo) { router.push({ path:`/photos/${photo.id}`, query:{ from:'archive', album:photo.albums?.[0]?.album?.id } }) }
function gridStyle(photo:Photo) { return { aspectRatio:`${photo.width || 4} / ${photo.height || 3}` } }
useHead({ title:'影像 · FAN / Y' })
</script>

<template>
  <div class="archive-page">
    <div class="archive-stars" aria-hidden="true" />
    <main class="archive-shell">
      <section class="archive-intro">
        <div>
          <span class="kicker">IMAGE ARCHIVE</span>
          <h1>影像</h1>
          <p>浏览我的相册与独立影像，记录光影与时间。</p>
          <div class="archive-count"><b>{{ albums.length }}</b> 个相册 <i>/</i> <b>{{ totalPhotos }}</b> 张影像</div>
        </div>
        <NuxtLink v-if="featuredAlbum" :to="`/albums/${featuredAlbum.id}`" class="featured-album">
          <div class="featured-images"><img v-for="photo in featuredAlbum.previewPhotos?.slice(0,3)" :key="photo.id" :src="imageSrc(photo)" :alt="photo.title" /></div>
          <div class="featured-copy"><span>精选相册</span><strong>{{ featuredAlbum.name }}</strong><small>{{ featuredAlbum.photoCount }} 张</small></div><span class="arrow">›</span>
        </NuxtLink>
      </section>

      <nav class="view-tabs" aria-label="影像视图"><button :class="{active:activeView==='albums'}" @click="switchView('albums')">相册</button><button :class="{active:activeView==='photos'}" @click="switchView('photos')">全部影像</button></nav>
      <section class="filter-bar">
        <label class="search-field"><span>⌕</span><input v-model="query" placeholder="搜索影像" @input="updateQuery({q:query})" /></label>
        <select v-model="year" @change="updateQuery({year,month:undefined})"><option value="all">全部年份</option><option v-for="value in years" :key="value" :value="value">{{ value }}</option></select>
        <select v-if="year !== 'all'" v-model="month" @change="updateQuery({month})"><option value="all">全部月份</option><option v-for="value in months" :key="value" :value="value">{{ value }} 月</option></select>
        <button class="filter-chip" @click="tagsOpen=!tagsOpen">标签 <span>⌄</span></button>
        <button class="filter-chip" :class="{selected:onlyUnfiled}" @click="onlyUnfiled=!onlyUnfiled;updateQuery({unfiled:onlyUnfiled})">未归册</button>
        <button class="more-filter" @click="moreFilters=!moreFilters">☷ 更多筛选</button>
        <div class="filter-spacer" /> <button class="clear-filter" @click="clearFilters">清除筛选</button><span class="filter-divider" /><select class="sort-select" v-model="sort" @change="updateQuery({sort})"><option value="takenAt-desc">拍摄时间 · 最新</option><option value="title">标题</option></select><span class="result-count">找到 {{ activeView==='albums' ? albums.length : filteredPhotos.length }} 张</span>
      </section>
      <div v-if="tagsOpen" class="tag-menu"><button v-for="tag in allTags" :key="tag" :class="{active:selectedTags.includes(tag)}" @click="toggleTag(tag)">{{ tag }}</button></div>
      <div v-if="selectedTags.length" class="active-tags"><span v-for="tag in selectedTags" :key="tag">{{ tag }} <button @click="removeTag(tag)">×</button></span></div>
      <section v-if="activeView==='albums'" class="album-grid"><NuxtLink v-for="album in albums" :key="album.id" :to="`/albums/${album.id}`" class="album-tile"><div class="tile-cover"><img v-if="album.coverUrl" :src="album.coverUrl" :alt="album.name" /><div v-else class="tile-empty">○</div><div class="tile-caption"><strong>{{ album.name }}</strong><span>{{ album.photoCount }} 张 · {{ formatDate(album.createdAt) }}</span></div></div></NuxtLink></section>
      <section v-else class="photo-grid"><button v-for="photo in filteredPhotos" :key="photo.id" class="photo-tile" :style="gridStyle(photo)" @click="openPhoto(photo)"><img :src="imageSrc(photo)" :alt="photo.title" loading="lazy" /><span class="photo-caption"><strong>{{ photo.title }}</strong><small>{{ formatDate(photo.takenAt) }} <em v-if="!photo.albums?.length">未归册</em></small></span></button></section>
      <div v-if="loading" class="loading-state">正在整理影像…</div><div v-else-if="activeView==='photos' && !filteredPhotos.length" class="empty-state">没有符合当前筛选的影像<button @click="clearFilters">清除筛选</button></div><button v-if="activeView==='photos' && nextCursor" class="load-more" :disabled="loadingMore" @click="loadMorePhotos">{{ loadingMore ? '正在加载…' : '加载更多影像' }}</button>
    </main>
  </div>
</template>

<style scoped>
.archive-page{min-height:100vh;background:#061321;color:#dce9ee;position:relative;overflow:hidden}.archive-stars{position:absolute;inset:0;opacity:.38;pointer-events:none;background-image:radial-gradient(circle,#8aa8b7 0 1px,transparent 1.5px);background-size:190px 170px;background-position:30px 20px}.archive-shell{position:relative;max-width:1600px;margin:auto;padding:40px clamp(20px,3vw,50px) 80px}.archive-intro{display:flex;justify-content:space-between;gap:36px;align-items:end;padding:34px 4px 36px}.kicker{color:#63c8e9;font:12px var(--font-mono);letter-spacing:.18em}.archive-intro h1{font-family:Georgia,'Songti SC',serif;font-size:clamp(3.5rem,6vw,5.6rem);font-weight:400;line-height:.95;margin:18px 0 14px;color:#f2f7f8}.archive-intro p{margin:0;color:#a8bdc7;font-size:16px}.archive-count{margin-top:25px;color:#a7bcc6;font:13px var(--font-mono)}.archive-count b{color:#75cee9}.archive-count i{font-style:normal;color:#607985;margin:0 14px}.featured-album{width:min(520px,42vw);display:flex;align-items:center;gap:20px;padding:12px;border:1px solid rgba(147,185,201,.25);border-radius:8px;background:rgba(22,36,49,.72);color:inherit;text-decoration:none}.featured-images{width:280px;height:132px;display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;gap:2px;overflow:hidden;border-radius:4px}.featured-images img{width:100%;height:100%;object-fit:cover}.featured-images img:first-child{grid-row:span 2}.featured-copy{display:flex;flex-direction:column;gap:8px}.featured-copy span{color:#a3b4bd;font-size:12px}.featured-copy strong{font-family:Georgia,serif;font-size:22px;font-weight:400}.featured-copy small{color:#a9bac2;font:12px var(--font-mono)}.arrow{margin-left:auto;font-size:34px;font-weight:200}.view-tabs{display:flex;gap:30px;border-bottom:1px solid rgba(157,190,202,.12)}.view-tabs button{padding:15px 5px 13px;border:0;border-bottom:2px solid transparent;background:none;color:#8da3ad;cursor:pointer;font-size:15px}.view-tabs button.active{color:#edf6f8;border-color:#61cbed}.filter-bar{min-height:54px;margin:10px 0 30px;padding:9px 14px;display:flex;align-items:center;gap:9px;border:1px solid rgba(145,180,193,.18);border-radius:8px;background:rgba(26,43,57,.6)}.search-field{display:flex;align-items:center;gap:8px;min-width:265px;padding:9px 11px;border:1px solid rgba(160,191,201,.18);border-radius:6px;background:rgba(6,18,30,.4);color:#91a8b2}.search-field input{width:100%;border:0;outline:0;background:none;color:#e3eef1}.filter-bar select,.filter-chip,.more-filter{height:34px;padding:0 12px;border:1px solid rgba(160,191,201,.2);border-radius:6px;background:#172b3a;color:#b9cbd2;white-space:nowrap;font-size:12px}.filter-chip,.more-filter{cursor:pointer}.filter-chip.selected,.tag-menu button.active{border-color:#5cc9eb;color:#74d5f4}.filter-spacer{flex:1}.clear-filter{border:0;background:none;color:#92a8b2;font-size:12px;cursor:pointer}.filter-divider{height:20px;border-left:1px solid rgba(160,191,201,.2)}.sort-select{border:0!important;background:transparent!important}.result-count{color:#8da3ad;font:12px var(--font-mono);white-space:nowrap}.tag-menu,.active-tags{display:flex;gap:8px;flex-wrap:wrap;margin:-20px 0 22px}.tag-menu button,.active-tags span{padding:7px 11px;border:1px solid rgba(160,191,201,.25);border-radius:6px;background:#172b3a;color:#b9cbd2;font-size:12px}.tag-menu button{cursor:pointer}.active-tags{margin-top:-18px}.active-tags span{border-color:rgba(92,201,235,.4);color:#73d1ee}.active-tags button{border:0;background:none;color:inherit;cursor:pointer}.album-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.tile-cover{aspect-ratio:4/3;position:relative;overflow:hidden;border:1px solid rgba(150,185,198,.28);border-radius:8px;background:#172633}.tile-cover img{width:100%;height:100%;object-fit:cover;display:block}.tile-empty{display:grid;place-items:center;height:100%;font-size:45px;color:#55717d}.tile-caption,.photo-caption{position:absolute;inset:auto 0 0;padding:38px 16px 14px;background:linear-gradient(transparent,rgba(4,12,20,.9));display:flex;flex-direction:column;gap:5px;color:#fff}.tile-caption strong{font:20px Georgia,serif}.tile-caption span,.photo-caption small{color:#b3c5cb;font:12px var(--font-mono)}.photo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.photo-tile{position:relative;padding:0;border:1px solid rgba(147,185,201,.25);border-radius:7px;overflow:hidden;background:#132431;cursor:zoom-in;min-width:0}.photo-tile img{width:100%;height:100%;display:block;object-fit:cover}.photo-caption{opacity:0;transition:opacity .18s}.photo-tile:hover .photo-caption,.photo-tile:focus-visible .photo-caption{opacity:1}.photo-caption strong{font-size:14px;font-weight:500}.photo-caption em{font-style:normal;color:#6dd1ee;margin-left:7px}.loading-state,.empty-state{text-align:center;padding:80px 20px;color:#93aab4}.empty-state button,.load-more{display:block;margin:16px auto;border:1px solid #5cc9eb;border-radius:6px;padding:9px 15px;color:#71d3f1;background:transparent;cursor:pointer}.load-more:disabled{opacity:.5;cursor:wait}@media(max-width:900px){.archive-intro{align-items:start;flex-direction:column}.featured-album{width:100%;max-width:520px}.album-grid{grid-template-columns:repeat(2,1fr)}.photo-grid{grid-template-columns:repeat(4,1fr)}.filter-spacer,.clear-filter,.filter-divider{display:none}}@media(max-width:620px){.archive-shell{padding-top:20px}.featured-images{width:150px;height:90px}.featured-copy strong{font-size:17px}.filter-bar{flex-wrap:wrap}.search-field{width:100%;min-width:0}.result-count{margin-left:auto}.album-grid{grid-template-columns:1fr}.photo-grid{grid-template-columns:repeat(2,1fr);gap:4px}.photo-tile:nth-child(3n){grid-column:span 2}.photo-caption{opacity:1;padding:30px 8px 8px}.photo-caption strong{font-size:12px}}
</style>

<style scoped>
.archive-shell { padding: 104px clamp(20px, 3vw, 50px) 56px; }
.archive-intro { align-items: center; gap: 32px; padding: 0 4px 22px; }
.archive-intro h1 { margin: 12px 0 8px; font-size: clamp(3rem, 3.8vw, 4rem); line-height: 1; text-wrap: balance; }
.archive-intro p { font-size: 15px; }
.archive-count { margin-top: 16px; }
.featured-album { width: min(500px, 40vw); gap: 16px; padding: 10px; }
.featured-images { width: 252px; height: 118px; }
.featured-copy { gap: 6px; }
.featured-copy strong { font-size: 21px; }
.arrow { font-size: 30px; }
.view-tabs button { padding: 12px 5px 11px; }
.filter-bar { min-height: 50px; margin: 8px 0 18px; padding: 8px 12px; }
.photo-grid { gap: 6px; }
.photo-tile { border-radius: 8px; }

@media (max-width: 900px) {
  .archive-shell { padding-top: 94px; }
  .archive-intro { align-items: flex-start; }
}

@media (max-width: 620px) {
  .archive-shell { padding-top: 88px; }
  .archive-intro { padding-bottom: 18px; }
  .archive-intro h1 { font-size: clamp(2.75rem, 14vw, 3.5rem); }
}
</style>
