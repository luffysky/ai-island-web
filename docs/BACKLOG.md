# AI 島 — 完整 Backlog

> ⚠️ **已整合：最新待辦請看 [`REPORTS_TODO_2026-06-03.md`](./REPORTS_TODO_2026-06-03.md)**（2026-06-03 把這份 + 5 份交付報告合併成單一真實來源）。本檔保留作歷史紀錄。

**版本**：v7.1 · **日期**：2026-05-29（深夜更新）· **Owner**：雪鑰

---

## 🔴 林董要自己設定（最高優先、無法由 code 完成）

### 1️⃣ Stripe 訂閱付款（無此設定 = 訂閱賣不出去）

| 步驟 | 怎麼做 | 狀態 |
|---|---|---|
| 拿 Stripe secret key | https://dashboard.stripe.com/apikeys → Reveal test/live key | ❌ 未做 |
| 貼到 `.env.local` + Zeabur env | `STRIPE_SECRET_KEY=sk_xxx` | ❌ 未做 |
| 跑 bootstrap 建 3 個 Product | `node scripts/_oneshot-stripe-bootstrap.mjs` | ❌ 未做 |
| 把 3 個 price_id 貼到 Zeabur | `STRIPE_PRICE_ID_MONTHLY/YEARLY/SINGLE` | ❌ 未做 |
| Stripe Dashboard 設 Webhook | URL: `https://ai-island-web.snowrealm.pet/api/stripe/webhook`<br>勾 6 個事件（看 STRIPE_SETUP.md）| ❌ 未做 |
| 把 Webhook signing secret 貼 Zeabur | `STRIPE_WEBHOOK_SECRET=whsec_xxx` | ❌ 未做 |
| Zeabur redeploy | Variables 改完手動 trigger | ❌ 未做 |
| 自己訂一筆 test mode 驗證 | 用卡號 `4242 4242 4242 4242` | ❌ 未做 |

完整步驟：`docs/STRIPE_SETUP.md`

### 2️⃣ Discord 設定（綁定流程 / VIP role）

| 步驟 | 怎麼做 | 狀態 |
|---|---|---|
| OAuth Redirects 加 URL | Discord Developer Portal → OAuth2 → Redirects → Add Redirect<br>`https://ai-island-web.snowrealm.pet/api/auth/discord/callback` | ✅ 已設 |
| Reset Bot Token + 同步 Zeabur | Bot tab → Reset Token、貼 Zeabur env | ✅ 已設 |
| 建 Premium VIP role | 伺服器設定 → 身分組 → 建立身分組「VIP」 | ✅ 已設 |
| Bot role 拖到 VIP 之上 | 身分組頁面拖位置 | ⚠️ 待確認 |
| Bot role 開「管理身分組」權限 | 點 bot role → 權限 → ✅ Manage Roles | ⚠️ 待確認 |
| 補 Zeabur env | `DISCORD_VIP_ROLE_ID` + `DISCORD_CLIENT_SECRET` | ❌ 未做 |
| `/admin/discord/setup` 註冊 slash | 開新分頁 GET 即可、看到 discord_response_status: 200 | ✅ 已成功 |
| Discord 客戶端重啟看 `/quote` | iOS / 桌面要重啟 cache | ⚠️ 沒看到 commands 就重啟 |

### 3️⃣ 寵物 4 隻 Lottie URL（沒填 = fallback emoji、不會壞）

| 步驟 | 怎麼做 | 狀態 |
|---|---|---|
| 去 lottiefiles.com 挑 4 個動畫 | 推薦關鍵字：hamster / kawaii cat / shiba inu / bunny hopping | ❌ 未做 |
| 進 `/admin/lottie-settings` 貼 URL | 4 個 slot：pet_lottie_hamster_url / cat / dog / rabbit | ❌ 未做 |
| 儲存後右下角寵物秒生效 | 不用 redeploy | ❌ 未做 |

### 4️⃣ GitHub Actions CRON_SECRET（anomaly-check 401 修）

