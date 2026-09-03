# syntax=docker/dockerfile:1
# 多階段 build：產出 Next.js standalone 精簡 image
# 用 Debian slim（非 alpine）避免 sharp / 原生套件在 musl 上的相容問題

# ============ 1. 安裝依賴 ============
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# 帶上 .npmrc（含 legacy-peer-deps + fetch-retry 設定）→ npm ci 才吃得到、否則 tiptap peer 衝突會讓 npm ci 掛
COPY package.json package-lock.json .npmrc ./
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
ARG NEXT_PUBLIC_GIPHY_API_KEY
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
    NEXT_PUBLIC_GIPHY_API_KEY=$NEXT_PUBLIC_GIPHY_API_KEY \
    NEXT_TELEMETRY_DISABLED=1

# server 端 secret：SSG 預渲染 /forum 等公開頁時要用 admin client 撈資料。
# 只在 builder 階段、不會進最終 image（runner 不繼承此 ENV、也只 COPY 產物）。
ARG SUPABASE_SERVICE_ROLE_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 專案已大（80 章 JSON + 補助文全文 bundle + 四語 messages…）→ 預設 2GB heap 會 OOM(exit 134)。
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ============ 3. runtime ============
FROM node:22-bookworm-slim AS runner
WORKDIR /app
# 部署版本資訊（/api/version 用）；由 docker.yml build-arg 帶 github.sha 進來。
ARG APP_COMMIT=dev
ARG APP_BUILT_AT
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    APP_COMMIT=$APP_COMMIT \
    APP_BUILT_AT=$APP_BUILT_AT

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

# ---- 分身島 L2 伺服器瀏覽器（選配，預設關）----
# 預設不裝 → 這段完全跳過、image 與部署跟以前一模一樣、零風險。
# 要開：Zeabur build arg 設 INSTALL_SERVER_BROWSER=1（裝 Chromium + 系統相依）＋ runtime env ENABLE_SERVER_BROWSER=1。
# 版本自動對齊 image 內 trace 到的 playwright-core；裝在 root 階段、runtime 由 nextjs 唯讀取用。
ARG INSTALL_SERVER_BROWSER=
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# WARNING 絕對不要在 /app 直接 `npm i playwright`：standalone 產出的 /app/package.json 是
# 「整包專案」的（上百個 deps），但 /app/node_modules 只有 trace 過的 ~38 個 ->
# npm 會想把整棵樹重裝，而且 runner 階段沒有 .npmrc（legacy-peer-deps）-> tiptap peer
# 衝突 ERESOLVE、exit 1，整個 image build 掛掉（0904 的 buildx 失敗就是這個）。
#
# 正解：playwright 的 JS 套件本來就被 trace 進 /app/node_modules 了（runtime 的
# `import("playwright")` 直接可用），這裡缺的只有「瀏覽器二進位 + 系統相依」。
# 所以在 /opt/pw 開一個獨立小專案、只為了跑它的下載器，版本跟 image 內的
# playwright-core 對齊（免得 browsers revision 對不上），裝完就刪、只留 /ms-playwright。
#
# 而且這步失敗不該擋部署：browser.render 在 tools.ts 已經 graceful（抓不到瀏覽器就
# 回「請改用 web.research / web.fetch」）-> 整段包在 `|| echo` 裡、永遠不讓 build 變紅。
RUN if [ -n "$INSTALL_SERVER_BROWSER" ]; then \
      ( PW_VER="$(node -p "require('/app/node_modules/playwright-core/package.json').version")" \
        && [ -n "$PW_VER" ] \
        && echo "[server-browser] image 內的 playwright-core = $PW_VER" \
        && mkdir -p /opt/pw && cd /opt/pw \
        && echo '{"name":"pw-installer","private":true}' > package.json \
        && npm i "playwright@$PW_VER" --no-audit --no-fund \
        && ./node_modules/.bin/playwright install --with-deps chromium \
        && cd / && rm -rf /opt/pw /var/lib/apt/lists/* /root/.npm \
        && chown -R nextjs:nodejs /ms-playwright \
        && echo "[server-browser] OK chromium 安裝完成" ) \
      || echo "[server-browser] WARN 安裝失敗、跳過（image 照樣可用；browser.render 會自動退回 web.fetch）"; \
    else echo "[server-browser] skip (INSTALL_SERVER_BROWSER unset)"; fi

USER nextjs
EXPOSE 3000

# standalone 產出的 server.js（會讀 PORT / HOSTNAME）
CMD ["node", "server.js"]
