<script setup lang="ts">
import { ref, reactive } from 'vue'


const authFetch = useAuthFetch()
definePageMeta({ layout: 'admin' })

const router = useRouter()
const saving = ref(false)
const formRef = ref()
const contentRef = ref()
const cursorPos = ref(0)

const form = reactive({
  title: '',
  content: '',
  description: '',
  tags: [] as string[],
  status: 'draft',
})

const rules = {
  title: [{ required: true, message: 'Title is required', trigger: 'blur' }],
  content: [{ required: true, message: 'Content is required', trigger: 'blur' }],
  status: [{ required: true, message: 'Status is required', trigger: 'change' }],
}

const existingTags = ref<{ id: number; name: string }[]>([])

onMounted(async () => {
  try {
    const tags = await authFetch<any[]>('/api/tags')
    existingTags.value = tags.map((t) => ({ id: t.id, name: t.name }))
  } catch {
    // ignore tag fetch errors
  }
})

function onContentSelect(e: Event) {
  const el = e.target as HTMLTextAreaElement
  cursorPos.value = el.selectionStart || 0
}

function handleUploadSuccess(response: any) {
  const url = response.url as string
  const img = `![image](${url})`
  const before = form.content.slice(0, cursorPos.value)
  const after = form.content.slice(cursorPos.value)
  form.content = before + img + after
  cursorPos.value += img.length
  ElMessage.success('Image uploaded')
}

function handleUploadError() {
  ElMessage.error('Image upload failed')
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await authFetch('/api/articles', {
      method: 'POST',
      body: {
        title: form.title,
        content: form.content,
        description: form.description || undefined,
        tags: form.tags,
        status: form.status,
      },
    })
    ElMessage.success('Article created')
    router.push('/admin/articles')
  } catch (e: any) {
    ElMessage.error(e.data?.message || 'Failed to create article')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="article-form-page">
    <div class="page-header">
      <h2>New Article</h2>
      <NuxtLink to="/admin/articles">
        <el-button>Back to list</el-button>
      </NuxtLink>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      label-position="top"
    >
      <el-form-item label="Title" prop="title">
        <el-input v-model="form.title" placeholder="Article title" />
      </el-form-item>

      <el-form-item label="Description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Short description"
        />
      </el-form-item>

      <el-form-item label="Content" prop="content">
        <div class="content-toolbar">
          <el-upload
            action="/api/upload"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >
            <el-button size="small">Insert Image</el-button>
          </el-upload>
        </div>
        <el-input
          ref="contentRef"
          v-model="form.content"
          type="textarea"
          :rows="15"
          placeholder="Article content (Markdown supported)"
          @select="onContentSelect"
          @click="onContentSelect"
          @keyup="onContentSelect"
        />
      </el-form-item>

      <el-form-item label="Tags">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="Select or create tags"
          style="width: 100%"
        >
          <el-option
            v-for="tag in existingTags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.name"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Status" prop="status">
        <el-select v-model="form.status" style="width: 200px">
          <el-option label="Draft" value="draft" />
          <el-option label="Published" value="published" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSubmit">
          Create Article
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.content-toolbar {
  margin-bottom: 8px;
}
</style>
