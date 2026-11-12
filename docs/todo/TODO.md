# AI 島 — 全專案待辦（2026-11-13 更新）

> 完成的項目用 ~~刪除線~~ 保留、不刪除。
> **詳細版（含背景、檔案位置、驗證方式）＝ `docs/todo/todo_list_1113.md`（現行主檔）**；本檔是一頁看完的總覽。歷史檔：`todo_list_0806.md`、`todo_list_0916.md` 及更早。
> 圖例：🔴 要林董本人做 · 🧭 要林董拍板 · 其餘我可以直接做。

---

## 🗓️ 2026-11-12～13 完成（劃掉保留）
- ~~Zeabur → Vercel 遷移（11/09）：after() 背景任務、上傳直傳 R2、課程圖搬 R2、Next 15.5.28~~
- ~~簡體中文（zh-CN，OpenCC 從繁體轉）+ AutoTranslate 補翻所有語言寫死的中文 + en/ja/ko 補 10 個缺 key~~
- ~~待辦大掃描：4 組子代理逐項對照程式/DB/git，重整成 `todo_list_1113.md`~~
- ~~清 Zeabur 殘留提示（後台/API 全改 Vercel）、隱私頁託管改 Vercel + R2 + 揭露自動翻譯~~
- ~~刪 5 支孤兒 API；`/admin/marketing/publish` 改名「發佈通路狀態」、修 blog 死連結~~
- ~~Sentry 錯誤監控上線（org snowrealm / 專案 javascript-nextjs，測試事件已收到）~~
- ~~章節：ch38/39/50 最後 8 題罐頭題換量身題；74 課補互動教具 → 主線 ch00–60 + 76–79 全部 0 缺口~~
- ~~章節：移除收入保證與「被動收入／躺著收錢」說法（18 課含 tip、miniQuiz）；移除教規避反爬段落（28.25/30.24/30.25）~~
- ~~晨報 `daily-brief` 加同日防重送~~
- ~~GitHub Actions 12 個排程（實測延遲數小時）→ Vercel Schedules（14 條，已驗證執行成功）~~

---

## 📋 現行全部待辦（2026-11-13）

### 🔴 要林董本人做
- [ ] 金鑰輪替（Zeabur 10/14 資安事件）：Supabase / CRON_SECRET / LINE / Discord / Telegram / AI / R2 → 改 Vercel env + GitHub secrets → redeploy
- [ ] cron-job.org 確認還在：`daily-brief`(08:30)、`agent-schedules`(15 分)、`opportunity-deadlines`(09:00)、`keep-warm`、`ga4-sync`
- [ ] 金流正式金鑰（Stripe / 綠界 / 藍新）+ Stripe 產品 price_ids + webhook secret → Vercel env → 測試
- [ ] LINE 登入：`LINE_CHANNEL_SECRET` 在 Vercel env、Callback URL 完全一致
- [ ] VAPID / `EMAIL_FROM` / Google OAuth 同意畫面去掉 supabase.co
- [ ] 通路帳號：TG / Discord bot token、Meta App 審核、X、YT / 抖音開發者
- [ ] 搜尋金鑰加量（Brave / Tavily）
- [ ] 機會島：定期審來源待審佇列、unverified 機會人工覆核
- [ ] 安全帳號：Owner MFA、Cloudflare WAF、Dependabot、備份、刪多餘 OAuth client
- [ ] 生圖素材：首頁 5 層視差、角色去背、夜景 CTA / 模式小圖、課程操作圖 110+ 張
- [ ] Lottie URL：寵物 4 隻 + 訊息軍師 12 情境
- [ ] 實機測試：語音代理（Android / Windows Chrome）、手機 nav 透明度
- [ ] 桌面助手 release（ai-island-bridge 推 `v*` tag）
- [ ] （可選）Sentry auth token → 上傳 source map

### 🧭 要林董拍板
- [ ] 付費 gating 深化（兩套 Stripe 收斂、plus/pro 分層、加幣路徑收斂、統一 402 gate）
- [ ] 要不要做付費章節
- [ ] Z 幣單次購買定價（運勢 / 訊息軍師 / 求職包 / 晨報進階）
- [ ] Creator Island 真金流市集 + KYC
- [ ] AutoTranslate 要不要排除後台與 bot 回覆

