<script setup lang="ts">
const title = '关于我'
const description = '这里是关于我的详细介绍页面。敬请期待更多内容！'

useHead({
  title: '关于我',
})

useSeoMeta({
  title: '关于我',
  description: description,
  ogTitle: '关于我',
  ogDescription: description,
})
</script>

<template>
  <div class="page-wrapper">
    <el-row justify="center">
      <el-col :xs="24" :sm="20" :md="16" :lg="12">
        <el-card shadow="hover" class="about-card">
          <h1>{{ title }}</h1>
          <p>{{ description }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--section-padding) 20px;
}

.about-card {
  border-radius: 12px;
  text-align: center;
}

.about-card h1 {
  font-size: 2rem;
  margin-bottom: 16px;
  color: var(--color-text);
}

.about-card p {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  line-height: 1.8;
}
</style>
