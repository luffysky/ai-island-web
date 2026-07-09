# AI 島 — 技術全盤點（補助計畫書技術章地基）

> 用途：政府創業補助（DIGITAL+ / SBIR / 部會專案）計畫書「技術章」的**已驗證事實庫**。
> 產出方式：多代理逐一讀真原始碼（`D:\SnowRealmRebirth\AI\ai_island_v3`），逐項標分類 + `檔案:行號` 證據。
> 盤點日期：2026-07-09。**純 code 盤點、未跑站實測執行結果。**

## 🔖 反造假標記約定（寫計畫書時強制遵守）

任何一句主張、任何一個數字，必須帶下列標記之一，否則視為造假、退稿：

- `✅` — 已讀 code 驗證、真能跑，附行號。可寫進計畫書。
- `🟡` — 半成品 / stub / 寫死 / 只接一半。要寫就得如實加但書。
- `❌` — 只有 UI/表/命名、沒真接。**不准列為已完成能力。**
- `[來源:xxx]` — 外部數據（市場/政策/法規），要可查證的第三方來源。
- `[待查證]` — 外部主張、還沒找到來源。
- `[待補:需老闆提供]` — 只有你有的內部數字（用戶數、營收、留存、實際成交訂單、DB 實際題數）。**AI 一個字都不准生。**

原則：**AI 互審能抓邏輯漏洞、抓不了事實對錯。** 數字真假只能靠 `[來源]` 或你本人。

---

## 一句話總評

技術/產品面**遠比一般種子期新創成熟**。最能寫、且經得起技術評審戳的五大賣點：
**① 自建多供應商 LLM 閘道（含容錯/RAG/記憶/工具呼叫）②  i18n 零成本任意語言互譯管線 ③ 自有第一方行為分析數據（非只 GA4）④ 五家金流商完整串接 ⑤ 差異化筆記系統（3層知識樹/SRS/即時協作）。**
必須誠實標註的弱點：**模型路由是規則式非 ML、RLS 實務上大量靠 service_role 補、rate-limit 單機有效、章節內容多為 AI 生成待校、島嶼經濟有已識別刷幣面。**

---

## 量化總覽（可查證、grep 可重現）

| 項目 | 數字 | 來源 |
|---|---|---|
| 章節 / 課程節數 | **80 章 / 1258 節**（全 published） | 實掃 `src/data/chapters/ch*.json` |
| 帶 miniQuiz 的節 | 1238（98.4%） | 同上 |
| 帶可執行 playground 的節 | 756 | 同上 |
| 資料表 | **196 張** | `grep "create table" supabase/*.sql` 去重 |
| SQL migration 檔 | 178 | glob |
| API route | **392 條** | `find src/app/api -name route.ts` |
| DB function / 被呼叫 RPC | ~78 定義 / 46 呼叫 | grep |
| RLS 開啟 / policy | 191 表開 / 281 policy | `supabase/*.sql` |
| Cron 任務 / 排程 workflow | 27 handler / 13 workflow（含 2 CI） | `api/cron/` + `.github/workflows` |
| `.tsx` 元件 | 617（348 client, 56%） | glob |
| LLM 供應商協定 | 6（OpenAI/Anthropic/Gemini/Groq/OpenRouter/CF） | `src/lib/ai-providers.ts` |
| 金流商 adapter | 5（綠界/藍新/Stripe/LemonSqueezy/Paddle） | `src/lib/payments/gateways/` |
| Admin 後台 page | 100 個 page.tsx（約 60 功能區） | `find src/app/admin` |

---

## 1. AI / LLM 全棧　【最紮實、可大寫特寫】

