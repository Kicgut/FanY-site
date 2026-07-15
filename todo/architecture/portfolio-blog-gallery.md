# Blog / Portfolio / Gallery 架构边界

## 1. Blog

用途：长文、技术笔记、生活思考、架构文档。

存储：

```text
content/blog/*.md
```

生成方式：

- 手写。
- Hermes 从对话生成 candidate。
- 审核后发布。

## 2. Gallery

用途：照片画廊和照片资产展示。

特点：

- 时间、地点、EXIF。
- 相册。
- 权限。
- 原图下载。
- public/friends/private。

路由：

```text
/gallery
/gallery/:id
/friends/photos
/friends/albums
```

## 3. Portfolio

用途：项目和精选作品展示。

包括：

- code project。
- design。
- photography selected works。
- system architecture。
- writing series。

路由：

```text
/portfolio
/portfolio/:slug
```

## 4. 摄影精选如何进入 Portfolio

照片或相册审核时可选择：

```text
promoteToPortfolio = true
category = photography
```

生成 Portfolio 记录，关联相册或精选照片。

## 5. Hermes 生成内容

Hermes 只能生成：

```text
Blog candidate
Portfolio candidate
Gallery note candidate
```

不能直接发布。
