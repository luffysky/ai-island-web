# AI 島 — 待辦總表（2026-06-03 整合版）

> 整合自 `BACKLOG.md`（v7.1）+ 5 份交付報告（健檢/防禦/優化/新功能/AI中台）。**這份是現在的唯一真實來源**，列出所有「還沒做」的事。
> 本 session（0603）已完成的列在最後一段（給 context）。

---

## 🔴 A. 林董手動設定（code 改不了、最高優先）

### A1 上線體驗 / 商業
- [ ] **Stripe 訂閱付款**：拿 key → `node scripts/_oneshot-stripe-bootstrap.mjs` → 貼 3 個 price_id → 設 webhook（`/api/stripe/webhook`、勾 6 事件）→ 貼 `STRIPE_WEBHOOK_SECRET` → redeploy → 用 4242 測一筆。（`docs/STRIPE_SETUP.md`）
- [ ] **寵物 4 隻 Lottie URL**：lottiefiles 挑 4 個 → `/admin/lottie-settings` 貼（hamster/cat/dog/rabbit）→ 秒生效
- [ ] **cron-job.org 排程**（7 個）：student-daily-review / recall-user / leetcode-sync / discord-quote / summarize-memories / launchpad-auto-sync / launchpad-retrospective
- [ ] **Discord 收尾**：bot role 拖到 VIP 之上 + 開 Manage Roles 權限 + 補 `DISCORD_VIP_ROLE_ID` / `DISCORD_CLIENT_SECRET`
- [ ] **GitHub Actions secrets**：確認 `CRON_SECRET` / `SITE_URL` 跟 Zeabur 一字不差（anomaly-check 才不 401）
- [ ] **其餘 env**（選設）：OWNER_LINE_USER_IDS / TELEGRAM_* / PISTON_BASE_URL / N8N_* 等（見舊 BACKLOG §6）

### A2 安全 / 帳號（來自報告）
- [ ] **後台登入 `deleted_client`**：Google Cloud 建新 OAuth client（redirect `https://twyfwalusqngmkydllfh.supabase.co/auth/v1/callback`）→ 貼進 Supabase Auth → Google。（林董表示已處理、待確認能登入）
- [ ] **Egress**：Supabase Dashboard 看是 egress 還 storage 爆；視情況加 `NEXT_PUBLIC_CONTENT_SOURCE=file`（已確認安全；code 也已優化不再拉全文）
- [ ] **Owner 帳號開 MFA / TOTP**（Supabase）
- [ ] **Cloudflare 擋在 Zeabur 前**（DDoS / WAF / Bot Fight，CP 值最高的外層）+ 隱藏 origin IP
- [ ] GitHub **Dependabot** + Supabase 定期備份 + 金鑰輪替（AI_KEY_SECRET / CRON_SECRET / service_role）

---

## 🔒 B. 安全加固（code、有 3 個現成 helper 在交付包 `src_lib/`）

### B1 — P0
- [x] **UGC XSS 改白名單清洗**：新增 `sanitize-html` + `rich-html-server.ts`（`sanitizeRichHtmlStrict` 白名單），blog/forum 渲染已換；client 端 NoteCard 維持輕量 regex 當第二層（不打進 bundle）。〔resume 走 markdown 路徑、另計〕
- [x] **套 `admin-guard.ts`**（`requireAdmin`/`requireStaff`/`requireOwner`）：**111/114 完成**（13 批、每批 tsc 0 + 獨立 commit，無壞授權進 main）。
  - 新增 `requireStaff(roles[])`（owner 一律放行 + 指定角色），收斂 `canned-replies`×2 / `tickets`×2（admin/teacher/assistant）/ `seo-overrides` / `changelog`（admin/editor），保留原角色集合不改語意。
  - 剩 3 條**刻意不轉**（多重認證路徑：cron secret 或 admin、單一 gate 無法表達）：`ai/conversations/[id]/messages`、`kpi.json`、`line/setup-richmenu`。這 3 條維持自有 multi-path 邏輯為正解。
- [x] **security headers + HSTS**：`next.config.mjs` 已加 `headers()`（HSTS/X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy）+ `poweredByHeader:false`
- [ ] **CSP（Report-Only 先行）**：收 violation、別直接強制
- [x] **rate limit**：`/api/v1/chat` 已套（per-IP 60/min + per-key 30/min）。〔登入/註冊走 Supabase client、無 server route 可包、N/A〕
- [x] **RLS 9 張空 policy 逐表確認**：`achievements` 公開 SELECT policy 已套用到 production DB（已驗證 anon/authenticated 皆可讀 25 筆徽章、寫入仍 deny-all）。其餘空 policy 表維持 deny-all（正確）