### ✅ 真有實作
- **自建多供應商 LLM 統一閘道**：`src/lib/ai-providers.ts` 手刻對接 6 家協定（OpenAI L101 / Anthropic L193 / Gemini L237 / Groq L286 / OpenRouter+CF 走相容端點 L89）。原生 `fetch`、非官方 SDK。
- **串流 SSE**：每家格式各自解析（`streamOpenAILike` L403 / `streamAnthropic` L464 / `streamGoogle` L533）；前台真逐字接（`AITutorWidget.tsx:465`）。
- **多模態 vision**：三家各轉圖片格式（`ai-providers.ts:73/144/254`），前台可貼 5 張截圖（`chat/route.ts:45`）。
- **自動容錯**：主模型 429/5xx/額度用完自動跨家備援重試最多 6 次（`callAI` `ai-providers.ts:341`）；`resolve-usage-ai.ts:182` 有 in-memory 熔斷器（L75）+ 低信心升級重試（L108）。
- **RAG（真 pgvector）**：`ai-embeddings.ts` 用 `text-embedding-3-small` 產 1536 維；DB 端 `CREATE EXTENSION vector` + ivfflat cosine 索引 + RPC `match_lessons`（`supabase/ai_embeddings_migration.sql:6/16/29`）；每問 embed→取 top-4 章節注入 prompt（`chat/route.ts:198`）。
- **跨對話長期記憶**：`user_ai_memory` 表 + 每日 cron `summarize-memories` 用 LLM 增量總結存 JSONB（`user-ai-memory.ts:29`、`cron/.../route.ts:125`），智慧注入省 token（`ai-tutor-prompt.ts:190`）。
- **Function calling / tool use**：Anthropic 多輪 agentic loop、11 個 tool 真查 DB（`line-ai-tools.ts:429`）。
- **Prompt caching**：切穩定前綴 `cache_control: ephemeral` + 計費加權（`ai-providers.ts:175/616`）。
- **BYOK + AES-256-GCM 加密**：自帶金鑰真能用（`chat/route.ts:75`），金鑰加密存 DB（`ai-crypto.ts:32`）。
- **成本記帳 + 配額**：每次呼叫寫 `ai_model_usage`（`ai-usage-log.ts:26`）；每日免費額度 + 月 token cap（`consume_ai_quota` RPC）。
- **11 個 AI personas**：真拼進 system prompt（`ai-personas.ts` → `ai-tutor-prompt.ts:284`）。

### 🟡 半成品 / 要如實標
- **模型路由是「規則式」非 ML**：兩套都是正則關鍵字+分數門檻（`ai-difficulty.ts:8`、`ai-router.ts:56`）。→ 寫「規則式難度分級路由」，**別寫「AI/ML 智慧路由」**。
- **Moderation 只有 L1 關鍵字**（`moderation.ts:39`）：→ 寫「關鍵字過濾+人工複審佇列」，別寫「AI 內容審核」。
- **成本記帳有起算點**：後台自註「僅 2026-06-29 後 CLI 有記錄」。

### ❌ / 別誇大
- **語音**是瀏覽器 Web Speech API、非自建 STT/TTS。
- **無自研模型**：全是呼叫第三方 API（正確架構，但要講清楚是「應用整合」非「模型研發」——SBIR 最愛戳這點）。

---

## 2. 平台框架與前端　【i18n 是重點賣點】

### ✅ 真有實作
- **Next.js 15 + React 19 App Router**，standalone 輸出；rendering 策略刻意分流：169 頁 `force-dynamic`、7 頁 `revalidate`（`next.config.mjs:13`、`chapters/[id]/page.tsx`）。
- **i18n 零成本翻譯管線（最強賣點、屬實）**：
  - 介面層 next-intl、cookie 選語言無 `[locale]` 路由、四語 `messages/*.json` **各 2478 行完全對齊**（非佔位）。
  - 內容層用 Google **非官方免費端點** `translate_a/single?client=gtx`（`gtranslate.ts:80`）→ **零成本、非 AI token**。
  - **任意語言互譯**：`sl=auto` 偵測原文（`gtranslate.ts:103`）；官方課程只中→外、blog/forum 任意語言互補（`content-i18n.ts:264`）。外國人英文文章自動補中日韓。
  - **程式碼哨兵保護** `⟦N⟧`（`gtranslate.ts:42`）+ **hash 快取只翻改動**（`content_translations` 表）+ **每 3h cron 自動翻**（`translate-content.yml`，75s 軟上限防 524）。
- **PWA**：Service Worker v19 分層快取（`sw.js`）、使用者可存離線章節、動態 manifest、**真實 Web Push 後端**（`web-push` 已裝、`web-push.ts` 真送信、VAPID gated）。
- **SEO/GEO**：9 種 JSON-LD、6 條動態 OG image、對 20+ AI 爬蟲分流的 robots、動態 sitemap、安全 headers（HSTS/XFO/nosniff）。
- **設計系統**：`components/ui` ~28 個可複用元件、Tailwind v4 `@theme`、light/dark 解耦 OS。

