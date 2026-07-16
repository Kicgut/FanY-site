<script setup lang="ts">
import { marked } from 'marked'
const route = useRoute()
const { data, pending, error } = await useFetch<{ success: boolean; data: any }>(() => `/api/portfolio/${route.params.id}`)
const item = computed(() => data.value?.data)
const html = computed(() => item.value?.content ? marked.parse(item.value.content) : '')
useHead({ title: computed(() => item.value?.title ? `${item.value.title} - 作品集` : '作品详情') })
</script>
<template><main class="detail"><div v-if="pending"><el-skeleton :rows="10" animated /></div><el-result v-else-if="error" icon="warning" title="作品不存在" sub-title="该作品可能尚未发布或链接已失效"><template #extra><NuxtLink to="/portfolio"><el-button type="primary">返回作品集</el-button></NuxtLink></template></el-result><article v-else-if="item"><NuxtLink to="/portfolio" class="back">← 返回作品集</NuxtLink><header><span>{{ item.category || '作品记录' }}</span><h1>{{ item.title }}</h1><p v-if="item.description">{{ item.description }}</p><img v-if="item.coverImage" :src="item.coverImage" :alt="item.title" /></header><div class="rich-content" v-html="html" /><a v-if="item.link" class="external" :href="item.link" target="_blank" rel="noopener">访问相关链接 ↗</a></article></main></template>
<style scoped>.detail{max-width:900px;margin:auto;padding:48px 24px 96px;color:#292b28}.back{color:#92734f;text-decoration:none}.detail header{margin:48px 0 36px}.detail header>span{color:#92734f;letter-spacing:.1em;font-size:13px}.detail h1{font-size:clamp(36px,6vw,64px);line-height:1.1;margin:14px 0}.detail header p{font-size:19px;color:#70736d;line-height:1.7}.detail header img{width:100%;max-height:520px;object-fit:cover;border-radius:18px;margin-top:20px}.rich-content{font-size:17px;line-height:1.9}.rich-content:deep(h2){margin-top:42px}.rich-content:deep(img){max-width:100%;border-radius:12px}.rich-content:deep(a){color:#92734f}.external{display:inline-block;margin-top:34px;color:#92734f}</style>
