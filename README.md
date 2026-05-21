# 🏝️ AI 島 v3 — Next.js 全端養成班

把 AI 島從靜態 HTML 升級成完整 Next.js + Supabase 應用 — 60 章課程、會員系統、遊戲化引擎、AI 學習導師、部落格、討論區、後台 ERP / GA4 / 互動分析。

> 由 SnowRealm 生態製作 · 招財 🐹 守護

---

## ✨ 功能總覽

### 🎯 學習引擎
- **60 章節 / 70 個內容 JSON**、單章可 30+ lessons（持續寫作中）
- **遊戲化**：XP / Level（公式 `floor(sqrt(xp/100))+1`、上限 Lv 60）、連勝（streak）、25 個內建成就（4 階稀有度）、Z-coin 經濟、5 hearts、Boss Battle
- **每日簽到**（`do_checkin` RPC + 7 天格子 UI）
- **每日任務、自由筆記、書籤、證書**
- **6 大職業路線**：前端 / 全端 / AI / 資料 / 接案 / Indie

### 🧠 綠寶導師（AI Tutor）
- 多模型（Claude / GPT / Gemini / Llama 等 7 個 active 模型）
- 免費 quota（per-model `free_tier_daily_limit`）+ admin 無限額度特權
- BYOK（使用者自帶 API key）
- 對話歷史、章節 context 自動注入、語氣切換、stream 回覆
- 月預算追蹤、可單支模型啟用 / 停用 / 設預設

### 📝 部落格系統
- TipTap 富文字編輯器（17 個 extension + lowlight 語法高亮）
- 文章 / 系列 / 留言（threaded）/ emoji reaction / 按讚
- 全文搜尋、訂閱（含 unsubscribe token）、RSS feed
- AI 寫作助手（接綠寶同一套 model / key pool）

### 💬 討論區
- 11 個初始 boards（依 `post_role` 控管發文權限）
- Thread / Reply / Reaction / Like / 採納解答 / 設精華
- 全文搜尋、個人頁、Forum XP 引擎（發串 +15、回覆 +5、採納 +30、精華 +50）

### 🎨 SEO & 分享
- 自製 OG 圖（chapter / dungeon 各一支 route，next/og）
- Sitemap 自動產生
- SEO 後台可逐頁編輯 title / description / keywords / OG / canonical / robots / hreflang
- 結構化資料（schema.org JSON-LD）

### 🔐 會員 & 認證
- Email / 密碼 + Google OAuth + LINE OAuth
- Server-side `ensure-profile` 自動建 profile（避開 RLS 寫入問題）
- Singleton browser client、雙路徑 callback（`code` / `token_hash` / hash token）
- 角色制（member / editor / admin）+ ban 機制
- Cookie banner + 隱私 / 條款 / Cookie 三頁

### 👑 後台（隱碼路由）
- 路徑用 `ADMIN_SLUG` 混淆（middleware rewrite `/<slug>/admin/*` → `/admin/*`）
- 直接訪問 `/admin/*` 一律 404，無洩漏
- **總覽**：使用者 / lesson 完成 / Quiz / 訂單 / 工單 / MRR / AI 成本 30 天趨勢
- **ERP**：訂單、訂閱、CRM 工單、廣播
- **AI 管理**：模型 / API key / 使用量 / 對話紀錄
- **內容**：章節、成就、SEO、redirects
- **遊戲化**：Z-coin ledger（唯讀）
- **GA4 儀表板**：sync + iframe（需設 GA4 env）
- **互動分析**：站內第一方追蹤、即時在線、24h 頁面停留 / scroll / 完成率
- **合規**：Audit log、外洩事件（72h 通報倒數）
- **Settings**：app_settings 鍵值預覽

### 📡 站內第一方分析（v3 新）
- 15 秒 heartbeat、scroll 深度、頁面停留、visibility / unload 出口
- `analytics_sessions` / `analytics_page_views` / `analytics_events` 三表
- 後台「現在誰在用 / 最熱頁面 / 裝置 / 區域 / 平均停留 / 看完率」面板

### ⚖️ 合規 & 安全
- 個資外洩事件追蹤（72h 通報倒數視圖）
- Email 訂閱 + CAN-SPAM 退訂 token
- Audit log 全覆蓋（user / order / ai / setting 變更）

---

## 🛠️ 技術棧

