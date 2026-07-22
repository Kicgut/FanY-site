<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from '#imports'

definePageMeta({ layout: false })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  errorMsg.value = ''
  if (!form.username || !form.password) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: form.username, password: form.password },
    })
    // API 返回格式: { success: true, data: { token, user } }
    const data = res as any
    const token = data.data?.token || data.token
    const user = data.data?.user || data.user
    
    if (!token) {
      errorMsg.value = '登录失败：未获取到 Token'
      return
    }
    
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/admin'
    router.push(redirect)
  } catch (err: any) {
    errorMsg.value = err?.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <template #header>
        <h2 class="login-title">🔐 Admin Login</h2>
      </template>

      <el-form @submit.prevent="handleLogin">
        <el-alert
          v-if="errorMsg"
          :title="errorMsg"
          type="error"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 420px;
  border-radius: 12px;
}

.login-title {
  text-align: center;
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}
</style>
