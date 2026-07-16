---
title: "Vue vs React 详细对比 —— 从零理解两大前端框架"
created: 2026-07-04 00:00
updated: 2026-07-15 23:29
status: archived
purpose: "Vue 和 React 都是 **前端 UI 框架/库**，用来解决同一个问题："
scope: "v1 阶段"
related: []
tags:
  - learning-notes
---

# Vue vs React 详细对比 —— 从零理解两大前端框架

## 一、它们是什么？

Vue 和 React 都是 **前端 UI 框架/库**，用来解决同一个问题：

> 如何高效地把数据显示到网页上，并在数据变化时自动更新页面。

在它们之前，开发者需要手动操作 DOM（就是用 JavaScript 去改 HTML 内容），非常痛苦。

### 一句话定义

- **React**（Facebook/Meta 出品，2013年）：一个 JavaScript **库**，专注于 UI 渲染
- **Vue**（尤雨溪个人出品，2014年）：一个渐进式 **框架**，提供更多内置功能

---

## 二、核心思想对比

### 2.1 React —— "一切皆 JavaScript"

React 的哲学是：**在 JS 里写 HTML**。

```jsx
// React 组件示例
function Welcome({ name }) {
  const [count, setCount] = useState(0);  // 状态

  return (
    <div>
      <h1>你好, {name}!</h1>
      <p>点击了 {count} 次</p>
      <button onClick={() => setCount(count + 1)}>
        点我
      </button>
    </div>
  );
}
```

特点：
- 用 **JSX** 语法（看起来像 HTML，其实是 JavaScript）
- 逻辑和模板写在一起
- 需要自己引入第三方库处理路由、状态管理等

### 2.2 Vue —— "模板就是模板"

Vue 的哲学是：**HTML、JS、CSS 各归各位**。

```vue
<!-- Vue 组件示例 -->
<template>
  <div>
    <h1>你好, {{ name }}!</h1>
    <p>点击了 {{ count }} 次</p>
    <button @click="count++">点我</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)  // 状态
defineProps(['name'])
</script>

<style scoped>
h1 { color: blue; }
</style>
```

特点：
- 模板就是 HTML（用 `{{ }}` 插值）
- 单文件组件（.vue 文件），结构清晰
- 内置路由、状态管理等官方方案

---

## 三、关键概念逐项对比

### 3.1 模板语法 vs JSX

**Vue 用模板：**
```vue
<p v-if="show">显示我</p>
<ul>
  <li v-for="item in list" :key="item.id">{{ item.name }}</li>
</ul>
```

**React 用 JSX：**
```jsx
{show && <p>显示我</p>}
<ul>
  {list.map(item => <li key={item.id}>{item.name}</li>)}
</ul>
```

> 💡 **初学者感受**：Vue 的 `v-if`、`v-for` 更像写 HTML，直觉友好。
> React 的 JSX 更灵活，但所有逻辑都是 JavaScript 表达式。

### 3.2 状态管理（数据驱动页面变化）

**Vue —— ref / reactive：**
```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)          // 基本类型用 ref
const user = reactive({       // 对象用 reactive
  name: '小明',
  age: 25
})

count.value++                  // 修改时需要 .value
user.age = 26                  // reactive 直接改
</script>
```

**React —— useState：**
```jsx
const [count, setCount] = useState(0)
const [user, setUser] = useState({ name: '小明', age: 25 })

setCount(count + 1)            // 必须调用 set 函数
setUser({ ...user, age: 26 })  // 不能直接改，要创建新对象
```

> 💡 **区别**：Vue 可以直接修改变量（有响应式系统自动追踪），React 必须通过 set 函数触发更新。

### 3.3 组件通信（父子组件传数据）

**Vue —— props + emit：**
```vue
<!-- 父组件 -->
<Child :msg="hello" @update="handleUpdate" />

<!-- 子组件 -->
<script setup>
defineProps(['msg'])
const emit = defineEmits(['update'])
emit('update', newValue)
</script>
```

**React —— props + callback：**
```jsx
// 父组件
<Child msg={hello} onUpdate={handleUpdate} />

// 子组件
function Child({ msg, onUpdate }) {
  onUpdate(newValue)  // 调用父组件传来的函数
}
```

> 💡 几乎一样的思路，只是语法不同。

### 3.4 副作用处理（请求数据、定时器等）

**Vue —— watchEffect / watch：**
```vue
<script setup>
import { ref, watchEffect } from 'vue'
const userId = ref(1)

// 自动追踪依赖，userId 变化时重新执行
watchEffect(async () => {
  const res = await fetch(`/api/user/${userId.value}`)
  // ...
})
</script>
```

**React —— useEffect：**
```jsx
const [userId, setUserId] = useState(1)

useEffect(() => {
  async function load() {
    const res = await fetch(`/api/user/${userId}`)
    // ...
  }
  load()
}, [userId])  // 依赖数组：userId 变化时执行
```

> 💡 **区别**：Vue 自动追踪依赖，不需要手动列。React 需要手动写依赖数组 `[userId]`，漏写了就会出 bug，这是 React 新手最常踩的坑。

---

## 四、生态系统对比

| 维度 | Vue | React |
|------|-----|-------|
| **路由** | Vue Router（官方） | React Router（第三方） |
| **状态管理** | Pinia（官方推荐） | Redux / Zustand / Jotai（多个选择） |
| **SSR 框架** | Nuxt.js（官方） | Next.js（Vercel 出品） |
| **UI 组件库** | Element Plus、Vuetify、Naive UI | Ant Design、MUI、Chakra UI |
| **移动端** | uni-app（跨端，国内流行） | React Native（原生移动应用） |
| **文档质量** | ⭐⭐⭐⭐⭐ 中文文档极好 | ⭐⭐⭐⭐ 英文为主 |
| **学习曲线** | 🟢 较平缓 | 🟡 中等（hooks 概念需理解） |
| **全球市场** | 主要在中国/亚洲流行 | 全球最流行 |

---

## 五、就业与社区

- **React**：全球岗位最多，大厂普遍使用（Meta、Netflix、Airbnb）
- **Vue**：中国市场非常强（阿里、腾讯、百度、美团都在用），中小企业首选
- **趋势**：Vue 3 + Composition API 的写法越来越接近 React Hooks，两者正在趋同

---

## 六、我该选哪个？

### 选 Vue 如果你：
- 🇨🇳 主要在国内发展
- 📖 喜欢清晰的模板语法和完善的中文文档
- 🚀 想快速上手做出东西
- 💼 目标是中小公司或全栈开发

### 选 React 如果你：
- 🌍 想进外企或海外公司
- 🧠 喜欢函数式编程思维
- 📦 需要最丰富的第三方生态
- 💼 目标是大厂前端岗位

### 两者都学！
先精通一个，再学另一个。核心思想相通，切换成本不高。

---

## 七、总结一句话

> **Vue 像"有说明书的乐高"——规则明确，按模板拼装，上手快。**
> **React 像"万能胶水 + 自由积木"——灵活强大，但需要自己决定怎么组合。**

---

*文档创建时间：2026-07-04*
*项目：个人网站搭建 - 学习笔记系列*
