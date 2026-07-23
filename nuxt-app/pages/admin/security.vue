<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

definePageMeta({ layout: 'admin' })
const authFetch = useAuthFetch()
const enabled = ref(false)
const secret = ref('')
const otpauthUrl = ref('')
const code = ref('')
const loading = ref(false)
onMounted(async () => { try { const result: any = await authFetch('/api/auth/me'); enabled.value = result.data?.user?.twoFactorEnabled === true } catch {} })

async function setup2fa() {
  loading.value = true
  try { const result: any = await authFetch('/api/auth/2fa/setup', { method: 'POST' }); secret.value = result.data.secret; otpauthUrl.value = result.data.otpauthUrl; ElMessage.success('配置已生成，请导入验证器后输入验证码启用') }
  catch (error: any) { ElMessage.error(error?.data?.message || '生成配置失败') } finally { loading.value = false }
}
async function enable2fa() {
  if (!/^\d{6}$/.test(code.value)) return ElMessage.warning('请输入 6 位验证码')
  loading.value = true
  try { await authFetch('/api/auth/2fa/enable', { method: 'POST', body: { code: code.value } }); enabled.value = true; secret.value = ''; otpauthUrl.value = ''; code.value = ''; ElMessage.success('2FA 已启用') }
  catch (error: any) { ElMessage.error(error?.data?.message || '验证码无效') } finally { loading.value = false }
}
async function disable2fa() {
  if (!/^\d{6}$/.test(code.value)) return ElMessage.warning('请输入当前 2FA 验证码')
  loading.value = true
  try { await authFetch('/api/auth/2fa/disable', { method: 'POST', body: { code: code.value } }); enabled.value = false; code.value = ''; ElMessage.success('2FA 已禁用') }
  catch (error: any) { ElMessage.error(error?.data?.message || '验证码无效') } finally { loading.value = false }
}
</script>
<template>
  <div class="security-page"><el-card><template #header><h2>账户安全</h2></template>
    <el-alert type="info" :closable="false" title="2FA 使用 TOTP 验证器，启用后登录需要 6 位动态验证码。" />
    <el-descriptions :column="1" border style="margin-top: 18px"><el-descriptions-item label="当前状态">{{ enabled ? '已启用' : '未启用' }}</el-descriptions-item></el-descriptions>
    <div v-if="!enabled" class="setup"><el-button type="primary" :loading="loading" @click="setup2fa">生成 2FA 配置</el-button><template v-if="secret"><el-alert type="warning" :closable="false" title="请妥善保存 secret，并导入验证器。" /><el-input v-model="secret" readonly /><el-input v-model="otpauthUrl" readonly /><el-input v-model="code" maxlength="6" inputmode="numeric" placeholder="6 位验证码" /><el-button type="success" :loading="loading" @click="enable2fa">启用 2FA</el-button></template></div>
    <div v-else class="setup"><el-input v-model="code" maxlength="6" inputmode="numeric" placeholder="当前 2FA 验证码" /><el-button type="danger" :loading="loading" @click="disable2fa">禁用 2FA</el-button></div>
  </el-card></div>
</template>
<style scoped>.security-page { max-width: 760px; margin: 0 auto; }.setup { display: grid; gap: 14px; margin-top: 20px; } h2 { margin: 0; }</style>
