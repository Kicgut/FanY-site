<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'admin' })

const user = ref<{ id: number; name: string; username: string; role: string } | null>(null)

onMounted(() => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    user.value = null
  }
})
</script>

<template>
  <div>
    <h1>Admin Dashboard</h1>

    <el-card v-if="user" style="max-width: 400px; margin-top: 20px">
      <template #header>
        <span>User Info</span>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Name">{{ user.name }}</el-descriptions-item>
        <el-descriptions-item label="Username">{{ user.username }}</el-descriptions-item>
        <el-descriptions-item label="Role">{{ user.role }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>