### 🟡 / 別誇大
- 56% client component → **別寫「純 RSC 架構」**。
- 「零成本」正確但底層是 Google **非官方端點**（穩定性風險，已有重試+deadline）→ 別暗示商業級 SLA。
- 內容翻譯是**機器翻譯未校對**。
- Web Push「已具備、啟用取決於 VAPID env」，未確認前別寫「推播已上線」。
- Lottie 走 CDN web component、非自建。
- WCAG AAA 是設計註解自述、無自動化驗證 → 寫「以 AAA 對比為設計準則」。

---

## 3. 後端與資料層

### ✅ 真有實作
- **Supabase Auth**：Email/密碼 + Google OAuth 真接 UI（`login/page.tsx:46/65`）；`@supabase/ssr` 三 client 分工。
- **196 表、178 migration**（真 source 散在 migration 檔，`schema.sql` 只 10 表）。
- **RLS 普遍開啟**：191/196 表開、281 policy、`auth.uid()` 用 324 次、有細粒度 helper（`is_note_editor` 等）。
- **金流/經濟/配額走 DB function 原子執行**（`grant_zcoin` FOR UPDATE 鎖列 + 記帳、`consume_ai_quota`…）。
- **後台授權集中** `admin-guard.ts:66` 用 `getUser()` 真驗 token、三級 RBAC（owner/admin/scoped）。
- **GDPR** 真流程（soft-delete + 取消 + 硬刪 function）。
- **Cron 真在跑**：11 個產品排程（translate/ops-alerts/streak-reminder/learning-coach…）。

### 🟡 半成品 / ❌ 弱點（資安要誠實）
- **App 層 240/392 route 用 service_role 繞過 RLS**（`supabase-admin.ts`）→ RLS 實務上是**第二道防線**、主防線是 app 層手寫檢查 + admin-guard。**別寫「零信任 / RLS 為唯一防線」。**
- **Rate limit 是記憶體 Map**（`rate-limit.ts:15`，45 route 用），DB 版寫好沒接 → **多實例擴容時失效**，單機堪用。
- **無 zod / 集中式輸入驗證**（產品 code 無 schema 驗證庫）→ 別宣稱「嚴格 schema 驗證」。

---

## 4. 學習內容系統　【筆記系統是差異化】

### ✅ 真有實作
- **80 章 / 1258 節 / 1238 miniQuiz / 756 playground**；DB+JSON fallback（`content.ts`）、`.range()` 分頁防 1000 截斷。
- **每日測驗**：8 題/天、雙題源（章節 miniQuiz + `leetcode_questions` 表）、**ELO 自適應難度 + 14 天防重複**、伺服器批改發獎（`quiz/today/route.ts`）。
- **筆記系統（最強差異化，逐項屬實）**：3 層知識樹（dnd-kit 拖曳）、**SM-2 SRS 間隔複習**（`note-srs.ts`）、區塊引用 pill、自製富文本、公開牆/市集、**Supabase Realtime 多人即時協作 presence**（`useNotePresence.ts`）。
- **完課證書**：server-authoritative 冪等自動發、含 stage/全站里程碑、公開驗證頁 + 6-byte 碼。
- **部落格**：tiptap 全功能（@提及、Yjs 即時協作、表格、slash command、AI bubble menu）+ 巢狀留言。
- **論壇**：發文/回覆/reactions/看板/搜尋 + 發文即時查重導流。
- **Career path**：五關求職閉環，全部真實查詢（無寫死）。

### 🟡 / 別誇大
- **章節內容多為 AI 草稿待校**（CLAUDE.md/memory 明載）→ 寫「AI 輔助生成、持續校訂」，**別寫「專家審訂教材」**。
- **LeetCode 非線上判題**：外連 leetcode.com + 使用者自報已解，站內無 editor/評測。
- **證書 PDF = 瀏覽器列印另存**，非伺服器生成。
- **`leetcode_questions` 實際題數需查 DB** `[待補:需老闆提供]`；別拿 `leetcode_problems` 的 3944 目錄數冒充題庫。

