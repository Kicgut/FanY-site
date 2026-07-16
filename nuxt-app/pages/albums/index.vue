<script setup lang="ts">
interface PublicAlbum { id:number; name:string; description?:string|null; coverUrl?:string|null; photoCount:number; previewPhotos?:{id:number; thumbnailUrl?:string|null}[] }
const { data, pending, error } = await useFetch<{ success:boolean; data:PublicAlbum[] }>('/api/albums/public')
const query = ref('')
const albums = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (data.value?.data ?? []).filter(a => !q || `${a.name} ${a.description ?? ''}`.toLowerCase().includes(q))
})
useHead({ title: '照片相册' })
</script>
<template>
  <div class="albums-page">
    <section class="albums-hero"><div class="shell">
      <div class="eyebrow">PHOTO INDEX / PUBLIC ARCHIVE</div>
      <h1>照片相册</h1><p>用影像记录值得回看的片段。</p>
      <div class="search-wrap"><span>⌕</span><input v-model="query" placeholder="搜索相册名称或描述" aria-label="搜索相册" /><kbd>⌘ K</kbd></div>
    </div></section>
    <main class="shell albums-content">
      <div class="section-meta"><span>{{ albums.length }} 个相册</span><span v-if="query">正在筛选 “{{ query }}”</span></div>
      <el-skeleton v-if="pending" :rows="5" animated />
      <el-alert v-else-if="error" type="error" title="相册加载失败" description="请稍后刷新重试。" show-icon :closable="false" />
      <el-empty v-else-if="!albums.length" description="没有匹配的公开相册" />
      <div v-else class="albums-grid">
        <NuxtLink v-for="album in albums" :key="album.id" :to="`/albums/${album.id}`" class="album-card">
          <div class="album-cover">
            <div v-if="album.previewPhotos?.length" class="preview-mosaic">
              <img v-for="photo in album.previewPhotos.slice(0,4)" :key="photo.id" :src="photo.thumbnailUrl || album.coverUrl || ''" :alt="album.name" loading="lazy" />
            </div>
            <img v-else-if="album.coverUrl" :src="album.coverUrl" :alt="album.name" loading="lazy" />
            <span v-else class="cover-placeholder">◌</span>
            <span class="view-cue">查看相册 ↗</span>
          </div>
          <div class="album-info"><div><h2>{{ album.name }}</h2><p v-if="album.description">{{ album.description }}</p></div><span class="count">{{ album.photoCount }} 张</span></div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
<style scoped>
.albums-page{min-height:100vh}.shell{max-width:var(--max-width);margin:auto;padding-left:24px;padding-right:24px}.albums-hero{padding:88px 0 52px;background:radial-gradient(circle at 80% 20%,#d7c6a8 0,transparent 32%),var(--color-bg);border-bottom:1px solid var(--color-border)}.eyebrow{font:12px var(--font-mono);letter-spacing:.12em;color:var(--color-accent);margin-bottom:18px}.albums-hero h1{font-size:clamp(2.5rem,6vw,5rem);letter-spacing:-.06em;margin:0 0 12px}.albums-hero p{font-size:1.1rem;color:var(--color-text-secondary);margin:0 0 28px}.search-wrap{display:flex;align-items:center;gap:10px;max-width:520px;padding:12px 14px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:6px;box-shadow:var(--shadow-light)}.search-wrap span{font-size:1.35rem;color:var(--color-accent)}.search-wrap input{border:0;outline:0;flex:1;color:var(--color-text);background:transparent}.search-wrap kbd{font:11px var(--font-mono);color:var(--color-text-muted);background:var(--color-bg-secondary);padding:4px 7px;border-radius:5px}.albums-content{padding-top:30px;padding-bottom:90px}.section-meta{display:flex;justify-content:space-between;color:var(--color-text-muted);font:12px var(--font-mono);margin-bottom:18px}.albums-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}.album-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:4px;overflow:hidden;text-decoration:none;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}.album-card:hover{transform:translateY(-4px);border-color:var(--color-primary);box-shadow:var(--shadow-light)}.album-cover{height:248px;position:relative;overflow:hidden;background:var(--color-bg-secondary)}.album-cover>img,.preview-mosaic img{width:100%;height:100%;object-fit:cover}.album-cover>img{transition:transform .35s ease}.album-card:hover .album-cover>img{transform:scale(1.035)}.preview-mosaic{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:3px;width:100%;height:100%}.preview-mosaic img:first-child{grid-row:1/-1}.view-cue{position:absolute;right:14px;bottom:14px;color:#fff;background:rgba(30,33,29,.8);padding:6px 9px;border-radius:4px;font-size:12px;opacity:0;transform:translateY(5px);transition:.25s}.album-card:hover .view-cue{opacity:1;transform:none}.cover-placeholder{display:grid;place-items:center;height:100%;font-size:4rem;color:var(--color-text-muted)}.album-info{display:flex;justify-content:space-between;gap:16px;padding:18px}.album-info h2{font-size:1.08rem;margin:0 0 7px}.album-info p{font-size:.88rem;color:var(--color-text-secondary);margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.count{font:12px var(--font-mono);color:var(--color-text-muted);white-space:nowrap;padding-top:4px}@media(max-width:640px){.shell{padding-left:16px;padding-right:16px}.albums-hero{padding-top:56px}.album-cover{height:220px}}
</style>
