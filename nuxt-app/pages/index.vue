<script setup lang="ts">
const name = 'Your Name'
const tagline = '全栈开发者 · 热爱开源 · 探索技术的无限可能'

useHead({
  title: '首页',
})

useSeoMeta({
  title: '个人主页',
  description: '全栈开发者个人主页，展示项目经历、技术博客与开源贡献。',
  ogTitle: '个人主页',
  ogDescription: '全栈开发者个人主页，展示项目经历、技术博客与开源贡献。',
})

const bio = `我是一名热爱技术的全栈开发者，专注于 Web 应用开发。
拥有丰富的 Vue.js、Node.js 和云端服务开发经验，善于将复杂问题拆解为简洁优雅的解决方案。
工作之余，我喜欢参与开源项目、撰写技术博客，也热衷于分享与交流。
期待与志同道合的伙伴一起创造有意义的产品。`

const skills: string[] = [
  'Vue.js',
  'Nuxt 3',
  'TypeScript',
  'Element Plus',
  'Node.js',
  'CSS/SCSS',
  'Git',
  'Docker',
  'PostgreSQL',
  'REST API',
  'GraphQL',
  'Figma',
]
</script>

<template>
  <div class="page-wrapper">
    <!-- Hero Section -->
    <section class="hero-section">
      <el-row justify="center">
        <el-col :xs="24" :sm="20" :md="16" :lg="12">
          <div class="hero-content">
            <el-avatar :size="120" class="hero-avatar">
              YN
            </el-avatar>
            <h1 class="hero-name">{{ name }}</h1>
            <p class="hero-tagline">{{ tagline }}</p>
            <el-button type="primary" size="large" round>
              联系我
            </el-button>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- Skills Section -->
    <section class="section skills-section">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <h2 class="section-title">技能专长</h2>
          <div class="skills-tags">
            <el-tag
              v-for="skill in skills"
              :key="skill"
              size="large"
              effect="plain"
              class="skill-tag"
            >
              {{ skill }}
            </el-tag>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- About Me Section -->
    <section class="section about-section">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <h2 class="section-title">关于我</h2>
          <el-card shadow="hover" class="about-card">
            <p class="about-text">{{ bio }}</p>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- Featured Grid Section -->
    <section class="section grid-section">
      <el-row justify="center">
        <el-col :xs="24" :sm="22" :md="20" :lg="18">
          <h2 class="section-title">精选内容</h2>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="24" :md="8">
              <NuxtLink to="/portfolio" class="feature-link">
                <el-card shadow="hover" class="feature-card">
                  <h3>🚀 项目经历</h3>
                  <p>多个企业级 Web 应用的设计与开发经验</p>
                </el-card>
              </NuxtLink>
            </el-col>
            <el-col :xs="24" :sm="24" :md="8">
              <NuxtLink to="/blog" class="feature-link">
                <el-card shadow="hover" class="feature-card">
                  <h3>📝 技术博客</h3>
                  <p>记录学习心得，分享实战经验与技术见解</p>
                </el-card>
              </NuxtLink>
            </el-col>
            <el-col :xs="24" :sm="24" :md="8">
              <NuxtLink to="/about" class="feature-link">
                <el-card shadow="hover" class="feature-card">
                  <h3>🎨 开源贡献</h3>
                  <p>活跃于开源社区，为社区生态贡献力量</p>
                </el-card>
              </NuxtLink>
            </el-col>
          </el-row>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--color-text);
  font-family: var(--font-family);
}

/* Hero Section */
.hero-section {
  padding: var(--section-padding) 20px 60px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 100%);
  text-align: center;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.hero-avatar {
  background-color: var(--color-primary) !important;
  color: #fff;
  font-size: 2rem;
  font-weight: 700;
  box-shadow: var(--shadow-light);
}

.hero-name {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}

.hero-tagline {
  font-size: 1.15rem;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 500px;
  line-height: 1.6;
}

/* Section shared */
.section {
  padding: 60px 20px;
}

.section-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 32px;
  color: var(--color-text);
  position: relative;
}

.section-title::after {
  content: '';
  display: block;
  width: 48px;
  height: 3px;
  background: var(--color-primary);
  margin: 12px auto 0;
  border-radius: 2px;
}

/* Skills */
.skills-section {
  background: var(--color-bg-secondary);
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.skill-tag {
  font-size: 0.95rem;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: default;
  transition: transform 0.2s, box-shadow 0.2s;
}

.skill-tag:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-light);
}

/* About */
.about-card {
  border-radius: 12px;
}

.about-text {
  font-size: 1rem;
  line-height: 1.9;
  color: var(--color-text-secondary);
  white-space: pre-line;
  margin: 0;
}

/* Feature grid */
.grid-section {
  background: var(--color-bg-secondary);
}

.feature-card {
  text-align: center;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-card h3 {
  font-size: 1.15rem;
  margin-bottom: 8px;
}

.feature-card p {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.feature-link {
  text-decoration: none;
  display: block;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hero-name {
    font-size: 1.75rem;
  }

  .hero-section {
    padding: 50px 16px 40px;
  }

  .section {
    padding: 40px 16px;
  }
}
</style>