### 🛠️ 穩定 / 技術債
- [ ] CSP 從 Report-Only 轉正式
- [ ] Turnstile + 蜜罐（需 Cloudflare site key）
- [ ] 效能：`select("*")` 393 處、`is_admin()` SECURITY DEFINER + index
- [~] 法律頁：~~隱私頁託管/翻譯揭露~~ ✅；terms / cookies 與 Agent 對外動作、外部帳號、個資保存期限待補
- [ ] v1 API key 後台停用 / 輪替 UI
- [ ] DB schema 逐表核對 migration
- [ ] AI 成本記帳 P2–P4
- [ ] 測試：E2E / Smoke 擴充、Creator Island M5、3D 島降耗
- [ ] （可選）cron-job.org 剩下 7 個排程搬進 Vercel Schedules
- [ ] 移除 rollup 4.61.1 覆寫（升級 Sentry / rollup 時）
- [ ] `docs/setup/cron-setup.md` 改寫成現況

### 🌅 每日情報 / Widget
- [ ] Widget：齒輪設定表單、多版面、Phase A 補 5 個、Phase B 串資料 5 個、AI 島特有 6 個、Space 端同步
- [ ] 背景 Phase 4b：lottie 場景 + 自訂圖片上傳 + 後台
- [ ] 晨報 LLM 天氣建議接線、獨立 ⏰ 提醒塊

### 🎨 首頁 / UI
- [ ] StageMap 接真實學習進度
- [ ] 玻璃 / 動效外溢到章節、辭典、機會島
- [ ] 後台一鍵健檢頁、`/admin/strategy` 半動態、後台視覺美化
- [ ] 高流量頁 i18n 正式化（首頁、/me、/agent、/opportunities、/creator-island）

### 🤖 分身島 Agent
- [ ] LINE 使用者 Rich Menu / LIFF
- [ ] Telegram / Discord agent 入口 + 統一 Bridge（需 token）
- [ ] 社群發布中心 send adapter + 排程發布 + AI 起草→批准→發 + DM 收件匣
- [ ] 外部工具 OAuth（Gmail / Calendar / Drive / GitHub / Notion）
- [ ] Credential Broker
- [ ] OpenClaw 好設計：記憶 md 匯出入、SKILL.md 匯入、HEARTBEAT 自主策略
- [ ] 技能安全掃描 → 技能市集 / MCP Marketplace
- [ ] 公開行銷對照頁「托管安全 vs 自架風險」
- [ ] 員工協作、AI 公司世界觀、工作空間 Hub、AI COO、效率排行、benchmark、技能 YAML、內建技能
- [ ] WhatsApp / Signal / Slack、NemoClaw 評估
- [ ] 裝置自適應輪詢 / Realtime
- [ ] 桌面助手升級（另一個 repo）
- [ ] 語音 Whisper / Piper 預留類別

### 🎯 機會島
- [ ] V2：AI 追問、能力圖譜、推薦透明化、專屬頁
- [ ] V3：練習階梯、截止日 .ics、評審分析、海報 / 影片腳本、學習閉環
- [ ] 雷達：PDF 規則 + 版本 diff、來源分頻
- [ ] 機會地圖、V5 Opportunity OS

### 🐾 寵物照顧（`/petcare` + `user_pets`）
- [ ] AI 寵物翻譯、寵物運勢 / 性格測驗、生命提醒管家、（候選）症狀初篩 / 藝術照 / 餵食計算機

### 💰 社群 / 變現（工程側）
- [~] Z 幣：~~儲值套餐~~ ✅、~~商城 sink~~ ✅；缺付款監測 dashboard、Z 幣綁 Agent、點數代管
- [ ] 學習社群 / Cohort、SRS 複習、週報、賽季排行
- [ ] 直播答疑、企業方案、職缺媒合（長線）
- [ ] 綠寶 AI Code Review、Creator Island 收尾（Workflow 編輯器 / Knowledge / skill tree / 記憶管理頁）

### 📚 內容
- [ ] 辭典 2583 → 5000（從 `dictionary-seed-82.json` 接）
- [x] ~~罐頭練習題清零~~、~~主線章節互動教具 0 缺口~~、~~收入保證清理~~
- [ ] 新互動元件（Tokenizer / SortingViz / SqlPlayground / GitGraph …）
- [ ] deep-rewrite（視需要）、語言島、計畫書對齊、手寫種子 top-up
- [ ] AI 草稿語意抽查（手動 QA）

### 🌙 長線
- [ ] AI 模型中台、章節推薦 + 語意搜尋、其他島嶼、AI 老師市集、紫微斗數、N8N workflow
- 點子池：發票對獎、AI 取名、喝水 streak、解夢、生日送禮、陪伴角色、合約白話、老照片修復

---

# 📜 歷史（2026-06-23 版，保留）

