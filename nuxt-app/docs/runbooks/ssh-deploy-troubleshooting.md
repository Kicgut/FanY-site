# SSH / 部署 / 数据库排障记录

## 现象

- `yyh-ubuntu-a` 连接会间歇性超时，偶发 `banner exchange` 失败。
- Ubuntu 公共相册接口曾返回 `500`，日志指向 SQLite 缺少 `main.Album`。
- ECS 容器本身运行正常，但 Ubuntu 站点当时只启动了应用，没有先完成数据库就绪。

## 已确认的链路

- 本机通过 ECS 的 `ssh` 再转发到 Ubuntu。
- Ubuntu 站点由 FRP 暴露在本地转发端口。
- ECS 侧容器健康检查正常，问题不在 ECS 应用本身。

## 已排除的方向

- 代码逻辑导致的公开相册 500：已通过数据库修复验证为 false。
- ECS 运行异常：容器状态为 `running healthy`。
- Ubuntu 站点未启动：已能通过 `curl http://127.0.0.1:3000/api/albums/public` 正常返回。

## 真实根因

Ubuntu 站点当时使用了错误或不一致的 SQLite 文件，导致应用读到的库里没有 `Album` 表。修复方式不是改接口，而是让运行中的应用指向正确的数据库文件，并同步数据库文件状态。

## 恢复步骤

1. 确认 Ubuntu 上站点实际工作目录。
2. 检查 `.env` 的 `DATABASE_URL` 是否指向当前实例正在使用的 SQLite 文件。
3. 检查 `prisma/dev.db`、`dev.db` 以及构建产物内可能引用到的数据库文件是否一致。
4. 必要时重新同步数据库文件，再重启站点进程。
5. 用 `curl /api/albums/public` 验证不再返回 500。

## SSH 不稳定时的处理

- 用短超时重试，不要手工连续盯着一条失败命令。
- 优先验证 ECS，再穿透到 Ubuntu。
- 如果 `yyh-ubuntu-a` 失败，先测试 `yyh-ecs`，再测试 Ubuntu 端口转发链路。

## 当前状态

- Ubuntu 公共相册接口已恢复正常响应。
- ECS 容器健康。
- 本地仓库已清理掉手工打出来的旧 tar/gz 部署包。
