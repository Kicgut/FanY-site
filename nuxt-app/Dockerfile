# ============================================
# Nuxt 3 + Prisma Dockerfile (Fixed)
# @nuxt/content 依赖 better-sqlite3（原生模块），需要编译工具
# 适用：1.6GB RAM ECS + 4GB Swap
# ============================================

FROM node:22-alpine

WORKDIR /app

# 安装编译工具（better-sqlite3 需要 python3 + make + g++）+ 运行时依赖
RUN apk add --no-cache python3 make g++ sqlite-dev tini sqlite

# 安装 pnpm（版本与本地一致：11.9.0）
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# 先复制依赖清单（利用层缓存）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmrc ./
RUN pnpm install --frozen-lockfile

# 生成 Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# 复制源码
COPY . .

# 构建 Nuxt
RUN npx nuxt build

# 清理：移除编译工具 + 开发依赖 + 缓存
RUN apk del python3 make g++ sqlite-dev &&     pnpm prune --prod &&     rm -rf /tmp/* /app/.nuxt /app/node_modules/.cache /app/.data

# 创建持久化目录
RUN mkdir -p /app/data /app/public/uploads &&     chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/prod.db"
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
COPY scripts/start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh

CMD ["sh", "/app/start.sh"]