## ✅ 已完成（2026-06-23 大批次，劃掉保留）
### 大功能
- ~~沙盒 stdin 互動 + 圖表（input() 讀 stdin、matplotlib 出圖）~~
- ~~每日測驗難度自適應（近 14 天答對率動態調 effectiveR）~~
- ~~學習進度儀表板 /me/dashboard（掌握度/時間/準確率/最遠vs完成）~~
- ~~部落格留言/反應/TOC/閱讀進度（查證早已具備）~~
- ~~R2 大檔 presigned 直傳（影片 ≤500MB；R2 CORS 已設）~~
- ~~離線 PWA 章節快取（sw.js v6 + 存離線鈕 + 離線橫幅）~~
- ~~e2e 煙霧測試（scripts/smoke-test.mjs 11 路由 + 每日 GH workflow）~~

### AI / 後台 / 費用
- ~~providerFromModel 去重（resolve-usage-ai + completeForUsage 智慧備援）~~
- ~~OpenRouter 接成 provider + 後台可設 key + 串流額度滿自動換備援模型~~
- ~~AI 費用：callAI 全記 ai_model_usage；usage 頁合併 web(ai_usage_daily)+bot 來源~~（殘差=CLI 腳本不經 App）
- ~~測 key 支援 openrouter/groq（原顯示 unknown）~~
- ~~owner-only：/admin/ai/usage、conversations、/admin/users/[id]（含列表連結）~~
- ~~admin/users 角色加 owner 選項（同步 is_owner）~~
- ~~測 key 結果顯示在 provider 旁；圖片可只傳圖不打字~~

### 經驗 / Z幣 + 部落格
- ~~XP/Z幣明細（ledger-labels + admin/users/[id] + /me/ledger + 補帳「明細」欄）~~
- ~~修 /api/me/feed 部落格連結（用 blog_slug、修 404）~~
- ~~部落格公開頁美化（閱讀時間/訂閱/更多文章/可點標籤/系列上下篇/回到頂部）~~
- ~~文章自訂 slug；上傳影片/音樂內嵌；slug 大小寫不敏感~~

### 後台 / 系統
- ~~/api/version + admin header 🚀 部署版本角標~~
- ~~AI 草稿抽查自動化（scripts/audit-miniquiz.mjs：1238 題 0 錯）~~
- ~~章節掌握度推薦複習（skim 節數）；AI 導師串課程上下文~~
- ~~YouTube/Vimeo 內嵌鈕；ci(docker.yml) 重部署 continue-on-error~~
- ~~修 3D 島開關（鍵名不符 island_enabled→feature_island_enabled）+ 首頁 ISR~~
- ~~修 title 79→80 章（補漏掉的 ch00 環境準備）~~
- ~~系統設定：死開關接上(blog/forum/signup gate)、改 on/off、整合 app-settings→settings~~
- ~~終端機可打指令（nami-playground 預設 shell + nami-ide 加整合終端機，Wandbox 沙盒）~~
- ~~BYOK 強化：/settings/ai-keys 加驗證 + OpenRouter + 模型提示 + /me 入口~~
- ~~上傳支援所有圖/影/音格式 + 手機原生相簿 + 部落格任意檔案附件 + 拖放/貼上~~
- ~~leetcode 題庫加量（93 → 374）~~
- ~~owner 收斂（luffysky004→member、luffysky00 唯一 owner）；R2 CORS 已設~~

---

## 🔴 待林董處理（非程式、要你決定 / 設定）
- [x] ~~**確認部署**：Zeabur 手動 Restart 拉 `:latest`；admin header 右上 🚀 角標應顯示最新 commit。~~ 作廢：11/09 已搬到 Vercel，push main 自動上線。

## 🟡 待辦 / 之後
- [x] ~~**PWA icon**：補 PNG 192/512 maskable。~~ ✅ 已有 `logo-192/512.png` + maskable（`src/app/manifest.ts`）
- [x] ~~**GDPR `user_settings`**：表不存在、gdpr/export 默默漏掉 → 建表 or 刪那行。~~ ✅ 已改查 `user_blog_settings` + `email_subscriptions`
- [ ] **（選配）自架 Piston 加速**：需 VPS（Vercel 也跑不了、需特權容器）。設 `PISTON_BASE_URL`。
- [x] ~~**大檔上傳 OOM 防護**：目前文件附件走 server 記憶體（ai 島 25MB / insight 500MB），
      要真正無限大需改 presigned 直傳（insight 影片尤其）。~~ ✅ 11/09 `postUpload()` 超過 4 MB 自動 presign 直傳 R2（Vercel 4.5 MB 上限）
- [ ] **AI 草稿語意抽查**：結構已自動驗過（0 錯），答案「對不對」仍建議人工抽看。

> 完整脈絡見 `docs/worklog/daily_works_*.md`。
