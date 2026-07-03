# Daily Works — 2026-07-04

董事長林董（Luffy Lin）。雪鑰值班。
主題：**金流上線 + 商業模式/Z幣經濟 + 修一堆真壞掉的 + 後台 P1/P2 升級 + 三通訊美化 + TipTap 全做 + roadmap 多波（Lottie/SRS/成長病毒/語意搜尋）+ SEO robots**。超長衝刺、多代理並行。

---

## 💳 金流（課程免費、金流用於 Z幣/Pro）
- `src/lib/payments/*`：config（Z幣套餐 1:10 越多送越多 / Pro 149·1490）+ orders（建單/冪等發貨）+ gateways（**綠界 CheckMacValue / 藍新 AES+SHA / Stripe Checkout**）。
- `src/lib/zcoin.ts`：Z幣帳本 grant/spend/grantOnce（reason code + meta，餘額 `profiles.z_coin`、流水 `coin_transactions`）。
- API：`/api/payments/checkout` + webhook{ecpay,newebpay,stripe} + return/[provider]；UI `/store`（付款方式選擇器）+ `/store/result`；TopNav Z幣可點→/store。
- 使用者自選付款方式；金鑰未設安全隱藏。`docs/payments_setup.md` 列申請金鑰與手續費。**待林董申請金流商金鑰才能真收款。**
- 商業模式提案 + Z幣進出帳設計（來源/去化/儲值階梯）已給林董。

## 🔴 修一堆「真的壞掉/有安全風險」的（稽核揪出）
- **6 個缺失 RPC** 害全站經濟靜默失敗 → 建 5 個並實測（`grant_zcoin`/`award_z_coin`/`increment_profile_xp`/`decrement_hearts`/`delete_user_account`）：島上獎勵/測驗XP/寵物任務/扣血/刪帳號恢復。
- **每日任務系統壞**：`ensure_daily_quests` 等 3 RPC 欄位打錯(reward_xp/reward_z/claimed_at/completed_at 不存在)→0 任務 → 對齊 `xp_reward/z_coin_reward`、修前端、補 daily_quiz 進度、claim 冪等。
- **寵物今日任務白領**：POST complete 沒驗證就發獎 → 加真實活動驗證。
- **`profiles.level` 是生成欄位**，grant/xp + playground 誤寫會 428C9 → 只更新 xp。
- **後台守衛安全洞**：稽核代理誤把 9 個「本地 requireAdmin wrapper」檔改壞害 build 掛 → 揪出還原；另修 12 處 `me.id`→`userId`、playground `add_xp` dead RPC。
- **Deploy 修**：tiptap mention peer 衝突讓 Docker `npm ci` 掛 → `.npmrc` 加 legacy-peer-deps + Dockerfile COPY `.npmrc`。

## 🖥️ 後台升級
- **P1**：今日營運總覽（營收/新用戶/活躍/AI成本/工單/告警，全即時 DB）+ 主動告警引擎 `ops-alerts`（AI超支/異常用量/金流失敗/錯誤暴增/churn→notifyAdmin，門檻 app_settings 可調）+ 金流工作台（訂單/退款/Z幣流水/訂閱/取消）。
- **P2**：Cmd+K 命令面板（模糊搜尋 nav + 即時搜用戶/訂單）+ Feature flags 可視化開關（6 個真旗標+灰度）+ 審計檢視強化 + admin nav 抽單一來源。
- **P3（待續，session limit 中斷）**：AI 營運助手（NL→白名單 metric 查詢）+ admin 效能。

## 💬 三通訊（LINE/Discord/TG）
- 全稽核：學員+管理員所有指令/通知功能正常、大多已 Flex/embed/HTML 美化。
- 修：TG `/broadcast` 讀錯 env 發 0 人、`/risk` `<i>` 未關 400、LINE 看圖回覆陽春。
- **全美化一致**：LINE postback/錯誤/空狀態/用法→Flex 卡片；TG 錯誤→HTML 卡；Discord→embed；順修 `/grant` 取消鈕。

## 🧩 TipTap 全做
- AI BubbleMenu（改寫/續寫/潤稿/翻譯/摘要，`/api/ai/rewrite`）、Slash 指令、Callout、貼圖轉 R2、程式碼區塊升級、FloatingMenu、Markdown 貼上、TOC+閱讀時間、@提及/emoji/匯出/手機工具列。新節點都驗過 sanitizer round-trip。（#4 Yjs 協作待選即時後端。）

## 🎨 全站 emoji→icon + Lottie
- UI/內容 emoji 全換 lucide（後台76檔+主站+章節+創作島+字串型 EmptyState/AdminStatCard/麵包屑）；保留吉祥物/Python/資料值。
- Lottie：自製 4 個 CC0 動畫接 slot（空狀態/慶祝/loading/streak），可 `/admin/lottie-settings` 換。