| 步驟 | 怎麼做 | 狀態 |
|---|---|---|
| 確認 GitHub repo secrets 對齊 | https://github.com/luffysky/ai-island-web/settings/secrets/actions<br>`CRON_SECRET` 跟 Zeabur env 一字不差 | ⚠️ 改過、等下個整點驗 |
| 同上 SITE_URL | 確認也設了 | ⚠️ 改過、等下個整點驗 |

### 5️⃣ Cron 排程（cron-job.org 免費版）

| 排程 | URL | 頻率 |
|---|---|---|
| 學員每日推播 | `/api/cron/student-daily-review?secret=xxx` | 每天 12:00 UTC (20:00 台北) | ⚠️ 待確認 |
| LINE 異常監控 | `/api/cron/anomaly-check?secret=xxx` | 每 30 分鐘 | ✅ GH Actions 已設 |
| 流失提醒 | `/api/cron/recall-user?secret=xxx` | 每天 06:00 UTC | ❌ 未做 |
| Leetcode 同步 | `/api/cron/leetcode-sync-daily?secret=xxx` | 每天 02:00 UTC | ⚠️ 待確認 |
| Discord 每日金句 | `/api/cron/discord-quote-daily?secret=xxx` | 每天 23:00 UTC (07:00 台北) | ⚠️ 待確認 |
| AI 記憶總結 | `/api/cron/summarize-memories?secret=xxx` | 每週日 21:00 UTC | ❌ 未做 |
| Launchpad 自動掃 | `/api/cron/launchpad-auto-sync?secret=xxx` | 每天 03:00 UTC | ❌ 未做 |
| Launchpad 月度回顧 | `/api/cron/launchpad-retrospective?secret=xxx` | 每月 1 號 09:00 UTC | ❌ 未做 |

### 6️⃣ 其他 env（環境變數待設清單）

```bash
# 🔴 必設、無此 = 功能掛掉
STRIPE_SECRET_KEY=                 # Stripe checkout
STRIPE_WEBHOOK_SECRET=             # Stripe webhook 驗 sig
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=
STRIPE_PRICE_ID_SINGLE=

DISCORD_CLIENT_SECRET=             # Discord OAuth
DISCORD_VIP_ROLE_ID=               # Discord VIP role

# 🟡 選設、有則優化
OWNER_LINE_USER_IDS=Uxxx          # LINE bot 直接認林董身份
TELEGRAM_OWNER_USER_IDS=           # TG bot 白名單
TELEGRAM_OWNER_USERNAMES=
PISTON_BASE_URL=                   # 自架 Piston（不設用公版 emkc.org）
NOTIFY_DUAL_USERNAMES=nami         # Nami 雙通知
TELEGRAM_WEBHOOK_SECRET=           # 選填、防偽 webhook
ADMIN_TELEGRAM_CHAT_ID=純數字       # 用 @userinfobot 拿
N8N_INBOUND_API_KEY=               # n8n 拉資料用（架完再設）
N8N_OUTBOUND_URL_PREFIX=https://n8n.snowrealm.pet/webhook

# 已停用、可從 .env.local 刪除
ADMIN_LINE_NOTIFY_TOKEN=          # LINE Notify 2025-04 停服
```

---

## 🟡 還沒做的 task（按優先排）

### P0 — 影響上線體驗

| # | 工作 | 工時 | 依賴 |
|---|---|---|---|
| 1 | **Stripe Dashboard 設好**（拿 key + bootstrap + webhook + env）| 30 min | 林董 |
| 2 | **填寵物 Lottie URL** | 10 min | 林董 |
| 3 | **設 cron-job.org 排程**（7 個 cron）| 20 min | 林董 |
| 4 | **N8N self-host 架起來**（Zeabur Docker）| 30 min | 林董 |

### P1 — 商業正循環

| # | 工作 | 工時 | 文件 |
|---|---|---|---|
| 5 | **Z 幣商城 sink**（寵物配件 5 + 主題 3）| 4 hr | PRICING_STRATEGY.md |
| 6 | **Z 幣儲值 4 套餐**（60/199/499/999）| 3 hr | PRICING_STRATEGY.md |
| 7 | **訂閱付款監測 dashboard**（轉換率 / churn）| 4 hr | — |

