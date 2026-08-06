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
- **競品戰略分析** `/admin/strategy`：OpenClaw / NVIDIA NemoClaw 技術解析 + 分身島 SWOT + 差異化路線（文件 `docs/competitive/`）

### 🤖 分身島 Agent（AI 員工辦公室）
- **Agent Loop**（`agent/orchestrator`）：目標 → L1 拆解 → 規劃工具 → 權限判斷（read 自動 / write·dangerous 要批准）→ 執行 → L3 反思 → 收尾；背景執行（關頁照跑）
- **L4 技能合成**：完成的任務**自動蒸餾**成可重複用的「員工」（一鍵採用）；**L5 經理–專才**：拆 ≥3 子任務時派專才並行、經理指派角色、**邊完成邊串流**
- **AI 員工辦公室** `/agent/office`：員工（技能）＋**排程**（cron 員工）＋**自主任務規劃**（員工依職責+歷史+記憶自己決定做什麼）＋待批准佇列＋KPI
- **動態工具來源**：MCP server ＋ **OpenAPI spec →自動變工具**（SSRF 防護）；**共享資料黑板**（agent 間寫 DB 交換 jsonb、不經 LLM）
- **省 token / 治理**：Rule-filter（招呼/重複短路）、Diff 只讀變動（重讀同資源只送差異）、pgvector RAG（撈相似過去任務）、per-agent 每日預算、每任務步數上限
- **語音代理**：麥克風說話 → Web Speech STT → 既有 Agent pipeline → 結果 TTS 朗讀（🗣️ 一般聊天模式、可選音色分組、autoSend）；`client-action` 讓分身站內導航/開頁；不支援自動退回文字（全免費、純瀏覽器）
- **裝置控制**（桌面助手 [`ai-island-bridge`](https://github.com/luffysky/ai-island-bridge)）：本機**檔案 / 瀏覽器(Playwright) / 指令(白名單、預設停用)** + **Android adb**（列裝置/開 App/開網址/Home/Back/截圖）；配對 token + 白名單資料夾、逐項批准、**緊急停止全部**、Node SEA 三平台打包（CI macOS runner 免有 Mac）
- **多通路發起**：LINE `/分身`、手機遙控（Web Push + 跨裝置批准）
- **聊天氣泡 UI**：目標→右側泡泡、分身回覆→左側泡泡；工具箱/思考過程/操作鈕皆可收合
- 對外/破壞性動作**一律逐項批准 + 送出前看草稿全文**（紅線）

### 🔮 每日運勢 / AI 命理
- 星座每日運勢（零 AI 決定性生成、可無限推）+ **塔羅**（78 張三牌陣）+ **八字排盤**（lunar-javascript 正統四柱/五行/十神）+ **易經·梅花易數**（本地起卦）
- **訪客免註冊試玩**（選星座看基本運勢 → 引導註冊解鎖進階）、八字可改生日/時辰/幫別人算、歷史回顧
- LINE 每日推播（Flex 卡）、OG 運勢分享卡、統一付費 gating（`fortune-gate`）

### 🎯 機會島（Opportunity Island）
- 機會雷達（curated RSS→審核佇列，絕不自動捏資料）、多層機會分類、訂閱比對 + 截止提醒 cron
- **AI 三件套**：讀規則 / 適合度分析（缺件）/ 生成報名素材；缺件清單、作品庫、規則變動紀錄、準備量估算

### 📖 程式辭典 & 🧩 互動學習道具
- **程式辭典** `/dictionary`：2300+ 條白話術語（手寫零 API），白話+比喻+範例+相關詞，四語 i18n
- **互動學習道具**：每課可跑的**程式沙盒**（Python 走 Pyodide〔含 numpy/pandas/matplotlib/sklearn〕、其他語言 server sandbox）＋**教具層**（RegexTester / WritingStudio / 判斷題 / 決策樹 / json-tree / 工作流圖…霧面玻璃風格）

### 🛠️ 大眾變現輕工具
- 訊息軍師（難開口的話幫你講好）、AI 求職包（履歷+自傳+面試模擬）、生活助理範本庫
- **每日情報儀表板** `/daily`：讀當下位置的天氣 hero（體感/降雨/濕度/風/日出日落/紫外線·Open-Meteo 免費·lat/lng 不儲存·**快取上次天氣、定位失敗不清空**）+ AI 生活建議 + 每日一句/AI 單字/Tip + 月相 + **農民曆月曆**（國曆格＋每格農曆〔Intl chinese〕＋**西元/民國年**）+ 運勢入口卡 + 今日待辦——「每天打開 AI 島學一點」的入口。
- **每日晨報（LINE 推播）**：☀️天氣生活建議 + 🔮運勢一句 + ✅今天 3 件事，專屬 Flex 晨報卡（零 AI 成本）。天氣須在 **設定 → 精準位置** 啟用（寫 `geo_city`）；未啟用則晨報不帶天氣。

### 🎨 個人化：主題 / 字體 / 背景（Theme Studio，port 自 Space）
- **Theme Studio** `/theme-studio`：任意自訂主題——13 色 token + 字型/表面/效果/動態，live 預覽、~100 內建 preset、a11y 對比檢查、儲存並套用。引擎移植 Space `theme-engine`（`--sr-*`→AI 島 `--color-*`），`effectiveTheme` 執行期推導亮/暗變體。
- **亮暗 × 色盤兩軸**：`data-mode`(亮/暗/跟系統) + `data-palette`(森/海/櫻/薰衣草/珊瑚/薄荷)，header 具名色盤下拉；套用後 **SSR inline 注入、重整不掉、首屏無 FOUC**。
- **字體系統**：25 支字體目錄、**23 支即用**——19 支 Google Fonts + 霞鶩文楷（Google，動態子集 CJK）「找到即裝」零上傳；昭源黑/宋、朱雀仿宋照 Space 從 GitHub 下載**自架**（`scripts/install-cjk-fonts.mjs`→`fonts` bucket）。台北黑/清松手寫無自動來源、走後台 **`/admin/fonts` 上傳安裝器**（.ttf/.otf/.woff/.woff2）。＊主題選字套用：`font-loader` 設 `--font-heading/body/ui`、globals `--font-sans/display` 橋接吃它 → 選字真的套到頁面。
- **背景系統** `/background`：**335 個 canvas 粒子動態場景 + 漸層**（6 類：天氣/星空/自然/慶祝/簡約/城市夜景，純 Canvas-2D、零儲存、prefers-reduced-motion/省電模式自動降級為靜態），一鍵套用、跨裝置同步（`profiles.active_background`）。＊Phase 4b（lottie + 自訂圖片上傳）進行中。
- **選單玻璃可調**：磨砂玻璃選單表面（`.menu-surface`），透明度使用者可調（玻璃↔實色）；手機版外觀（模式/色盤/透明度）收進頭像下拉。
- **可編輯 widget 首頁** `/home`（port 自 Space·MVP）：per-user 可拖拉/縮放/加入/移除的個人儀表板——desktop/tablet 12/8 欄格線、手機單欄，存 `widget_layouts`/`widget_instances`（RLS 自己的才能動）、跨裝置同步。引擎照抄 Space（**無外部拖拉套件、只 zod**）：`grid.ts` 碰撞/重力/斷點推導、8 個 Phase A widget（時鐘/擲骰/倒數/紀念日/農民曆/世界時鐘/待辦/呼吸）。＊待補：齒輪設定（zod 自動表單）、多 layout、Phase B 串資料 widget。

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
| [docs/todo/todo_list_0801.md](docs/todo/todo_list_0801.md) | **現行待辦主檔**（整合全部舊 todo、逐項核對過） |
| [docs/worklog/](docs/worklog/) | 每日工作日誌（最新 `daily_works_0801.md`） |
| [docs/island/分身島規劃待閱.md](docs/island/分身島規劃待閱.md) | 分身島四大工程規劃書（AI 公司世界觀 / Workspace Hub / AI COO / 技能市集） |
| [docs/Platform.md](docs/Platform.md) | AI 島這側對 SnowRealm Platform 整合的看法 |
| [docs/island/](docs/island/) | 分身島 / 機會島規劃與 spec |
| [docs/setup/](docs/setup/) · [docs/payments_setup.md](docs/payments_setup.md) | 老闆手動待辦、cron、金流（綠界/藍新/Stripe）設定 |

---

## 🔒 安全備註

- `.env.local` 內含真實 service_role key / DB 密碼、已 gitignore、**永不 commit**。
- 金鑰輪替（Supabase service_role + DB 密碼）待專案完成後執行。
- OAuth callback 支援 `code` / `token_hash` / hash token 三路徑；profile 建立走 server-side `ensure-profile`。

---

## 📜 授權

Private. © 2026 SnowRealm.
