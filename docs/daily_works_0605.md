# Daily Works — 2026-06-05

董事長林董（Luffy Lin）。
主題：**淺色模式全面補完 → 筆記系統大升級（共用/SRS/背景圖…）→ 深淺雙圖片 → 全專案欄位審計 58→0 → Task3 三優化**。

---

## 🎨 1. 淺色模式補完
- **內容程式碼區塊（CodeBlock）**：淺色模式改淺灰底 `#f3f5f7` + 深字（atom-one-light token），暗色維持 atom-one-dark。
- **學習園地編輯器**：
  - 章節用的是 **Monaco**（不是 CodeMirror）→ 加自訂 `ai-light` 主題（淺灰底 + 完整語法色：關鍵字紫/字串綠/數字橘/型別金/函式藍/識別字深灰，不再一片黑）。
  - `/me/playground` 的 CodeMirror 也加淺色主題，跟 `data-theme` 切換。
- **深綠 accent 背景文字**：明亮模式 accent 是深綠 `#1f883d`，黑字看不清 → `.bg-accent` 上的字/圖示一律白字。
- **深淺雙版本圖片**：`LessonImage` 支援檔名含 `dark`/`light` → 深色顯示 `_dark`、淺色顯示 `_light`（縮圖 CSS 無閃爍、燈箱依主題、缺檔自動 fallback 不破圖）。**37 組 / 74 檔**全佈線、15 章內容引用切換、重匯入 DB。

## 📝 2. 筆記系統大升級
- **TipTap 擴充**：字型大小下拉 + **文字顏色 48 色盤**（黑/灰/白＋全色相）+ 自訂取色器；色盤改 **portal 浮層**（不被工具列/編輯器 overflow 裁切）、**選色預覽、按確定才關、取消還原**。
- **便利貼外觀**：每則可選**顏色**、**透明度**；**單獨背景圖**（上傳 + 大小/位移裁切/旋轉、即時預覽）。
- **我的筆記頁**：卡片改 `prose-custom`/`.note-rich`＝TipTap 所見即所得；**收合 ≤ 5 行** + 底部淡出。
- **資料夾分類**：頁面建資料夾、**拖便利貼進資料夾**＝設分類（拖到別張卡＝排序）；分類/標籤**下拉選現有 + 建立新分類**。
- **拖移排序**：`@dnd-kit`，拖曳只在右上「⋮⋮」把手 → 不跟選字打架。
- **複製**：點內容複製整則 / 選一段只複製那段 / **游標處跳「✓ 已複製」氣泡**。
- **置頂 + 搜尋**：釘選排最前；依內容/分類/標籤即時搜尋。
- **標題欄**：`notes.title`（nullable）。
- **共同筆記（邀請碼）**：擁有者**先選權限（可編輯/唯讀）再產生帶 OG 的邀請連結** `/notes/join/[code]`；多人協作、共用面板顯示與誰共用、可解除、協作者可退出；唯讀者編輯器自動 read-only（RLS definer 函式擋寫入、避免遞迴）。

## 🐛 3. 重要 Bug 修正
- **修「筆記抓不到登入」**：SideNav 改用全站 `useAuth()`（getSession + onAuthStateChange），不再卡在「登入後可以記筆記」。
- **修邀請連結 404**：根因是 select 了不存在的 `notes.title`（PostgREST 400 → null → 404），不是 key/部署問題；改用 content 衍生標題後 200。
- **修邀請連結變 `0.0.0.0:8080`**：Zeabur proxy 後 `req.origin` 是內部位址 → 改用 `NEXT_PUBLIC_SITE_URL`。
- **修 AI 對話紀錄空白**：列表 select 不存在的 `persona_id` → 整個查詢 400 → 空白；已移除。