---

## 5. 遊戲化 / 虛擬經濟 / Creator Island

### ✅ 真有實作
- **島嶼 3D 畫布**：`@react-three/fiber` 真第三人稱走動、GLB 村民、後製 Bloom（`IslandV0.tsx`）。
- **釣魚小遊戲**真互動、**Z 幣 grant_zcoin RPC** 原子入帳記帳。
- **有去重的賺幣路徑安全**：成就/寶箱/占卜/村民/睡覺/每日任務（reason 唯一鍵）。
- **寵物**：物種驅動 AI 語氣、真串 Claude Haiku 聊天 + 長期記憶、花 Z 幣進化。
- **Creator Island 大部分真接**：市集買賣（`ci_purchase_listing` 原子）、self-deal 雙層擋、Cost Manager 真預扣退款、studio/messages/growth/community/create/universe 全真。

### 🟡 / ❌ / ⚠️ Demo 紅線
- **島嶼進度/庫存/成就/家/魚全存 localStorage、非 DB**（`island-bus.ts`）→ 換裝置歸零，**別說「雲端存檔」**。只有 Z 幣入帳進 DB。
- **⚠️ 已識別刷幣面**：釣魚魚種（`catch-fish/route.ts:8`）+ 兌換數量（`redeem/route.ts:9`）由前端申報、無去重 → 話術「已識別、正導入伺服器權威事件驗證」，**demo 別開 devtools**。
- **payout 提領 `method='manual'` 沒接金流** → 別演「錢真的入帳」。
- **家譜/家族不存在**（只有扁平好友清單）；作品 lineage 血緣是另一回事。
- **寵物「餵養」不存在**（只有聊天/進化）。
- **每日任務進度前端自報**（有夾值上限非權威）。
- **商人 Merchant buff 純前端**、改 localStorage 可無限買。

---

## 6. 基礎設施與商業化

### ✅ 真有實作
- **部署全自動**：Dockerfile standalone → `docker.yml` push main 自動 build 推 GHCR → Zeabur GraphQL `restartService` 自動重部署（fallback `redeployService`）。
- **主動營運告警** `ops-alerts.ts:98`：5 項即時 DB 查詢（AI 成本/異常用戶/金流失敗/error 暴增/churn），門檻可後台覆寫，routing 站內/LINE/TG/Discord。
- **錯誤蒐集** 真寫 `error_logs` + 異常偵測；**Web Vitals** 真收 LCP/INP/CLS 落表。
- **自有第一方行為分析（對補助 traction 最關鍵、可主打）**：全站 `InteractionTracker` → `/api/analytics/track` → `analytics_sessions/page_views/events` 三表 + `profiles.last_active_at`，含 session/visitor 識別、停留時長、捲動、IP 地理、裝置解析。**DAU/留存/cohort/churn 可從自有表算、非只靠 GA4**；GA4 另用 Data API 拉回站內存 `analytics_snapshots`。
- **五家金流商完整串接**：綠界/藍新/Stripe/LemonSqueezy/Paddle 各有 adapter，ECPay 真 CheckMacValue 簽章；完整訂單生命週期（建單→checkout→webhook 驗章→冪等發貨/開通 Pro）。
- **推薦系統**真的（邀請碼雙方各 50 Z 幣、冪等、三表帳本）。
- **交易型 email** 真打 Resend；行銷後台讀真表（UTM/affiliate/廣告統計）。

### 🟡 / ❌ 別誇大
- **金流「能收錢取決於 env + `PAYMENTS_LIVE=1`」**：code 完整，但正式環境是否已填金鑰、是否已有真實成交 → `[待補:需老闆提供]`。**別寫「已產生 X 營收」除非有 DB 佐證。**
- **Email 群發只建名單不真寄**（`email-campaigns/[id]/send` 留 spec）。
- **多平台社群一鍵發佈是殼**（未接 OAuth）。
- 無公開 `/api/health`（只有後台健康頁）。
- **後台 100 頁 ≠ 每頁滿血** → 用「約 60 個管理模組」描述。

---

## 📌 給計畫書技術章：可寫 vs 別碰（速查）

