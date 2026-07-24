<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import { ElMessage } from 'element-plus'

definePageMeta({ layout: 'admin' })

const authFetch = useAuthFetch()
const enabled = ref(false)
const secret = ref('')
const otpauthUrl = ref('')
const qrDataUrl = ref('')
const code = ref('')
const loading = ref(false)
const recoveryCodes = ref<string[]>([])

onMounted(async () => {
  try {
    const result: any = await authFetch('/api/auth/me')
    enabled.value = result.data?.user?.twoFactorEnabled === true
  } catch {}
})

async function setup2fa() {
  loading.value = true
  try {
    const result: any = await authFetch('/api/auth/2fa/setup', { method: 'POST' })
    secret.value = result.data.secret
    otpauthUrl.value = result.data.otpauthUrl
    qrDataUrl.value = await QRCode.toDataURL(otpauthUrl.value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
      color: { dark: '#111827', light: '#ffffff' },
    })
    ElMessage.success('配置已生成，请用验证器扫描二维码后输入验证码启用')
  } catch (error: any) {
    ElMessage.error(error?.data?.message || '生成配置失败')
  } finally {
    loading.value = false
  }
}

async function enable2fa() {
  if (!/^\d{6}$/.test(code.value)) return ElMessage.warning('请输入 6 位验证码')
  loading.value = true
  try {
    const result: any = await authFetch('/api/auth/2fa/enable', { method: 'POST', body: { code: code.value } })
    recoveryCodes.value = result.data?.recoveryCodes || []
    enabled.value = true
    secret.value = ''
    otpauthUrl.value = ''
    qrDataUrl.value = ''
    code.value = ''
    ElMessage.success('2FA 已启用，请保存恢复码')
  } catch (error: any) {
    ElMessage.error(error?.data?.message || '验证码无效')
  } finally {
    loading.value = false
  }
}

async function disable2fa() {
  if (!/^\d{6}$/.test(code.value)) return ElMessage.warning('请输入当前 2FA 验证码')
  loading.value = true
  try {
    await authFetch('/api/auth/2fa/disable', { method: 'POST', body: { code: code.value } })
    enabled.value = false
    code.value = ''
    recoveryCodes.value = []
    ElMessage.success('2FA 已停用')
  } catch (error: any) {
    ElMessage.error(error?.data?.message || '验证码无效')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="security-page">
    <el-card>
      <template #header><h2>账户安全</h2></template>
      <el-alert type="info" :closable="false" title="2FA 使用 TOTP 验证器，启用后登录需要 6 位动态验证码。" />
      <el-descriptions :column="1" border style="margin-top: 18px">
        <el-descriptions-item label="当前状态">{{ enabled ? '已启用' : '未启用' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="!enabled" class="setup">
        <el-button type="primary" :loading="loading" @click="setup2fa">生成 2FA 配置</el-button>
        <template v-if="secret">
          <el-alert type="warning" :closable="false" title="请使用 Google Authenticator、Microsoft Authenticator 或 1Password 扫描二维码。无法扫码时可手动输入 secret。" />
          <div v-if="qrDataUrl" class="qr-panel">
            <img :src="qrDataUrl" alt="2FA TOTP 配置二维码" width="240" height="240" />
            <span>扫码后输入验证器显示的 6 位验证码</span>
          </div>
          <el-input v-model="secret" readonly aria-label="2FA secret" />
          <el-input v-model="otpauthUrl" readonly aria-label="TOTP 配置链接" />
          <el-input v-model="code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" />
          <el-button type="success" :loading="loading" @click="enable2fa">启用 2FA</el-button>
        </template>
      </div>

      <div v-if="recoveryCodes.length" class="recovery">
        <el-alert type="warning" :closable="false" title="恢复码仅显示一次，请立即保存到密码管理器。每个恢复码只能使用一次。" />
        <code>{{ recoveryCodes.join('\n') }}</code>
      </div>

      <div v-else-if="enabled" class="setup">
        <el-input v-model="code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="当前 2FA 验证码" />
        <el-button type="danger" :loading="loading" @click="disable2fa">停用 2FA</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.security-page { max-width: 760px; margin: 0 auto; }
.setup, .recovery { display: grid; gap: 14px; margin-top: 20px; }
.qr-panel { display: grid; justify-items: center; gap: 8px; padding: 18px; background: #f5f7fa; border-radius: 8px; }
.qr-panel img { display: block; width: 240px; height: 240px; image-rendering: pixelated; }
.qr-panel span { color: #606266; font-size: 13px; }
h2 { margin: 0; }
code { white-space: pre-line; padding: 14px; background: #f5f7fa; border-radius: 6px; }
</style>
