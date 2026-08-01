<script setup lang="ts">
import { reactive, ref } from 'vue'
definePageMeta({ layout: false })
const router = useRouter(); const route = useRoute(); const loading = ref(false); const errorMsg = ref('')
const form = reactive({ username: '', password: '', otp: '' })
async function handleLogin() {
  errorMsg.value = ''
  if (!form.username || !form.password) { errorMsg.value = '请输入用户名和密码'; return }
  loading.value = true
  try {
    const data: any = await $fetch('/api/auth/login', { method: 'POST', body: { username: form.username, password: form.password, ...(form.otp ? { otp: form.otp } : {}) } })
    const token = data.data?.token || data.token; const user = data.data?.user || data.user
    if (!token) { errorMsg.value = '登录失败：未获取到访问凭证'; return }
    localStorage.setItem('token', token); if (data.data?.refreshToken) localStorage.setItem('refreshToken', data.data.refreshToken); localStorage.setItem('user', JSON.stringify(user))
    router.push(typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/admin')
  } catch (err: any) { errorMsg.value = err?.data?.message || '登录失败，请检查账户信息后重试' } finally { loading.value = false }
}
</script>

<template>
  <div class="login-page"><div class="login-atmosphere" aria-hidden="true" />
    <main class="login-card" aria-labelledby="login-title">
      <header class="login-head"><NuxtLink to="/" class="login-mark" aria-label="返回主页">FY</NuxtLink><div><p>CONTROL / ROOM</p><h1 id="login-title">进入管理空间</h1></div></header>
      <p class="login-copy">用于内容审核、资源组织与受控运维。访问记录会被保留。</p>
      <el-form @submit.prevent="handleLogin">
        <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="login-error" />
        <el-form-item label="用户名"><el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" size="large" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" autocomplete="current-password" placeholder="请输入密码" size="large" show-password @keyup.enter="handleLogin" /></el-form-item>
        <el-form-item label="2FA 验证码"><el-input v-model="form.otp" inputmode="numeric" maxlength="6" placeholder="启用二次验证时填写" /></el-form-item>
        <el-form-item><el-button type="primary" native-type="submit" size="large" :loading="loading" class="login-submit">登录</el-button></el-form-item>
      </el-form>
      <footer class="login-foot">仅限授权账户 · 已启用二次验证时请输入验证码</footer>
    </main>
  </div>
</template>

<style scoped>
.login-page{position:relative;display:flex;min-height:100vh;align-items:center;justify-content:center;overflow:hidden;color:#e9f3f8;background:#07111e}.login-atmosphere{position:absolute;inset:0;background:radial-gradient(circle at 74% 24%,rgba(67,190,226,.16),transparent 23%),radial-gradient(circle at 18% 84%,rgba(37,82,128,.2),transparent 30%),linear-gradient(135deg,#07111e,#0c1a2b 62%,#08111e)}.login-card{position:relative;z-index:1;width:min(440px,calc(100% - 32px));padding:32px;border:1px solid rgba(148,184,214,.28);border-radius:16px;background:rgba(14,26,42,.78);box-shadow:0 28px 80px rgba(0,0,0,.36),inset 0 1px rgba(218,242,250,.08);backdrop-filter:blur(18px)}.login-head{display:flex;align-items:center;gap:14px;margin-bottom:18px}.login-mark{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(131,223,243,.72);border-radius:12px;color:#c8f5ff;background:rgba(72,194,224,.13);font:700 12px var(--font-mono);text-decoration:none}.login-head p{margin:0 0 5px;color:#74d5eb;font:10px var(--font-mono);letter-spacing:.16em}.login-head h1{margin:0;color:#eff9fc;font-size:22px;font-weight:600}.login-copy{margin:0 0 24px;color:#9fb6c4;font-size:13px;line-height:1.7}.login-error{margin-bottom:20px}.login-card :deep(.el-form-item__label){color:#bdd1dc}.login-card :deep(.el-input__wrapper){background:rgba(6,16,28,.52);box-shadow:0 0 0 1px rgba(148,184,214,.25) inset}.login-card :deep(.el-input__inner){color:#eef9fd}.login-card :deep(.el-button--primary){border-color:#5cd4ed;background:#4ac4df;color:#062033;font-weight:650}.login-submit{width:100%}.login-foot{margin-top:8px;color:#7490a0;font:11px var(--font-mono);line-height:1.6}@media(max-width:480px){.login-card{padding:26px 22px}}
</style>