| 類別 | 選用 |
|---|---|
| 框架 | Next.js 15（App Router）+ React 19 |
| 樣式 | Tailwind v4 + custom design tokens |
| DB / Auth | Supabase（Postgres + Auth + RLS + RPC） |
| Client SDK | `@supabase/ssr` 0.5 + `@supabase/supabase-js` 2.x |
| 編輯器 | TipTap 3.x + lowlight |
| Markdown 渲染 | react-markdown + remark-gfm + rehype-highlight + rehype-raw |
| Charts | recharts |
| 動畫 | framer-motion + canvas-confetti |
| Icons | lucide-react |
| State | zustand（局部）+ React state（多數） |
| OG image | next/og（ImageResponse） |

---

## 🚀 Quick Start

### 1. 安裝
```bash
npm install
```

### 2. 環境變數
建立 `.env.local`，最少需要：
```env
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres.<ref>:<pwd>@aws-...pooler.supabase.com:6543/postgres?pgbouncer=true

# 後台隱碼（自選）
ADMIN_SLUG=console-x7k2

# 站點 URL
NEXT_PUBLIC_SITE_URL=https://aiisland.tw

# GA4 sync（可選；未設則 sync route 回 503）
GA4_PROPERTY_ID=
GA4_SA_CREDENTIALS=
CRON_SECRET=
```

### 3. 跑 migrations（依順序）
```bash
npm run db:apply -- -Files supabase/schema.sql
npm run db:apply -- -Files supabase/setup_admins.sql
npm run db:apply -- -Files supabase/admin_migration.sql
npm run db:apply -- -Files supabase/ai_migration.sql
npm run db:apply -- -Files supabase/ai_models_rls_fix.sql
npm run db:apply -- -Files supabase/free_notes_migration.sql
npm run db:apply -- -Files supabase/checkin_migration.sql
npm run db:apply -- -Files supabase/blog_migration.sql
npm run db:apply -- -Files supabase/forum_migration.sql
npm run db:apply -- -Files supabase/comment_likes_migration.sql
npm run db:apply -- -Files supabase/ai_unlimited_migration.sql
npm run db:apply -- -Files supabase/breach_and_email_migration.sql
npm run db:apply -- -Files supabase/interaction_analytics_migration.sql
```

或一次性套用全部 feature migration：
```bash
npm run db:apply -- -AllNewFeatureSql
```

### 4. 啟動
```bash
# Windows 本機若 Node 24 fetch 報 TLS：
NODE_OPTIONS=--use-system-ca npm run dev

# 一般狀況
npm run dev
# → http://localhost:3000
```

---

## 📜 npm scripts

| 指令 | 用途 |
|---|---|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | Production build |
| `npm run start` | 啟動 build 後的伺服器 |
| `npm run lint` | ESLint |
| `npm run db:apply` | 套用 Supabase migration（PS 腳本、含 dollar-quote 感知 SQL splitter） |
| `npm run git:push` | 整理過的 commit + push 助手 |
| `npm run gen:secrets` | 產生隨機 secret（用於 ADMIN_SLUG 等） |

---

## 📁 檔案結構

