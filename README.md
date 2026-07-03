# 🏝️ AI 島 v3 — Next.js 全端養成班 + 創作者島嶼

從靜態 HTML 升級成完整 Next.js 15 + Supabase 應用：**80 章免費課程 + 遊戲化學習引擎 + 綠寶 AI 導師 + 部落格 / 討論區 + 創作者島嶼（AI 內容工作室）+ Z 幣 / Pro 金流 + RBAC 後台 ERP**。

> 由 SnowRealm 生態製作 · 招財 🐹 守護
> 線上站點：**[ai-island-web.snowrealm.pet](https://ai-island-web.snowrealm.pet)**

---

## ✨ 功能總覽

### 🎯 學習引擎（課程全免費）
- **80 章節 JSON / 1200+ lessons**（活資料化進 Supabase `chapters` / `lessons`）、單章可 30+ lessons
- **遊戲化**：XP / Level（公式 `floor(sqrt(xp/100))+1`、上限 Lv 60，`level` 為 DB generated column）、連勝 streak、內建成就（4 階稀有度）、Z 幣經濟、5 hearts、Boss Battle
- **每日簽到**（`do_checkin` RPC + 7 天格子）、**每日任務**、**每日測驗**（章節 miniQuiz + leetcode 題庫雙邊抽）
- **SRS 間隔複習**（`/me/review`）+ **章節內 AI 隨堂考 PopQuiz** + **AI 學習教練**（每日 cron 產生個人化建議）
- 自由筆記（資料夾 / 便利貼 / SRS）、書籤、閱讀進度、公開證書頁（`/certificates/[code]` + OG 圖）
- **6 大職業路線** + **求職閉環**：`/me/career-path` 漏斗、作品集 `/portfolio`

### 🧠 綠寶導師（AI Tutor）與智慧 AI 架構
- 多模型（Claude / GPT / Gemini / Llama 等）+ 章節 context 自動注入、語氣切換、stream 回覆、對話歷史、語音輸入/輸出
- **AI 路由器**（`ai-router` / `resolve-usage-ai`）：per-usage 候選鏈 + fallback + 升級 + 熔斷器（circuit breaker）
- **免費供應商**：Cloudflare Workers AI、可選 **WebLLM**（瀏覽器端本地推論，flag 控制）
- **AI 記憶**（`user-ai-memory` / `ci_memories`）、語意搜尋（embeddings）、意圖辨識（`ai-intent`）
- 免費 quota（per-model `free_tier_daily_limit`）+ admin 無限額度特權
- **BYOK**：使用者自帶各家 API key（`/settings/ai-keys`，DB 加密存放、不收手續費）
- 月預算追蹤、單支模型啟用 / 停用 / 設預設 / 成本監控

### 🎨 創作者島嶼（Creator Island — AI 內容工作室）
- **碎片系統**：10,000+ 碎片庫（`ci_fragment_pool`）、建工作室自動抽 300、碎片搜尋
- **演化 / 編織**：多碎片演化多碎片、AI 全選、編織成完整作品（解決「東一塊西一塊」的融合問題）
- **創作引擎**（`creator-engine`）：drafts / works / series / stories / collections / workflows / lineage 血統
- **市集**（`ci_listings` / marketplace）、**社群**（貼文 / 留言 / 追蹤 / 好友 / DM / 動態）
- **Yjs 即時協作**（Supabase Realtime broadcast + presence，opt-in）
- **工作室錢包**（`ci_workspace_wallet`）、成員邀請、工作室層級 AI 設定與 RBAC（與後台權限分離）
- **一鍵發佈**到各大平台（草稿 → 公開頁 / 外部平台）

### 💳 金流（Z 幣儲值 + Pro 訂閱）
- **三家金流可選**：綠界 ECPay、藍新 NewebPay、Stripe（使用者結帳時選）
- **Z 幣**：1:10（NT$1 = 10 Z 幣）、儲值越多送越多的階梯包
- **Pro**：月 149 / 年 1490
- 冪等下單 / 出貨（`orders` + `coin_transactions`，防重複發放 + 金額比對防竄改）
- 完整 Z 幣經濟：所有來源 / 消耗 / ledger（`/store`、`/pricing`）

### 📝 部落格系統
- TipTap 3 富文字編輯器（AI BubbleMenu / Slash 指令 / Callout 等升級 + lowlight 語法高亮）
- 文章 / 系列 / 留言（threaded）/ emoji reaction / 按讚
- **AI 輔助 SEO + GEO**、全文搜尋、訂閱（unsubscribe token）、RSS feed
- AI 寫作助手（接綠寶同一套 model / key pool）

### 💬 討論區
- 多個 boards（依 `post_role` 控管發文權限）
- Thread / Reply / Reaction / Like / 採納解答 / 設精華
- 全文搜尋、個人頁、Forum XP 引擎（發串 +15、回覆 +5、採納 +30、精華 +50）

### 📢 通知與通訊機器人
- **LINE / Discord / Telegram** 三軟體（學員 + 管理員）指令 + 通知，全部美化成一致風格
- **Web Push**（VAPID）：訂閱 / 退訂 / streak 提醒 cron
- 站內通知、email 廣播、營運告警（`ops-alerts`）

### 🎨 SEO & 分享
- 自製 OG 圖（chapter / dungeon / cert 各一支 route，next/og）
- Sitemap / robots / llms.txt 自動產生
- **robots.txt AI 爬蟲白名單**：GPTBot / ClaudeBot 等只允許 `/chapters`、`/courses`、`/blogs`；`/api`、`/admin`、`/me`、`/settings`、`/auth` 全擋
- SEO 後台逐頁編輯 title / description / keywords / OG / canonical / robots / hreflang + schema.org JSON-LD
- 推薦分潤（referral，雙方 +50 Z 幣）、精選創作者

### 🔐 會員 & 認證
- Email / 密碼 + Google OAuth + LINE OAuth
- Server-side `ensure-profile` 自動建 profile（避開 RLS）、singleton browser client、雙路徑 callback
- Cookie banner + 隱私 / 條款 / Cookie 三頁 + GDPR 匯出 / 刪除

### 👑 後台（隱碼路由 + RBAC）
- 路徑用 `ADMIN_SLUG` 混淆（middleware rewrite），直接訪問 `/admin/*` 一律 404
- **RBAC 角色**（`admin-roles`）：客服 support（工單/客服）、行銷 marketing、財務 finance（金流）、內容 content（章節/審核）、**超管 admin**（全部）；owner / admin 恆可存取，`ownerOnly` 頁面保留
- **P1 營運總覽**、**P2 告警**、**P3 金流工作台**
- **Cmd+K 命令面板**、**Feature Flags** 管理、**AI 助理**（自然語言 → 白名單指標，非任意 SQL）
- ERP：訂單 / 訂閱 / CRM 工單 / 廣播；AI 管理：模型 / key / 使用量 / 對話
- 內容：章節 / 成就 / SEO / redirects；遊戲化：Z 幣 ledger
- GA4 儀表板 + 站內第一方互動分析（即時在線 / 頁面停留 / scroll / 完成率）
- 合規：Audit log 全覆蓋、外洩事件 72h 通報倒數

---

## 🛠️ 技術棧

| 類別 | 選用 |
|---|---|
| 框架 | Next.js 15（App Router）+ React 19 |
| 樣式 | Tailwind v4 + custom design tokens |
| DB / Auth | Supabase（Postgres + Auth + RLS + RPC） |
| Client SDK | `@supabase/ssr` + `@supabase/supabase-js` 2.x |
| 編輯器 | TipTap 3.x + lowlight |
| 協作 | Yjs + Supabase Realtime（broadcast + presence） |
| AI | Anthropic / OpenAI / Google / Cloudflare Workers AI / WebLLM（prompt caching） |
| 金流 | 綠界 ECPay / 藍新 NewebPay / Stripe |
| 推播 | Web Push（VAPID） |
| Charts / 動畫 | recharts / framer-motion / canvas-confetti |
| Icons | lucide-react（emoji 已全站 icon 化） |
| 測試 | Vitest（單元）+ Playwright（E2E） |
| OG image | next/og（ImageResponse） |
| 部署 | GHCR prebuilt image → Zeabur（standalone `node server.js`）+ Cloudflare |

---

## 🚀 Quick Start

```bash
npm install
# 建 .env.local（見下方環境變數；完整清單見 docs/OWNER_SETUP.md）
npm run dev            # → http://localhost:3000
# Windows 本機若 Node fetch 報 TLS：NODE_OPTIONS=--use-system-ca npm run dev
```

### 環境變數（最小集）
```env
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres.<ref>:<pwd>@aws-...pooler.supabase.com:6543/postgres?pgbouncer=true

# 站點 / 後台
NEXT_PUBLIC_SITE_URL=https://ai-island-web.snowrealm.pet
ADMIN_SLUG=console-x7k2

# 選用：GA4 / cron / Web Push / AI / 金流 … 完整清單見 docs/OWNER_SETUP.md
```

> **金流金鑰**（`ECPAY_*` / `NEWEBPAY_*` / `STRIPE_*` / `PAYMENTS_LIVE`）與 **VAPID** 設定見
> [`docs/OWNER_SETUP.md`](docs/OWNER_SETUP.md)（手動待辦 + env 總清單）與 [`docs/payments_setup.md`](docs/payments_setup.md)。

---

## 📜 npm scripts

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` | Production build |
| `npm run start` | 啟動 build 後的伺服器 |
| `npm run lint` | ESLint |
| `npm run test` | Vitest 單元測試（金流簽章 / 冪等 / RBAC / robots …） |
| `npm run test:e2e` | Playwright E2E 點擊測試 |
| `npm run db:apply` | 套用 Supabase migration（dollar-quote 感知 SQL splitter） |
| `npm run git:push` | 整理過的 commit + push 助手 |

### ⚠️ 改章節內容一定要同步進 DB
前台章節是讀 **Supabase**、JSON 只是 fallback。改完 `src/data/chapters/*.json` 後必跑：
```bash
node scripts/import_chapters_to_db.mjs        # 全部 upsert 進 chapters + lessons
node scripts/import_chapters_to_db.mjs ch79   # 只同步指定章
```
`sort_index` 一定要同步（衍生章 Ch28a/b/c 排序靠它）。詳見 `CLAUDE.md`。

---

## 🧪 測試 & CI/CD

- **單元測試（Vitest）**：金流三家簽章驗證（ECPay CheckMacValue / NewebPay AES+TradeSha / Stripe）、下單冪等 + 金額防竄改、Z 幣、RBAC 權限矩陣、robots 白名單、AI 供應商 / 意圖、章節顯示編號等。**必須全綠**。
- **E2E（Playwright）**：首頁 / 章節 / 搜尋 / 公開頁 / RWD / SEO / auth-gated。
- **GitHub Actions**：`ci.yml`（lint → typecheck → 單元測試 → build）、`e2e.yml`，另有 `docker.yml`（build + 推 GHCR + 自動重部署 Zeabur）與多支 cron（`ops-alerts` / `learning-coach` / `streak-reminder` / `anomaly-check` / `kpi-email` / `line-daily` …）。
- CI build 需帶 `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`（否則 server component prerender 建 Supabase client 會炸）；需登入的頁面已加 `export const dynamic = "force-dynamic"`。

---

## 📁 檔案結構（重點）

```text
src/
├── app/
│   ├── admin/            # 後台（RBAC + 隱碼 rewrite）
│   ├── api/              # 350+ route：ai / blog / forum / payments / push / creator-island / cron …
│   ├── creator-island/   # 創作者島嶼（碎片 / 演化 / 編織 / 市集 / 社群 / 引擎）
│   ├── store/, pricing/  # Z 幣儲值 + Pro 結帳
│   ├── chapters/[id]/     # 章節閱讀（讀 DB）
│   ├── courses/[slug]/    # AI 副本 dungeon
│   ├── me/, profile/, settings/  # 個人（含 /settings/ai-keys BYOK）
│   ├── certificates/, portfolio/, career/  # 證書 / 作品集 / 職涯
│   ├── blogs/, forum/, leaderboard/, search/
│   └── robots.ts, sitemap.ts, llms.txt, manifest.ts
├── components/           # AITutorWidget / blog(TipTap) / forum / chapter / creator / push …
├── lib/
│   ├── payments/         # config / orders / gateways(ecpay,newebpay,stripe) / index
│   ├── creator-engine/   # fragments / works / evolve / marketplace / social / dm / lineage …
│   ├── collab/           # Yjs over Supabase Realtime
│   ├── ai-router.ts, resolve-usage-ai.ts, ai-usage-models.ts, ai-providers.ts
│   ├── admin-roles.ts, admin-guard.ts   # RBAC
│   ├── zcoin.ts, web-push.ts, srs.ts, learning-coach.ts, referral.ts
│   └── supabase*.ts, content.ts, gamification.ts …
├── data/chapters/        # 80 個章節 JSON（fallback 來源，改完要 import 進 DB）
└── middleware.ts         # admin slug rewrite + x-admin-path + session refresh
supabase/                 # schema + 150+ migration（含 ci_* 創作者島嶼表）
tests/  e2e/              # Vitest 單元 + Playwright E2E
docs/   scripts/          # 文件 + 內容匯入 / 部署腳本
```

---

## 🎯 部署（GHCR + Zeabur）

- push `main` → `docker.yml` 用 `Dockerfile`（standalone、`CMD node server.js`）build → 推 `ghcr.io/luffysky/ai-island-web:latest` → GraphQL `restartService` 自動重部署。
- Zeabur 服務設 **Prebuilt Image**（繞開 zbpack 偶發只跑 Caddy 靜態的雷）、Port 3000、runtime env 貼 `.env.local`。
- DB 改完即時生效（`/chapters` force-dynamic、`/chapters/[id]` revalidate=60），不用 rebuild。
- 細節見 `CLAUDE.md` 部署段 + 記憶 `deploy-zeabur-ghcr-fallback`。

---

## 📚 內部文件導覽

| 文件 | 用途 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 專案最重要的雷（DB vs JSON、1000 筆截斷、部署 fallback、內容生成） |
| [docs/OWNER_SETUP.md](docs/OWNER_SETUP.md) | 老闆手動待辦 + env 總清單（金流 / VAPID / cron） |
| [docs/payments_setup.md](docs/payments_setup.md) | 綠界 / 藍新 / Stripe 設定步驟 |
| [docs/daily_works_0704.md](docs/daily_works_0704.md) | 最新工作日誌（含測試 / CI 段） |
| [docs/MASTER_TODO.md](docs/MASTER_TODO.md) | 路線圖與進度 |
| [docs/RULE/](docs/RULE/) | 協作 / sprint / lock 規則 |

---

## 🔒 安全備註

- `.env.local` 內含真實 service_role key / DB 密碼、已 gitignore、**永不 commit**。
- 金鑰輪替（Supabase service_role + DB 密碼）待專案完成後執行。
- OAuth callback 支援 `code` / `token_hash` / hash token 三路徑；profile 建立走 server-side `ensure-profile`。

---

## 📜 授權

Private. © 2026 SnowRealm.