## 🚀 roadmap 多波
- **AI-P1 記憶**：`/me/ai` 看/改/刪記憶+自訂提示詞/語氣/開關（存 user_ai_memory.preferences），綠寶/導師/寵物全通道生效。
- **BYOK**：真·多把 key（按 id/啟用/自訂 OpenAI 相容 base_url+model）。
- **PWA**：manifest PNG icons + 安裝提示（修重複彈窗）。
- **#59 學習**：SRS 錯題複習佇列（`srs_reviews`, /me/review, Anki ease）+ 章節 AI 隨堂考。
- **#58 成長/病毒**：作品/證書 OG 分享卡 + 公開證書頁 `/certificates/[code]` + 推薦分潤（邀請碼雙方各 50 Z幣、冪等）+ 首頁創作者精選。
- **#61 技術**：語意搜尋 `match_content_embeddings`（backfill 85 筆）+ `/search` 分組；PWA 安裝提示 + a11y。
- **WorkEditor** 改 rich、非 Claude AI 用量記帳、章節一行寫法/CSHARP、定價全免費 等（承 0703）。

## 🔎 SEO / robots
- GSC「robots 封鎖」→ 查出線上 robots 被 **Cloudflare 託管段落覆蓋**（擋 ClaudeBot/GPTBot/Google-Extended，跟 GEO 目標衝突）→ 要在 CF 後台關。
- `robots.ts` 同步：AI 引用爬蟲**只開放 `/chapters` `/courses` `/blogs`**、OG 預覽寬鬆、一般搜尋照常。

## 🔜 未做 / 待續
- **後台 P3**（AI 營運助手+效能，被 session limit 中斷、待重跑）、**#55** AI 批改+學習教練、**#56** 市集上線+作品→SEO一鍵、**#57** 求職閉環、**#54** Web Push（需 VAPID 金鑰）、**#63–65** AI 路由/免費模型/intent、**#74 RBAC**（待林董定角色）、**#4 Yjs 協作**（待選即時後端）。
- 林董手動：申請金流商金鑰、Cloudflare 關 AI 封鎖、Google 同意畫面去 supabase.co、輪替金鑰。

> 註：本日大量用「多代理並行 + 每波 build→commit→push」推進；中段遇 Opus classifier 暫不可用 + session limit，代理 fan-out 一度受限、重置後續跑。

---

## 🚀 尾段補完（roadmap 100% 清空）
- **AI 架構 #63–65**：`ai_usage_models.candidates` 候選鏈（fallback+低信心升級）、circuit breaker、Cloudflare Workers AI provider、`ai_feedback`(usage_key/meta)、`classifyIntent/assembleContext`、WebLLM（runtime 載入、`flag_webllm` 預設關、不進 bundle）。
- **#54 Web Push**：`push_subscriptions` 表 + subscribe/unsubscribe/test API + `sendPushToUser`(VAPID 未設 no-op) + 訂閱 UI(掛通知鈴鐺) + 觸發(讚/留言→作者、連勝快斷 cron) + community 補通知。裝 `web-push`。
- **#75 Yjs 協作**：Supabase Realtime provider(broadcast+presence+awareness) + BlogEditor opt-in collab(預設路徑不變) + `ci_drafts.ydoc` 持久化 + EngineWorkspace 工作室草稿共編+在線人數 + `flag_collab`。裝 yjs/y-protocols/@tiptap/extension-collaboration(+caret)/y-tiptap。
- **#74 RBAC**：角色 owner/admin(超管,全開) + support/marketing/finance/content(分區)；`admin-roles.ts`(section map/canAccessSection)、`requireAdminSection`(requireAdmin 簽名不變)、middleware x-admin-path、layout 單一頁面 gate + nav 依角色過濾(ownerOnly 保留)、敏感金流 API 加 finance 守衛、指派角色防越權；**不碰創作者島嶼工作室角色**。
- **SEO/robots**：`robots.ts` AI 爬蟲只開放 `/chapters /courses /blogs`；Cloudflare「受管理的 robots.txt」林董已關 → 線上生效(不再擋 ClaudeBot/GPTBot)。
- **`docs/OWNER_SETUP.md`**：林董手動待辦 + env 總清單（金流金鑰/cron 排程/VAPID/Cloudflare/選配/安全）。

## ✅ 推前總驗證（2026-07-04 尾）
- `npm run build` ✅ 綠、90 頁。
- **API**：350 route 全 export HTTP method、**DB 欄位錯接 0**。
- **DB**：16 表 / 10 RPC / 7 關鍵欄位 **全部存在**（0 缺）；158 個 migration 全套用。
- **RWD**：全域護欄(body overflow-x hidden + fixed/absolute max-width) + 新頁響應式。

## 📋 只剩林董手動（見 `docs/OWNER_SETUP.md`）
- 🔴 金流金鑰（綠界/藍新/Stripe env + webhook URL + 測試機驗一筆再開 PAYMENTS_LIVE）
- 🟡 3 支新 cron 排程（ops-alerts / learning-coach / streak-reminder，GitHub Actions + CRON_SECRET）
- 🟡 VAPID 同步到 Zeabur
- ✅ Cloudflare AI-bot 封鎖 — 已關、已驗證
