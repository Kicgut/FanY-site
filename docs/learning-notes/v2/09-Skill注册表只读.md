---
title: "Phase 9：Skill 注册表只读"
created: 2026-07-05
updated: 2026-07-05
status: final
purpose: "| 验收标准 | 状态 |"
scope: "v2 阶段"
tags:
  - learning-notes
---

# Phase 9：Skill 注册表只读

## 📋 完成情况总览

| 验收标准 | 状态 |
|---------|------|
| Skill 扫描服务 | ✅ |
| Skill 列表 API | ✅ |
| Skill 详情页面 | ✅ |
| 只读展示（不能编辑） | ✅ |

## 📖 核心概念：服务注册与发现

**类比：** Skill 注册表就像公司通讯录——每个人（Skill）都有自己的信息，你可以查看但不能修改别人的信息。

### 什么是 Hermes Skill？

```
Hermes Skill = 一段可复用的知识或流程

例如：
  - github-pr-workflow: PR 提交流程
  - dockerfile-authoring: Dockerfile 编写规范
  - phase-executor: 阶段执行器

每个 Skill 是一个目录：
  ~/.hermes/skills/
  ├── github-pr-workflow/
  │   ├── SKILL.md          ← 主文档（含 frontmatter）
  │   ├── references/       ← 参考资料
  │   └── templates/        ← 模板文件
  └── dockerfile-authoring/
      ├── SKILL.md
      └── templates/
```

## 💻 代码解读

### Skill 扫描服务

```typescript
// server/services/skill-registry.ts

import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

function getSkillsDir(): string {
  return join(homedir(), '.hermes', 'skills')
}

/** 解析 SKILL.md 的 YAML frontmatter */
function parseFrontmatter(content: string): SkillFrontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return null

  const lines = match[1].split('\n')
  const result: Record<string, any> = {}
  let currentKey = ''
  let inArray = false
  let arrayItems: string[] = []

  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)/)
    if (kvMatch) {
      // 处理上一个数组
      if (inArray && currentKey) {
        result[currentKey] = arrayItems
        inArray = false
        arrayItems = []
      }
      const [, key, value] = kvMatch
      currentKey = key
      if (value.trim() === '') {
        inArray = true
      } else {
        result[key] = value.trim().replace(/^["']|["']$/g, '')
      }
    } else if (inArray && line.trim().startsWith('- ')) {
      arrayItems.push(line.trim().slice(2))
    }
  }

  // 处理最后一个数组
  if (inArray && currentKey) {
    result[currentKey] = arrayItems
  }

  return result as SkillFrontmatter
}

export async function scanSkills(): Promise<ScannedSkill[]> {
  const skillsDir = getSkillsDir()
  const skills: ScannedSkill[] = []

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = join(skillsDir, entry.name)
      const mdPath = join(skillPath, 'SKILL.md')

      try {
        const content = await readFile(mdPath, 'utf-8')
        const frontmatter = parseFrontmatter(content)

        if (frontmatter) {
          skills.push({
            ...frontmatter,
            path: skillPath,
          })
        }
      } catch {
        // SKILL.md 不存在或无法读取，跳过
      }
    }
  } catch {
    // skills 目录不存在
  }

  return skills
}
```

**关键点：正则表达式解析 YAML**
```typescript
const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
// ^---      匹配开头的 ---
// \s*\n     匹配换行
// ([\s\S]*?) 非贪婪匹配任意字符（包括换行）
// \n---     匹配结尾的 ---

为什么不用 YAML 解析库？
1. frontmatter 格式简单，正则够用
2. 不需要额外依赖
3. 性能更好
```

### 只读 API

```typescript
// server/api/hermes/skills/index.get.ts
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !requireAdmin(user)) {
    throw createError({ statusCode: 403, message: '需要管理员权限' })
  }

  const query = getQuery(event)
  const category = query.category as string | undefined

  const skills = await scanSkills()

  // 按分类过滤
  const filtered = category 
    ? skills.filter(s => s.category === category)
    : skills

  return {
    success: true,
    data: {
      skills: filtered,
      total: filtered.length
    }
  }
})
```

**为什么是只读？**
```
AGENTS.md 规定：
"Hermes 相关实现必须经过 gateway，不得直接从公网访问 Hermes 主进程"
"让 Hermes 自动修改已固化 skill 源文件" 是禁止行为

所以：
✅ 可以远程查看 Skill 列表
❌ 不能远程编辑/删除 Skill（防止恶意修改）
```

## 🔍 对比与选型

### 服务发现方案对比

| 方案 | 原理 | 优点 | 缺点 | 适合 |
|------|------|------|------|------|
| 文件扫描 | 扫描目录读取文件 | 简单、无依赖 | 性能差 | 小项目 |
| 注册中心 | 服务主动注册 | 实时、可靠 | 需要额外服务 | 微服务 |
| DNS | 域名解析 | 标准、成熟 | 不灵活 | 基础设施 |
| 配置文件 | 手动维护列表 | 简单 | 需要手动更新 | 静态配置 |

**为什么选文件扫描：** Skills 是本地文件，扫描目录最简单直接，不需要引入注册中心。

### 配置解析方式对比

| 方式 | 优点 | 缺点 | 适合 |
|------|------|------|------|
| 正则表达式 | 无依赖、快 | 不支持嵌套 | 简单格式 |
| YAML 解析库 | 功能全 | 需要依赖 | 复杂 YAML |
| JSON | 原生支持 | 不够灵活 | 配置文件 |
| TOML | 可读性好 | 需要库 | Rust 生态 |

**为什么用正则：** SKILL.md 的 frontmatter 格式固定（键值对 + 简单数组），正则足够。

### 前端展示方式对比

| 方式 | 适合 | 优点 | 缺点 |
|------|------|------|------|
| 表格 | 结构化数据 | 信息密度高 | 不够直观 |
| 卡片列表 | 内容展示 | 视觉友好 | 信息密度低 |
| 树形 | 层级结构 | 结构清晰 | 实现复杂 |
| 标签页 | 分类展示 | 组织清晰 | 需要分类 |

**本项目选择卡片列表：** Skills 有名称、描述、分类、标签，卡片展示最直观。

## 🏷️ 人格标签

**本阶段你是：档案管理员** — 整理 Skills 目录，提供查阅服务

## ➡️ 下一阶段预告

Phase 10：本地管理员高信任 — 本地 IP 的管理员有更高权限，远程不能删除/执行

## 📚 延伸阅读

- [正则表达式教程](https://regexone.com/)
- [服务发现模式](https://microservices.io/patterns/service-discovery.html)
- [Hermes Skills 文档](https://hermes-agent.nousresearch.com/docs)