```text
ai_island_v3/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 全站 layout + InteractionTracker
│   │   ├── page.tsx                 # 首頁（hero + 60 章地圖）
│   │   ├── globals.css              # Tailwind v4 + 主題
│   │   ├── admin/                   # 後台（middleware rewrite 才進得來）
│   │   │   ├── ai/                  # 模型 / API key / 使用量 / 對話
│   │   │   ├── analytics/           # 站內成就 + 章節完成
│   │   │   ├── audit/               # Audit log
│   │   │   ├── breach/              # 外洩事件追蹤
│   │   │   ├── broadcasts/          # 廣播 / 電子報
│   │   │   ├── chapters/            # 章節編輯
│   │   │   ├── crm/                 # 工單
│   │   │   ├── ga4/                 # GA4 + 即時互動
│   │   │   ├── orders/              # 訂單
│   │   │   ├── seo/                 # SEO + redirects
│   │   │   ├── settings/            # app_settings 預覽
│   │   │   ├── subscriptions/       # 訂閱
│   │   │   ├── users/               # 使用者管理
│   │   │   └── zcoin/               # Z-coin ledger
│   │   ├── api/
│   │   │   ├── admin/               # 後台 mutation API
│   │   │   ├── ai/chat/             # 綠寶 streaming chat
│   │   │   ├── analytics/track/     # 第一方互動 tracker
│   │   │   ├── auth/                # ensure-profile / logout
│   │   │   ├── blog/                # 部落格 CRUD + 留言 + reactions + RSS + AI write
│   │   │   ├── forum/               # 討論區 CRUD + reactions + search + 採納
│   │   │   ├── email/, og/, playground/, user/, nav/
│   │   ├── auth/                    # OAuth callback（Google / LINE）
│   │   ├── blogs/                   # 公開部落格頁 + RSS feed + unsubscribe
│   │   ├── chapters/[id]/           # 章節閱讀頁
│   │   ├── courses/[slug]/          # AI 副本（dungeon）
│   │   ├── forum/                   # 公開論壇頁
│   │   ├── leaderboard/             # 排行榜
│   │   ├── me/                      # 個人頁（blog / notes / history / 證書 / 收藏...）
│   │   ├── login/, signup/, settings/
│   │   ├── privacy/, terms/, cookies/, unsubscribe/
│   ├── components/
│   │   ├── AITutorWidget.tsx        # 綠寶懸浮窗（多模型 / quota / 歷史）
│   │   ├── AITutorAutoContext.tsx
│   │   ├── analytics/InteractionTracker.tsx
│   │   ├── blog/                    # TipTap editor / comment / reaction / RSS subscribe / AI write helper
│   │   ├── forum/                   # ThreadList / Replies / Reactions / Search
│   │   ├── chapter/                 # ChapterView / LessonCard / BossBattle / CodeBlock / NotePanel
│   │   ├── dashboard/, gamification/, layout/, home/
│   │   └── CookieBanner.tsx
│   ├── lib/
│   │   ├── supabase.ts              # browser / server / admin client（singleton browser）
│   │   ├── supabase-browser.ts
│   │   ├── supabase-server.ts
│   │   ├── supabase-admin.ts
│   │   ├── gamification.ts          # XP / level / confetti
│   │   ├── content.ts               # 60 章 JSON loader
│   │   ├── ai-privilege.ts          # hasAiUnlimited()
│   │   ├── analytics-device.ts      # UA parse
│   │   ├── blog-*.ts                # types / resolve helpers
│   │   ├── forum-*.ts               # types / XP engine
│   │   ├── rich-html.ts             # TipTap HTML 清洗
│   │   └── linkify-chapters.ts      # AI 回應內 ch## 自動連結
│   ├── data/chapters/               # 70 個章節 JSON（活資料）
│   └── middleware.ts                # admin slug rewrite + session refresh
├── supabase/
│   ├── schema.sql                   # 主 schema + RLS + trigger + 25 成就
│   ├── setup_admins.sql
│   ├── admin_migration.sql          # ERP 表（orders / subs / tickets / broadcasts / audit）
│   ├── ai_migration.sql             # AI 模型 / 對話 / quota / 使用量
│   ├── ai_models_rls_fix.sql        # 補 ai_models public SELECT policy
│   ├── ai_unlimited_migration.sql   # AI 無限額度特權
│   ├── blog_migration.sql
│   ├── forum_migration.sql          # 含 11 筆初始 boards
│   ├── checkin_migration.sql
│   ├── comment_likes_migration.sql
│   ├── free_notes_migration.sql
│   ├── breach_and_email_migration.sql  # 個資外洩 + email 訂閱
│   └── interaction_analytics_migration.sql
├── scripts/
│   ├── run_supabase_sql.ps1         # SQL 套用工具（pooler 5432 / dollar-quote 感知）
│   ├── push_current_changes.ps1     # commit + push 助手
│   ├── generate-secrets.js
│   └── ...（內容匯入腳本）
├── docs/
│   ├── Claude_to_Codex.md           # 桌面 Claude 移植日誌
│   ├── Codex_to_Claude.md           # Codex → Claude Code 接手文件
│   ├── daily_works_0522.md          # 2026-05-22 雙人工作日誌
│   ├── GA4_SETUP.md
│   ├── RULE/                        # 協作規則（SnowRealm 體系 / sprint gate / zip handoff）
│   └── admin_upgrade/               # 後台升級路線圖 + Phase 1 spec
│       ├── README.md
│       └── specs/QW-01..QW-05.md
├── public/                          # 靜態資源（OG 預設圖、favicon）
├── package.json
├── next.config.mjs                  # next/image 允許 supabase.co + cdn.jsdelivr.net
├── tailwind.config.* / postcss.config.mjs
└── tsconfig.json
```

---

## 🔑 重要環境變數

| 變數 | 必填 | 用途 |
|---|:--:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase REST endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 前端 anon key（受 RLS 保護） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server 端 admin client，跳 RLS |
| `SUPABASE_DB_URL` | ✅ | `npm run db:apply` 用（自動轉 5432） |
| `ADMIN_SLUG` | 建議 | 後台隱碼路徑，預設 `console-x7k2`；上 production 務必改 |
| `NEXT_PUBLIC_SITE_URL` | ✅ | OG 圖 + sitemap 用的 absolute URL |
| `GA4_PROPERTY_ID` | 選用 | GA4 sync；未設則後台 sync 回 503 |
| `GA4_SA_CREDENTIALS` | 選用 | Service Account JSON 整段 |
| `CRON_SECRET` | 選用 | GA4 sync cron 驗證；至少 16 字元 |