## 🔍 4. 全專案 API/欄位審計（Task 1 & 2）
- **路由**：253 支 API route 全部註冊、有對應接口。
- **DB 欄位接錯：58 → 0**。寫了常駐審計工具 `scripts/audit-db-columns.mjs`（拿真實 schema 比對所有 supabase 查詢）。
  - 批次改名：`lesson_progress.created_at→completed_at`、`error_logs.created_at→occurred_at`、`orders.amount_twd→amount`、`subscriptions.start/end_date→started/expires_at`、`coin_transactions.type→reason`、`ai_conversations.model→model_id`、`quiz_attempts`、`daily_quests`、`ai_api_keys.reset_date→reset_at` 等。
  - 整表名錯：`zcoin_ledger→coin_transactions`（island Z 幣帳）、`error_log→error_logs`。
  - 結構改：`ai_messages` 計數改走 `ai_conversations` join；discord 推薦課改 embed `lessons(...)`；`pets/user_achievements` select id→user_id。
  - 補漏建欄位（migration）：`tickets.body/email`、`subscriptions.granted_by`、`forum_threads/user_blog_articles.deleted_at`、`ai_models.tier`、`profiles.email`(+auth 同步 trigger)、`daily_quiz_attempts.pass`(計算欄)。
  - 沙盒（nami-playground DatabaseLab/FrameworkLab）動態建表，審計略過、非 bug。

## 🚀 5. Task 3 — 筆記三優化
1. **自動儲存 + 草稿還原**：既有筆記停打 1.5s 自動存 DB；新筆記暫存 localStorage、重開自動還原；儲存鈕旁顯示狀態。
2. **共編 presence**：Realtime presence，共用筆記互相看到誰在線上/編輯中（頭像疊層）。
3. **SRS 間隔複習**：`note_reviews` 表 + 簡化 SM-2；卡片加入複習、頁頂「📚 今日複習(N)」面板一鍵評分自動重排。

---

## 📊 數據總覽
- 本日約 **20+ 個 commit**，全部 push 到 main（最後 `81fbe88`）。
- DB migration 共 **18 支**全跑過（內容/欄位/共用/SRS/圖片相關）。
- 欄位審計 **0 錯**；`tsc` + 完整 `next build` **exit 0**。

## ⚠️ 待 redeploy 才生效
> 內容 / DB 已即時上線；以下要 **Zeabur redeploy 到 `81fbe88`** + 強制重整：
- 淺色模式（程式碼區塊、Monaco/CodeMirror 編輯器、深淺雙圖片、accent 白字）
- 筆記全套新功能（共用、SRS、背景圖、48 色、自動儲存、presence…）
- 邀請連結網址 / 404 修正、AI 對話紀錄修正
- **先前 `buildx failed` 是 Zeabur build 端**（本機 build 一直成功）→ 重新部署一次；再失敗貼 build log 文字。

---

# 📋 所有待辦（彙整 0604 + 本日新增；✅=本日完成）

## A. 內容 / 課程
- [ ] **Ch00 零基礎 vs 有經驗分流路徑**（完全沒碰電腦 vs 有 coding 經驗，不同起點/跳課）—— 需先想分流方式（標籤？引導頁？）
- [ ] **strict-spec 重寫**（選配、更高標準）：ch68 高階(20)、ch55-58 / 60-67 / 69-70
- [ ] 附錄 ch61-67 / 69-70 by design 可不改

## B. 圖片
- [x] ✅ **A 區圖片深淺雙版本**（37 組 / 74 檔，light/dark 切換、15 章佈線、重匯入 DB）
- [ ] **B / D / E / F 區概念圖** ~110+ 張（D 前端框架含 CRA、E Python/爬蟲/Node、F 補 ch01-25、B 概念示意）—— 之後同樣出深淺雙版本
- [ ] ch10 `ch10_create_next.png`（暫用 next_vs_nuxt）
- [ ] （可選）ch64 專屬 vscode_zhtw

## C. 部署 / 上線
- [ ] **Zeabur redeploy 到 `81fbe88`**（最迫切）：套用淺色模式、筆記全套、欄位修正、圖片
- [ ] **追 `buildx failed`**：本機 build 一直成功 → Zeabur build 端（build OOM / registry 524 → GHCR fallback SOP）；貼 build log 文字可精準定位
- [ ] 部署後**強制重整**（同檔名圖有快取）
- [ ] TG webhook secret 待設