### B2 — P1
- [x] 套 `validate.ts`：**UGC 寫入面完成**（blog 文章建立/編輯 + series/settings/comments、forum 發文/編輯都 `parseBody` zod 限長；內文另加 `sanitizeRichHtmlStrict` 白名單寫入）。剩 like/reaction/subscribe（純 id/bool、風險極低）可不補
- [x] Telegram webhook secret 改強制 + fail-closed（沒設 secret → 503；比對改 timingSafeEqual）。⚠️ **部署後林董須在 Zeabur 設 `TELEGRAM_WEBHOOK_SECRET` 並重跑 `/admin/telegram/setup`、否則 admin TG bot 會停**
- [~] admin slug 硬編 fallback `console-x7k2` 收斂：已把 `src/lib/admin-href.ts` 的 `ADMIN_SLUG` 改成單一來源（server `ADMIN_SLUG` → client `NEXT_PUBLIC_ADMIN_SLUG` → fallback），標為新 code 唯一來源。剩 26 處散落的硬編是**低優先 hygiene**（prod env 已設 `Ak83QDhUOVqx`、fallback 永不觸發、非實際洩漏），之後逐檔 import 即可、不急
- [x] RLS policy 補 `WITH CHECK`：**已套用 production**（林董授權）。實際只有 9 條 ALL/UPDATE 寫入 policy 缺 explicit WITH CHECK（audit 寫 22 高估），已全部鏡射 USING→WITH CHECK；現在 0 條缺。〔註：Postgres 本來就用 USING 當隱式 WITH CHECK、非漏洞、這是明確化〕。可重跑：`supabase/rls_with_check_explicit.sql`（idempotent DO block）+ breach migration 內已含 explicit WITH CHECK
- [x] 2 份 migration：**本來就 idempotent**（`CREATE ... IF NOT EXISTS` / `DROP POLICY IF EXISTS`+CREATE / 守衛 DO block），已**重新套用 production**（5 張表齊全、policy/trigger/function 到位）
- [ ] 註冊/發文加 Cloudflare Turnstile + 蜜罐欄位
- [ ] 金鑰輪替計畫 + v1 API key 一鍵停用/重發按鈕

---

## ⚡ C. 效能 / 優化（升級報告）

- [x] **OPT-2 next.config 加 `optimizePackageImports`**（lucide/recharts/framer-motion/date-fns…）+ `poweredByHeader:false`（零風險瘦身）
- [x] **OPT-1 拆 `chapters-meta`**：`SkillRadar`（唯一 client importer）改吃 `chapters-lite.json`（11KB、id/stage/lessonIds），8.7MB 章節內容移出 client bundle；`CareerProgress` 一併換。產生器 `scripts/gen-chapters-lite.mjs`
- [ ] bundle analyzer 裝起來跑基準 → TipTap/recharts/CodeMirror 動態 import；評估移除 Monaco（收斂 CodeMirror）
- [ ] OPT-7 其餘列表 API `select("*")` → 明確欄位（章節 metas/nav 已做）
- [ ] OPT-8 RLS `is_admin()` SECURITY DEFINER function + 補 index
- [x] OPT-9 公開頁加 ISR：blog 文章 revalidate=300s、論壇主文 60s（章節內容先前已做）。排行榜含 auth、暫不加
- [x] 20 處裸 `<img>` → `next/image`：**盤查後實際已完成/不適用**。頭像全已是 `next/image`（36 檔在用）；剩餘 raw `<img>` 是 `data:`/base64（playground 輸出、AI 貼圖、next/image 不能優化 data URI）、後台預覽工具、或 LessonImage（燈箱需 plain）——皆正確保持 `<img>`。原 audit 把 data: 圖也算進去高估了

---

## 💰 D. 商業 / 變現

