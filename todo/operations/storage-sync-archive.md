# 存储、同步与归档

## 1. 缩略图同步

只同步：

```text
visibility=public
status=active
reviewStatus=approved
syncStatus!=synced
```

同步到：

```text
ECS /opt/personal-website/public/uploads/photos/
```

## 2. 原图不同步到 ECS

默认不把原图同步到 ECS。

例外必须人工确认，并记录 audit log。

## 3. 归档

归档动作：

1. 移动原图到 cold-storage。
2. 更新 manifest。
3. 更新 DB：`storageLocation=cold`。
4. 更新 DB：`status=archived`。
5. 记录 audit log。

## 4. 恢复

恢复动作：

1. 从 cold-storage 复制回 local photos。
2. 校验 checksum。
3. 生成缩略图。
4. 必要时同步 ECS。
5. 更新 DB。

## 5. 一致性检查

定期检查：

- DB 有记录但文件不存在。
- 文件存在但 DB 无记录。
- public active 缩略图未同步。
- private/friends 文件意外出现在 ECS。
