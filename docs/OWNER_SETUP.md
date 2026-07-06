# 林董手動待辦 + env 總清單（OWNER SETUP）

> 這份把「**需要你手動設定 / 到某個後台操作**」的東西集中成一張勾選清單。
> 現況：`.env.local`（本機）大部分金鑰**都已設好**；**唯一真的缺的是「金流」**。其餘多為第三方後台操作或選配。
> ⚠️ 提醒：**Zeabur（正式站）的環境變數要跟 `.env.local` 同步**——本機有、Zeabur 沒有的話正式站不會生效。

---

## 🔴 一、必做（不做會有功能不通）

### 1. 金流（Z幣儲值 / Pro 訂閱）— **唯一真的缺的 env**
擇一或全設（哪家沒設，`/store` 就不顯示那家，安全預設）：
```
# 綠界 ECPay（先到綠界申請商店、審核過拿到）
ECPAY_MERCHANT_ID=
ECPAY_HASH_KEY=
ECPAY_HASH_IV=
# 藍新 NewebPay（HashKey 32 碼、HashIV 16 碼）
NEWEBPAY_MERCHANT_ID=
NEWEBPAY_HASH_KEY=
NEWEBPAY_HASH_IV=
# Stripe（註冊即拿）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# 正式開關（不設=用測試機 stage 網址）
PAYMENTS_LIVE=1
```
**各金流商後台要填的通知/Webhook URL**（把 `站網址` 換成 `https://ai-island-web.snowrealm.pet`）：
| 金流商 | 後台欄位 | 填 |
|---|---|---|
| 綠界 | ReturnURL（付款通知） | `站網址/api/payments/webhook/ecpay` |
| 藍新 | NotifyURL | `站網址/api/payments/webhook/newebpay` |
| Stripe | Webhook endpoint（事件選 `checkout.session.completed`） | `站網址/api/payments/webhook/stripe`；signing secret 填回 `STRIPE_WEBHOOK_SECRET` |

**上線前**：先用**測試機（stage，不設 `PAYMENTS_LIVE`）跑一筆**，確認綠界 CheckMacValue / 藍新 AES+SHA / Stripe 簽章都對、Z幣有入帳，再開 `PAYMENTS_LIVE=1`。詳見 `docs/payments_setup.md`。

### 2. Cloudflare 關掉「AI-bot 封鎖」（不然 GEO 白做、AI 抓不到）
你線上 `robots.txt` 被 Cloudflare 託管段落蓋掉、把 ClaudeBot/GPTBot/Google-Extended 全擋了。操作位置（擇一找得到的）：
- **Cloudflare 儀表板 → 選網域 `snowrealm.pet` → Security（安全性）→ Bots（機器人）→ 找「Block AI bots / AI Scrapers and Crawlers」開關 → 關掉。**
- 若你有開 **AI Audit** 產品：**帳號/網域 → AI Audit → Manage robots.txt / Content signals → 停用託管規則（或改成允許）**。
- 關掉後，就會改用我們自己的 `robots.ts`（已設定：AI 只開放 `/chapters` `/courses` `/blogs`）。

### 3. 新增的 cron 要排程（GitHub Actions）
你的 cron 是用 **GitHub Actions workflow** 觸發（`.github/workflows/*.yml`）。這次新增 3 個 endpoint **還沒有對應 workflow**，要各加一支（照 `.github/workflows/anomaly-check.yml` 複製、改 schedule 與 URL、帶 `CRON_SECRET`）：
| endpoint | 作用 | 建議排程(UTC) |
|---|---|---|
| `/api/cron/ops-alerts` | AI 超支/異常/金流失敗/錯誤/churn 告警 | 每 30 分 |
| `/api/cron/learning-coach` | 產每週學習教練報告 | 每日 或 每週一 |
| `/api/cron/streak-reminder` | 連勝快斷推播 | 每日 12:00 UTC（20:00 台灣） |
> 呼叫方式：`GET`，帶 `Authorization: Bearer <CRON_SECRET>` 或 `?secret=<CRON_SECRET>`（`CRON_SECRET` 已在 env）。

