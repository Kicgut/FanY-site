---
title: "作品集内容模型与展示规范"
status: final
---
# 作品集内容模型与展示规范

作品集不是照片列表，而是可承载项目、图文笔记、视频说明和外部链接的内容资产。

数据来源为 Prisma `Portfolio`：

- `title` / `description`：卡片和 SEO 摘要。
- `content`：Markdown 富文本正文，可包含标题、段落、图片、视频嵌入说明和链接。
- `coverImage`：卡片封面。
- `category` / `tags`：内容分类与筛选标签。
- `link`：项目演示、仓库或视频链接。
- `status=published` 且 `reviewStatus=approved` 才出现在前台。

前台路由：`/portfolio` 列表、`/portfolio/:slug` 详情。照片相册独立使用 `/albums`，不得复用 `/api/photos` 作为作品集主数据源。

## 发布流程

后台内容流水线创建 `contentType=portfolio` 的候选内容，审核通过后发布为 `Portfolio`。正文目前采用 Markdown，后续如接入编辑器，编辑器输出仍需保存为受控 Markdown/HTML，并在服务端进行清洗。