### 報告建議「只做這 3 個」
- [ ] **B1 自動評測 + 綠寶 AI Code Review**：題目附隱藏 test cases、提交自動判對錯 → 發 XP/Z幣 → 一鍵 AI 點評。複用 Pyodide/playground/AI pool/gamification。**留存核心**
- [ ] **B4 可驗證證書 + 課程市集收尾**：證書給 `/verify/[certId]` + QR + LinkedIn 分享；市集補試看/購物車/bundle/優惠碼
- [ ] **C1 學習社群 / Cohort**：期數制、進度夥伴、組隊 streak/Boss
### 第二批（CP 高）
- [ ] B2 SRS 間隔複習、D2 綠寶每週複習報告、C2 賽季排行榜
### Z 幣經濟
- [ ] Z 幣商城 sink（寵物配件 5 + 主題 3）、Z 幣儲值 4 套餐（60/199/499/999）、訂閱監測 dashboard（轉換率/churn）
### 長線先別動
- [ ] B5 職缺媒合板、D1 Z-coin 跨產品錢包

---

## 📚 E. 內容工作

### E1 新手友善化（用 ch26 完整規格，詳見 `BEGINNER_FRIENDLY_BACKLOG.md`）
- [x] **oneLineSummary 錯位修復**：ch02/04/07 手修 78 條 + 全站自動修 23 條（本 session 完成）
- [~] 補「☕ 用人話講」白話總結：**ch01 ✅ 全章 25/25（0603 完成、定標準）**。剩 **69 章**要補（ch02 起）。**標準**：當第一次碰電腦的國中生、**讀每課實際內容**寫、大量生活化比喻（見 ch01 / `daily_works_0603.md`）。覆蓋現況：ch03 12/25、ch05 16/25、ch07 16/28、ch08 14/25、ch16 5/25、ch26 21/35、ch31 12/25、ch32 13/25、其餘多為 0
- [x] oneLineSummary：全站 1163 課 100% 有（0 缺）
- [~] **圖文解說圖**：🖼️ **A 區操作教學圖全做完**（29 張、ch00/01/08/10/17/22/25/26/31/39/48/64 已插好引用 + 燈箱）。**🔴 B 區「概念示意圖」還沒做**（diagram 型：ch07 變數賦值/迴圈、ch02 box model/flexbox、ch04 event loop、ch08 UI=f(state)、ch17 JOIN、ch46 RAG…見 `LESSON_IMAGE_SPEC.md` B 區）→ 等林董生圖放 `public/lesson-img/chNN/` → 依檔名插入（流程同 A 區）

### E2 章節偷懶 / 未補（章節 audit）
- [ ] 真該補：ch60 創業心法(6) / ch57 AI法律(5) / ch58 AI職涯(5) / ch51 AI寫作(6) / ch55 AI行銷(6) / ch56 虛擬IP(6) / ch68 高階工程師(20)
- [ ] 內容未做的章（按舊 BACKLOG P4）：ch47/48/49/50/63（AI 進階）、ch03/11/12/13/14/15（中優先）、ch23/24/25/32/33/34/35（後端+語言）、ch51-58 商業創作
- [ ] 附錄 ch61-67 / 69-70 by design 可不改

---

## 🤖 F. N8N 12 workflow（自架後再開、spec 在 `N8N_INTEGRATION.md`）
- [ ] N1 onboarding 7 天序列、N4 每日 KPI→LINE、N2 流失 winback、N8 客服 AI 分流、N6 AI 路由、N3 內容工廠、N7 通知 fan-out、N5 章節自動發布、N9 Stripe→Supabase、N10 DB backup、N11 異常偵測、N12 release→changelog

---

## 🛠️ G. Admin 後台剩 5 項
- [ ] LT-17 效能 ops（Sentry / PostHog）
- [x] P4-05 KPI 報表 ↔ cron/kpi-email **已查證完整 wired**：`/api/cron/kpi-email` 有 cron auth + 算每日/每週 KPI（註冊/DAU/WAU/訂閱/AI/錯誤/lesson/營收 + 期比）+ Resend 寄 HTML/text 給 ADMIN_EMAILS + 連後台 KPI 頁。只差林董設 cron-job.org 排程 + `ADMIN_EMAILS`/`RESEND_API_KEY`（在 A1）
- [ ] P4-19 教師/助教 role admin 管理介面
- [ ] P4-20 學員作業批改介面

---