### 4. VAPID（Web Push）— 已有、只要同步到 Zeabur
`.env.local` **已經有** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`（有效的一對）。**確認 Zeabur 正式站也有同一對**（`NEXT_PUBLIC_` 那個是 build 時 inline、private 那個是 runtime，必須配對）。沒設也不會壞（推播 no-op），但設了才會真的推。

---

## 🟡 二、選做 / 加強

- **免費 AI provider**：`GROQ_API_KEY` / `GOOGLE_AI_API_KEY` / `OPEN_ROUTER_API_KEY` / `CF_ACCOUNT_ID`+`CF_AI_TOKEN` **都已設**。到 **`/admin/ai/usage-models`** 可為各任務設「候選模型鏈」（primary→fallback），把高量低難任務指到免費模型省錢。
- **WebLLM（瀏覽器跑模型、零成本）**：預設關。要啟用：`npm i @mlc-ai/web-llm` + 到 **`/admin/flags`** 把 `flag_webllm` 打開（WebGPU 沒有會自動退回伺服器）。
- **語意搜尋全量索引**：目前 `content_embeddings` 有 85 筆（章節+副本）。要含 lessons 細節/部落格/論壇全量：跑 `node scripts/backfill-content-embeddings.mjs`（約 $0.01）。
- **Lottie 動畫**：`/admin/lottie-settings` 可把我放的 CC0 佔位動畫換成你喜歡的 LottieFiles 素材（挑 Free/CC0 授權）。
- **Feature flags**：`/admin/flags` 可開關 `flag_collab`（協作，預設開）、`flag_webllm` 等。

---

## 🟢 三、安全 / 收尾

- **Google 同意畫面顯示 supabase.co**：要移除需 Supabase 自訂網域（付費）或在 Google Cloud Console 的 OAuth 同意畫面設好 App 名稱/logo 並發布。已授權網域只需 `snowrealm.pet`（涵蓋子網域），**不要**加 `supabase.co`（會被判無效）。
- **Supabase Realtime（協作用）**：Yjs 協作走 Realtime broadcast。到 Supabase → Realtime 確認已啟用。**正式環境建議**再開 **Realtime Authorization / RLS**（對 `realtime.messages` 依 `ci_workspace_members` 設 policy），讓非成員連 channel 都進不來（現在是 UI 層擋、傳輸層未擋）。
- **輪替金鑰**（你說等專案完成再做）：Supabase `service_role` key + DB 密碼。`.env.local` 有真值、已 gitignore；輪替後記得同步 Zeabur。
- **migrations 追蹤（選配）**：這次的 `supabase/*.sql` **都已直接套用到正式 DB**；若要納入可重跑清單，把檔名加進 `scripts/run-migrations.mjs`（都是 idempotent）。
  <br>本輪（2026-07 創作者島 / 商店 / FIE / 安全）已套用、但**尚未**進 `run-migrations.mjs` 的檔（重建 DB 時要補跑，全 idempotent）：
  - `creator_island_store_effects_migration.sql` — 商店兌換效果表 `ci_store_effects` + `ci_consume_store_effect` RPC（#89）
  - `creator_island_chat_sessions_migration.sql` — 綠寶對話 `ci_chat_sessions`（後台對話紀錄靠它）
  - `creator_island_fie_migration.sql` — FIE 推理引擎 5 張表
  - `creator_island_memory_semantic_migration.sql` — 記憶語意檢索 `ci_memories_semantic` RPC
  - `fix_function_security_migration.sql` — 14 支 SECURITY DEFINER 函式 REVOKE FROM PUBLIC + GRANT service_role（Supabase linter 修正）
  - `security_invoker_views_migration.sql` — 3 個 view 設 `security_invoker=on`（Supabase linter 修正）
  - `leaderboard_lessons_migration.sql` — 完課排行榜 RPC `leaderboard_lessons`（#136 排行榜多榜別：XP/連勝/完課）
  - `creator_island_universe_migration.sql` — 🌌 碎片宇宙洞察報告快取欄位（ci_creator_stats.universe/universe_at）
  > 套用指令：`npm run db:apply -- -Files supabase/<檔名>.sql`（一次一檔）。

---

## 📋 四、env 總清單（依現況）

**✅ 已設（`.env.local` 有）**：Supabase(`SUPABASE_DB_URL`/`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`)、`AI_KEY_SECRET`、`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GOOGLE_AI_API_KEY`、`GROQ_API_KEY`、`OPEN_ROUTER_API_KEY`、`TOGETHER_API_KEY`、`HUGGINGFACE_TOKEN`、`REPLICATE_API_TOKEN`、`CF_ACCOUNT_ID`/`CF_AI_TOKEN`、R2(`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`/`R2_URL`)、`RESEND_API_KEY`/`EMAIL_FROM`、LINE(user+admin 全套)、Discord 全套、Telegram(`ADMIN_TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET`…)、GA4 全套、VAPID(3 個)、`CRON_SECRET`、`ADMIN_SLUG`/`NEXT_PUBLIC_ADMIN_SLUG`、`NEXT_PUBLIC_SITE_URL`、Zeabur(`ZEABUR_API_TOKEN`/`ZEABUR_ENVIRONMENT_ID`/`ZEABUR_SERVICE_ID`)、Sentry、GTM…

**❌ 待設（只有金流）**：`ECPAY_MERCHANT_ID`/`ECPAY_HASH_KEY`/`ECPAY_HASH_IV`、`NEWEBPAY_MERCHANT_ID`/`NEWEBPAY_HASH_KEY`/`NEWEBPAY_HASH_IV`、`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`、`PAYMENTS_LIVE`。

> **Zeabur 同步**：以上「已設」的，正式站 Zeabur 也要有同一份；新增金流那批設好後一起貼上 Zeabur。

---

## ⏱️ 五、最短上線路徑（只想先讓金流能收錢）
1. 申請綠界（或 Stripe）→ 拿金鑰 → 填 Zeabur env（先不設 `PAYMENTS_LIVE`）。
2. 綠界/Stripe 後台填上面的 webhook URL。
3. `/store` 用測試機買一筆 → 確認 Z幣入帳、後台 `/admin/orders` 看得到。
4. 設 `PAYMENTS_LIVE=1` → 正式收款。
5. 順手：Cloudflare 關 AI-bot 封鎖、加 3 支 cron workflow。
