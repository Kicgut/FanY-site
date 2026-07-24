# 生产冒烟门禁

发布后在 ECS 执行：

```bash
BASE_URL=http://127.0.0.1:3000 /opt/personal-website/scripts/production-smoke.sh
```

该脚本验证首页、后台安全页、Jobs 页可访问，并验证认证边界：未登录请求 `/api/auth/me`、2FA 配置、Jobs、Storage 一律返回 401。若容器存在 Docker healthcheck，还会要求状态为 `healthy`。脚本失败时禁止继续切换流量或删除 rollback 镜像。