### P2 — 內容偷懶（章節 audit 結果）

> 跑 `node scripts/_diag-lazy-chapters.mjs` 隨時 re-audit

**非附錄真該補的（按分數排）**：

| 章 | 分數 | 工時/課 | 課數 |
|---|---|---|---|
| **ch60** 創業心法 | 6.3 | 30 min | 6 |
| **ch57** AI 法律 / 倫理 | 6.4 | 30 min | 5 |
| **ch58** AI 時代職涯 | 6.4 | 30 min | 5 |
| **ch51** AI 寫作 / 小說 | 6.5 | 30 min | 6 |
| **ch55** AI 行銷 | 6.5 | 30 min | 6 |
| **ch56** AI 虛擬 IP | 6.5 | 30 min | 6 |
| ch68 高階工程師 | 7.0 | 30 min | 20 |

**附錄（by design 可不改）**：ch61-67 / ch69-70（速查、5.0-3.0 分但 OK）

### P3 — N8N 12 workflow（架完再開）

完整 spec：`docs/N8N_INTEGRATION.md`

| # | workflow | ROI |
|---|---|---|
| N1 | 學員 onboarding 7 天序列 | 🔥 註冊→活躍 +30-50% |
| N4 | 每日 09:00 KPI 摘要 → LINE 自己 | 🔥 省 5 分鐘/天 |
| N2 | 流失 winback 7/14/30 天 | ⚡ retention 救回 |
| N8 | 客服工單 AI 分流 | ⚡ 客服省力 70% |
| N6 | AI 工作流路由 | ⚡ token cost -50% |
| N3 | AI 內容工廠（blog → 5 平台）| 🟢 行銷流量 |
| N7 | 集中通知中心 fan-out | 🟢 不用每處 hardcode |
| N5 | 章節內容自動發布 | 🟢 內容上線無人工 |
| N9 | Stripe → Supabase | 🟢 已自接、補強用 |
| N10 | 每日 03:00 DB backup | 🛡️ 災難回復 |
| N11 | 異常偵測 + alert | 🛡️ 5 指標監控 |
| N12 | GitHub release → 站內 changelog | 🟢 自動化 |

### P4 — 內容工作未做（53 章剩、按 BACKLOG.md v7.0 排）

#### P2 — AI 進階系列（5 章 / ~100 課）
| 章 | 標題 | 課數 |
|---|---|---|
| ch47 | AI 應用工程 | 12 |
| ch48 | Vibe Coding | 19 |
| ch49 | AI Agent | 22 |
| ch50 | n8n 自動化 | 18 |
| ch63 | AI / Prompt 工法大全 | 4 |

#### P3 — 中優先（6 章 / ~145 課）
| 章 | 標題 | 課數 |
|---|---|---|
| ch03 | UI/UX 設計原理 | 25 |
| ch11 | 行動裝置 App | 25 |
| ch12 | 資安基礎 | 25 |
| ch13 | SEO + GEO | 25 |
| ch14 | PWA 跨平台 | 22 |
| ch15 | 前端 DevOps | 23 |

#### P4 — 後端 + DB 補完（7 章 / ~83 課）
| 章 | 標題 | 課數 |
|---|---|---|
| ch23 | 雲端架構 | 9 |
| ch24 | 監控 Logs | 10 |
| ch25 | 網域 + DNS + SSL | 10 |
| ch32 | Go 完整 | 23 |
| ch33 | Rust 完整 | 22 |
| ch34 | Java + Spring Boot | 4 |
| ch35 | C# + .NET | 5 |

#### P5 — 商業 + 創作（17 章 / ~140 課）詳見 BACKLOG v7.0

### P5 — Admin 後台升級剩 5 項

| ID | 缺 | 估時 |
|---|---|---|
| **LT-17** | 效能 ops（Sentry / PostHog）| 1-2 天 |
| **P4-05** | KPI 報表 ↔ cron/kpi-email 確認 wired | 10 分 |
| **P4-19** | 教師/助教 role admin 管理介面 | 0.5-1 天 |
| **P4-20** | 學員作業批改介面 | ~1 週 |