## 🌌 H. 未來規劃（v7+、不急）
- [ ] **AI 模型中台升級**（`AI島_AI模型中台升級規格_v1.md`、1603 行）：AI Router 三層模型池 + 成本分級 + Z幣/VIP 經濟。獨立大專案、等 B/D 收尾後啟動
- [ ] Chapter 推薦演算法、全站語意搜尋 UI、Marketing 排程 OAuth、A/B 測 ad copy、ch68 嚴格 spec 重寫
- [ ] 人生星圖（足跡流光整合）— 跨專案、暫緩

---

## ✅ 本 session（0603）已完成（給 context）

- 壞檔程式碼重寫：ch01/03/08/09/10/33（全站壞 playground 23→0）
- 全站 promo / 掛保證大掃除：💼接案小知識 + 🎯面試考點 區塊 + 122 條 promo tip 換真建議
- AI島導覽章節編號修正（ch72→Ch08a 等、12 處改 chapterDisplayNumberById）
- ch71-75 lesson 補回（DB 重新匯入）+ SQL/資料表稽核（126 表全在）
- Supabase egress 優化（metas/nav/sitemap 不拉全文）
- ch26 補「裝完 uv 設環境變數/PATH」段
- **oneLineSummary 錯位修復 101 條**（ch02/04/07 手修 + 全站自動修）
- 5 份報告整合（本檔）+ 新手友善化重排 + lesson_image_audit 補完 492 條
- LINE 客服回覆改 Flex 卡片

> 全部已 commit/push 到 main + 匯入 DB 上線。

---

## 📌 I. Launchpad 看板未完成（2026-06-03 掃描，35 張卡，已排除「已上線」57 張）

### I1 待開發（10）
- [ ] [discord] OAuth 綁定 user + profiles.discord_user_id（為 role/onboarding/slash 鋪管）
- [ ] [discord] Premium role 自動分配（訂閱成立 → grant role）
- [ ] [discord] 新人 onboarding bot DM（guild_member_add → DM 引導）
- [ ] [discord] 學員 slash command /quote /recommend（跨 channel 一致）
- [ ] [discord] 圖片 vision /vision slash（attachment + GPT/Claude vision）
- [ ] [web_front] RWD audit + 修（手機溢出 / touch target / table scroll）
- [ ] [web_front] PWA 升級（manifest 補完 + SW + install prompt + offline）
- [ ] [web_front] a11y 無障礙（semantic HTML / ARIA / 鍵盤 nav / SR）
- [ ] [content] ch68 嚴格按 spec 新手友善化（A 方案、20 lesson）
- [ ] [content] 14 章 strict spec rework（ch55-58 / ch60-67 / ch69-70）

### I2 TODO（15）
- [ ] [tg] TG bot 進階指令一批：/digest 每日摘要、/silence 暫停通知、語音→Whisper、/broadcast、/grant_premium、/vip、/risk、/idea、/me、/journal、/tr、/rewrite、/focus 番茄鐘
- [ ] [web_front] Leetcode 3944 題分類規劃 + 中文題目註解（每頁限題數、可搜尋）
- [ ] [web_front] Leetcode 題目按語言分類（Python/JS/Java/Go/Rust/C++ 各獨立）
- [x] [bug] tgSend webhook 加 2 次 retry —— telegram-webhook 的 `tgSend` 與 notify-admin 的 `sendTelegram` 皆已內建 retry x2（attempt 1→等 500ms→再試）
- [x] [bug] site-audit lesson_count mismatch —— DB 端已查證健康（76 章 / 1163 課、無 0-課章節、ch71-75 各 4-5 課齊）；先前 mismatch 為 production 重新部署延遲，非資料問題

### I3 許願池 / 想法（10，wishlist）
- [ ] PWA 手機 widget（連勝 / 今日目標）
- [ ] AI 自動 chapter audit（標哪章 sub-spec 落後）
- [ ] 學員配對（mentor / peer）
- [ ] 週賽 Code Challenge（每週六線上解題 + leaderboard）
- [ ] 雪鑰主動關懷流失 user（3 天沒登入主動 LINE）
- [ ] AI 訂閱推薦（個人化 Premium 方案）
- [ ] 影片教學整合 YT（每章匹配 YT 內嵌）
- [ ] AI 模擬面試（技術 / 行為 mock）
- [ ] 履歷 / 作品集自動生成（學習紀錄 + LeetCode → PDF）
- [ ] 對外 AI 知識付費 API

> 註：`site-audit lesson_count mismatch` 這條——本 session egress 優化已讓 /api/nav 改吃 getNavChapters + ch71-75 重匯入，可再驗一次是否已解。