---

## 🛡️ 高敏感區（修改前務必看 `docs/RULE/AI_ISLAND_COLLAB_RULE.md`）

以下檔案修改前必須有明確 task / file scope。零容忍誤改：

```text
src/app/login/page.tsx
src/app/signup/page.tsx
src/app/auth/**
src/app/api/auth/**
src/lib/supabase*.ts
src/middleware.ts
```

OAuth callback 必須同時支援 `code`、`token_hash`、hash token 三種路徑；profile 建立優先走 server-side `ensure-profile` 避免 RLS 擋寫。

---

## 🎯 部署（Zeabur）

1. Push 上 GitHub（已有 `luffysky/ai-island-web`）
2. Zeabur 連 repo、自動偵測 Next.js
3. 設定環境變數（同 `.env.local`、外加 production-only 的 `ADMIN_SLUG`）
4. 跑 migrations（從本機 `npm run db:apply` 對 production Supabase 套用）
5. 設 Zeabur Cron Job：每日 00:00 打 `GET /api/admin/ga4/sync` 帶 `x-cron-secret`
6. Deploy

線上 production Linux 環境沒有本機 Windows 的 Node 24 TLS 問題，不需 `--use-system-ca`。

---

## 📚 內部文件導覽

| 文件 | 用途 |
|---|---|
| [docs/RULE/AI_ISLAND_COLLAB_RULE.md](docs/RULE/AI_ISLAND_COLLAB_RULE.md) | AI Island 專屬協作 / zip handoff 規則 |
| [docs/RULE/SNOWREALM_TEAM_MASTER.md](docs/RULE/SNOWREALM_TEAM_MASTER.md) | 八人團隊身份、職責、KPI、考績 |
| [docs/RULE/SPRINT_GATE_RULE.md](docs/RULE/SPRINT_GATE_RULE.md) | Sprint / Phase / Round gate 流程 |
| [docs/RULE/ROUND_GATE_COLLAB_RULE.md](docs/RULE/ROUND_GATE_COLLAB_RULE.md) | 單一 gate 文件 / 提交鏈 / 額度不足代班規則 |
| [docs/RULE/LOCK_RULES.md](docs/RULE/LOCK_RULES.md) | 高敏感檔案鎖定 |
| [docs/RULE/SPEC_EXAMPLE.md](docs/RULE/SPEC_EXAMPLE.md) | SPEC 文件範例 |
| [docs/RULE/TASK_TEMPLATE.md](docs/RULE/TASK_TEMPLATE.md) | TASK 模板 |
| [docs/admin_upgrade/README.md](docs/admin_upgrade/README.md) | 後台 9 維度成熟度 + 三階段升級路線圖 |
| [docs/admin_upgrade/specs/](docs/admin_upgrade/specs/) | Phase 1 五個 Quick Win 詳細 SPEC |
| [docs/Codex_to_Claude.md](docs/Codex_to_Claude.md) | Codex → Claude Code 接手手冊 |
| [docs/Claude_to_Codex.md](docs/Claude_to_Codex.md) | 桌面 Claude → Codex 移植日誌 |
| [docs/daily_works_0522.md](docs/daily_works_0522.md) | 2026-05-22 雙人工作日誌 |
| [docs/GA4_SETUP.md](docs/GA4_SETUP.md) | GA4 整合步驟 |

---

## 🚧 進行中與規劃

### 短期（Phase 1 Quick Wins，~3 天，待動工）
- 使用者列表搜尋 + 分頁
- 手動發放 XP / Z-coin / 成就
- Audit log 篩選 + CSV 匯出
- Email 訂閱戶清單頁
- Dashboard 即時 widgets（在線 / breach / audit / AI 預算）

詳見 [`docs/admin_upgrade/specs/`](docs/admin_upgrade/specs/)。

### 中期（Phase 2）
- Impersonate 使用者、Blog / Forum 審核佇列、Z-coin airdrop、Learning events 查詢、Breach 詳細頁、AI cost 警示

### 長線（Phase 3）
- 檢舉收件箱、GDPR 匯出 / 刪除、Cohort / funnel / retention、遊戲化規則編輯器、效能 ops、批次 user 操作

---

## 📊 數據（截至 2026-05-22）

- 70 章節 JSON · 31 章已發布
- 569+ lessons 活資料化
- 25 內建成就（4 階稀有度）
- 6 大職業路線
- 7 個 AI 模型線上可用、月預算追蹤中
- 第一方互動分析 + GA4 雙軌

---

## 📜 授權

Private. © 2026 SnowRealm.