| 可以大寫特寫（經得起戳） | 絕對別誇大（會被抓） |
|---|---|
| 自建 6 供應商 LLM 閘道 + 串流 + 容錯 + RAG + 記憶 + tool use | ❌「AI/ML 智慧路由」→ 其實規則式 |
| i18n 零成本任意語言互譯 + hash 快取 + 每3h自動 | ❌「純 RSC 架構」→ 56% client |
| 自有第一方行為數據（DAU/留存/churn 自有表） | ❌「AI 內容審核」→ 只有關鍵字層 |
| 五家金流完整串接 + 冪等發貨 | ❌「自研大型語言模型」→ 全呼叫第三方 |
| 筆記系統（3層知識樹/SRS/即時協作） | ❌「專家審訂教材」→ AI 生成待校 |
| server-authoritative 冪等證書 | ❌「零信任/RLS 唯一防線」→ 靠 service_role |
| 部署全自動化 CI/CD + 主動營運告警 | ❌「已產生 X 營收」→ 需 DB 佐證 |

## 🚫 補助現場 Demo 紅線（別在評審面前點）
1. 別開 devtools 談防刷（釣魚/兌換有已知刷幣面）。
2. 別演 payout「提領入帳」（純人工標記、沒接金流）。
3. 別承諾「家譜/家族圖」（不存在）。
4. 別強調島嶼「雲端存檔」（localStorage、換裝置歸零）。
5. 市集用乾淨既有資產 demo，別臨場上架新資產再買（交付失敗邊角）。

## 🧩 已查證事實（2026-07-09 DB 實查，`scripts/grant-facts.mjs`）

### ✅ 可放心引用（乾淨數字）
- **內容規模**：chapters **80**、lessons **1258**、`leetcode_questions` **374 題**（真有選項/答案）、`leetcode_problems` 3944（僅目錄、不可當題庫量）。
- **金流已 live 配置**：`PAYMENTS_LIVE=1`（正式收款）；**綠界 ECPay + 藍新 NewebPay 三把金鑰皆已設**（可對台灣用戶真收款）。Stripe/Lemon/Paddle 未設。
- **其他 env 已備妥**：Web Push VAPID ✅、Resend email ✅、GA4 追蹤 + Data API ✅、AI 金鑰加密 secret ✅。
- **AI 真實使用**：`ai_messages` **458 則**（真人與 AI 對話留存）。

### ⚠️ 不可當 traction 引用（會誤導 / 被評審戳破）
- `analytics_events` **275,701** — 主要是**心跳(heartbeat)事件灌水**，非「互動數」。別寫「27 萬次互動」。
- `analytics_sessions` **1,539 / distinct 訪客 1,120** — 但 **bot 灌水嚴重**：國別 **US 655 > TW 568**、未知 308（繁中站 US 第一 = 爬蟲）。**停留 ≥10 秒的真人 session 僅 ~405**。
- `notes` **748 / 公開 485** — **全部來自 3 個帳號**（485+135+128），是 **seed/示範資料、非自然用戶產出**。別寫「用戶產出 748 則筆記」。
- `forum_threads` **59** — 含 `forum-ai-residents` cron 的 **AI 住民貼文**，非全真人。

### ❌ 現況硬傷（必須誠實、決定能投哪種補助）
- **註冊用戶 17 人**（2026-05-17 起 ~7 週），session 有登入者 **僅 4 人活躍**。
- **營收 0**：orders 3 筆、**paid 0 / fulfilled 0**、subscriptions 0。金流上線但**尚無真實成交**。
- **核心學習使用極低**：`lesson_progress` **11**、`certificates` **0**、`daily_quiz_attempts` **8**、`blog_articles` **0**。
- 結論：**目前是 pre-launch / pre-traction 階段。** → 對「需 traction 的補助」是硬傷；對「概念型 / 育成 / 競賽 / 研發型（看技術與計畫）」則不擋。這重申了投案策略：**先攻不看 traction 的入口，或先花一個月把真實用戶做出來**（基礎設施已就緒，缺的是導流）。

### 仍待補（AI 不准生）
- `[待補]` 目標市場規模、政策、法規、競品數據 → 外部來源，另開檔查證。
- `[待查證]` 早期 AI 開發實際成本（後台記帳自 2026-06-29 起才完整）。