## D. 林董手動設定（REPORTS_TODO）
- [ ] **Stripe 訂閱**：key → bootstrap → 3 price_id → webhook(6 事件) → secret → 4242 測一筆（注意：subscriptions 欄位本日已對齊 started_at/expires_at/granted_by）
- [ ] **寵物 4 隻 Lottie URL** 貼 `/admin/lottie-settings`
- [ ] **cron-job.org 7 個排程**：student-daily-review / recall-user / leetcode-sync / discord-quote / summarize-memories / launchpad-auto-sync / launchpad-retrospective
- [ ] **Discord 收尾**：bot role 拖到 VIP 之上 + Manage Roles + `DISCORD_VIP_ROLE_ID` / `DISCORD_CLIENT_SECRET`
- [ ] **GitHub Actions secrets**：`CRON_SECRET` / `SITE_URL` 對齊 Zeabur
- [ ] 其餘 env（選設）：OWNER_LINE_USER_IDS / TELEGRAM_* / PISTON_BASE_URL / N8N_*
- [ ] 確認 `NEXT_PUBLIC_SITE_URL` 在 Zeabur 已設（邀請連結 / 登入導向都靠它）

## E. 安全 / 維運
- [x] ✅ **全專案 DB 欄位審計 58→0**（含 9 支補欄 migration、留常駐工具 `audit-db-columns.mjs`）
- [ ] ESLint：清掉幾個 `error 變數未使用` warning（不影響部署）
- [ ] **OPT-8**：RLS `is_admin()` SECURITY DEFINER + 補 index
- [ ] OPT-7 其餘列表 API `select("*")` → 明確欄位
- [ ] Owner 帳號開 MFA/TOTP（Supabase）
- [ ] Cloudflare 擋在 Zeabur 前（DDoS/WAF/Bot Fight）+ 隱藏 origin IP
- [ ] Dependabot + Supabase 定期備份 + 金鑰輪替（AI_KEY_SECRET / CRON_SECRET / service_role）
- [ ] CSP（Report-Only 先行）；註冊/發文加 Turnstile + 蜜罐
- [ ] bundle analyzer 基準 → TipTap/recharts/CodeMirror/Monaco 動態 import 收斂

## F. 功能 Backlog
- [x] ✅ **筆記系統大升級**（共用/邀請權限/資料夾/背景圖/48 色/置頂/搜尋/標題/自動儲存/presence）
- [x] ✅ **筆記 SRS 間隔複習**（Task3-3；B2 的筆記版）
- [ ] **筆記 SRS 接 cron 推播**：每日「📚 今日要複習 N 則」LINE/Email 提醒
- [ ] **B1 自動評測 + 綠寶 AI Code Review**（隱藏 test cases → 自動判對錯 → XP/Z幣 → AI 點評）**留存核心**
- [ ] **B4 可驗證證書** + 課程市集收尾
- [ ] **C1 學習社群 / Cohort**（期數制、進度夥伴、組隊 streak/Boss）
- [ ] B2 全站 SRS（不只筆記）、D2 綠寶每週複習報告、C2 賽季排行榜
- [ ] Z 幣商城 sink + 儲值 4 套餐 + 訂閱監測 dashboard、B5 職缺媒合、D1 跨產品錢包
- [ ] **web_front**：RWD audit 完整版、PWA 升級、a11y 無障礙
- [ ] **N 系列自動化（n8n）**：onboarding / KPI→LINE / winback / 客服分流 / 內容工廠 / 通知 fan-out / 章節自動發布 / Stripe→Supabase / DB backup / 異常偵測 / release→changelog
- [ ] **discord**：OAuth 綁定、Premium role 自動分配、新人 onboarding DM、slash 指令
- [ ] **AI 模型中台升級**（v1 規格 1603 行；ai_models.tier 本日已補欄）
- [ ] LT-17 效能 ops（Sentry/PostHog）、P4-19 教師/助教 admin、P4-20 作業批改介面
- [ ] Chapter 推薦演算法、全站語意搜尋 UI、人生星圖

> 來源：`docs/daily_works_0604.md`、`REPORTS_TODO`、`BACKLOG.md` + 本日進度。