### P6 — 未來規劃（v7+、不急）

- ⏳ Chapter 推薦演算法（content + collaborative filter）
- ⏳ 全站語意搜尋 UI（embeddings 跑完）
- ⏳ Marketing 排程 OAuth 接 LinkedIn / Threads
- ⏳ A/B 測 ad copy 真實點擊回填
- ⏳ ch68 嚴格 spec 重寫（task #21、20 課 8-15 hr）
- ⏳ 人生星圖（足跡流光整合）— 把點子碎片 + 學習足跡整合成視覺化人生星圖。**跨專案、足跡流光較麻煩、暫緩**

---

## ✅ 5/29 一天做完的（深夜更新）

### 🔥 大型功能（13 件）

| 功能 | 影響 |
|---|---|
| **LINE bot 5 件**（A: 5 命令 / B: 里程碑 push / C: ch00 / D: vision / E: 即時在線）| 學員 LINE 體驗成形 |
| **TG bot 11 條進階指令**（silence/focus/me/digest/journal/tr/rewrite/idea/broadcast/grant_premium/vip/risk + voice）| 林董私人助理 |
| **Discord 學員流 4 件**（DC#1/4/5/7：vision / VIP role / onboard DM / slash command）| Discord 學員流通 |
| **AI 對話 5 件套**（時間戳/打字/複製/auto-scroll/搜尋）+ **視覺美化**（漸層/玻璃感/code 高亮）| 4 個 AI 入口統一 |
| **章節 audit + 進度條**（76 章評分 + /chapters 卡進度 + 詳情頁升級）| 學員看得到 |
| **新手友善 A+B+C**（5 步 Tour + 3 步 Wizard + /chapters CTA）| 第一次來不迷路 |
| **全站 + 後台麵包屑**（前後台 layout 都掛、100+ segment 中文映射）| 導覽清楚 |
| **Stripe 訂閱付款接通**（checkout + webhook + Discord role 同步 + /pricing CTA）| 商業化基礎 |
| **N8N 整合 spec**（12 workflow + AI 島端 hooks）| 自動化規劃 |
| **PRICING_STRATEGY.md**（訂閱 + Z 幣定價策略）| 定價決策 |
| **資料表健檢 + 章節 audit script** | 維運工具 |
| **許願池 10 條全部做完**（流失關懷 / AI 訂閱推薦 / YT / 履歷 / 面試 / 章節 audit / 週賽 / 配對 / PWA / 對外 API）| 老 wishlist 清零 |
| **AI 特權系統 + 月 token cap + 月 action quota** + 5 個漏網 endpoint 接 gate | 成本壓縮接通 |

### 🛠️ 修 bug（10+）

- ch26.0.5 PowerShell `ls -la` 不認 → 補 Get-ChildItem 等價
- LINE bot「完整對話」按鈕跳幽靈頁 → 改 `/me/ai-history`
- Discord `/quote` 永遠回「還在路上」→ select column 名稱錯
- TG `/me` `/digest` 表名錯（user_notes→notes、subscription_orders→orders）
- bot token 失效診斷 endpoint
- `/admin/discord` 控制台補（隱形入口外露）

### 📊 健檢結果

- DB 35/35 業務必要表都建好（線上 125 張）
- 章節 audit：76 章內 健康 10 / 偏弱 56 / 該補 9（附錄不算）

完整日誌：`docs/daily_works_0529.md`（待寫）

---

## 🚦 林董明天起床後優先做的事

1. **跑 Stripe bootstrap**（30 min、訂閱才能真的賣）
2. **填寵物 Lottie URL**（10 min、視覺立刻升級）
3. **設 cron-job.org 7 個排程**（20 min、所有自動化才會跑）
4. 一杯咖啡時間：去 `/me/settings` 綁 Discord 走過一輪、看 `/quote` 真的能用
5. 想做的話：N8N self-host 架起來（30 min）

---

_最後更新：2026-05-29 深夜 by 雪鑰_
_今天工作量打破紀錄、林董 2 天沒睡、休息為先_
