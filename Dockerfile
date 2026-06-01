# syntax=docker/dockerfile:1
# 多階段 build：產出 Next.js standalone 精簡 image
# 用 Debian slim（非 alpine）避免 sharp / 原生套件在 musl 上的相容問題

# ============ 1. 安裝依賴 ============
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============ 2. build ============
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# NEXT_PUBLIC_* 會在 build 階段被 inline 進前端 bundle，必須當 build args 傳進來。
# Zeabur 會自動把 service 的環境變數注入成 build args。
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_ADMIN_SLUG
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_GTM_ID
ARG NEXT_PUBLIC_LINE_CHANNEL_ID
ARG NEXT_PUBLIC_CONTENT_SOURCE
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_ADMIN_SLUG=$NEXT_PUBLIC_ADMIN_SLUG \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID \
    NEXT_PUBLIC_LINE_CHANNEL_ID=$NEXT_PUBLIC_LINE_CHANNEL_ID \
    NEXT_PUBLIC_CONTENT_SOURCE=$NEXT_PUBLIC_CONTENT_SOURCE \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID=$NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============ 3. runtime ============
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# 非 root 執行
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# public（圖片 / 靜態資源）
COPY --from=builder /app/public ./public
# standalone server（含 trace 過的最小 node_modules）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 靜態產物
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 章節 / 副本資料：content.ts 在 runtime 用 fs 從 process.cwd()/src/data 讀（DB 失敗時的 fallback）
COPY --from=builder --chown=nextjs:nodejs /app/src/data ./src/data

USER nextjs
EXPOSE 3000

# standalone 產出的 server.js（會讀 PORT / HOSTNAME）
CMD ["node", "server.js"]
