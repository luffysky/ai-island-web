# AI 島待辦總表 2026-11-13（**現行主檔**·11/13 凌晨更新）

> 由 `todo_list_0806.md`（586 行）＋ `todo_list_0916.md` 重新整理。2026-11-13 用 4 組子代理逐項對照「程式碼 + DB + git log」核對，**只留真的還沒做的**；核對時發現「做了但沒劃掉」的列在文末〈附錄 A〉。舊檔降為歷史存查、之後只更新本檔。
> **背景變動**：2026-11-09 已從 Zeabur 遷到 Vercel（Zeabur 2026-12-31 停運）。舊檔裡「Zeabur env / GHCR image / ENABLE_SERVER_BROWSER」相關項目全部作廢或改寫。
> **圖例**：`[ ]` 未做 · `[~]` 部分完成（寫明缺什麼）· `[x]` 完成（劃線保留）· 🔴 需林董本人操作 · 🧭 需林董拍板決策 · ＊ 原則。
> **完成的用刪除線 `~~...~~` 標記、不要刪。**

---

## 🅰 需林董本人操作 🔴

- [ ] 🔴 **金鑰輪替**（Zeabur 10/14 資安事件）：Supabase service key、CRON_SECRET、LINE/Discord/Telegram token、AI 金鑰、R2 金鑰… 輪替後改 Vercel env + GitHub secrets，再 redeploy。
- [ ] 🔴 **確認 cron-job.org 排程**：運勢推播（`fortune-daily`）與機會島雷達（`opportunity-radar`）從 DB 看搬家後**仍每天準時在跑**。下列沒有執行紀錄可查，請到 cron-job.org 確認都在：`daily-brief`（每日晨報 08:30，舊檔要你新增的 #10；已加同日防重送，重複觸發也只送一次）、`agent-schedules`（15 分）、`opportunity-deadlines`（09:00）、`keep-warm`、`ga4-sync`。（想搬進 Vercel Schedules 一句話就能做，見 A1.15。）
  - ~~GitHub Actions 的 12 個排程~~ ✅ 1113 已搬到 **Vercel Schedules**（`vercel.json` 14 條、已驗證執行成功），GitHub workflow 只留手動觸發。
- [ ] 🔴 **金流**：Stripe／綠界／藍新正式金鑰、Stripe bootstrap 3 產品 + price_ids、webhook signing secret → 貼 **Vercel env** → redeploy → 4242 測試。
- [ ] 🔴 **LINE 登入**：`LINE_CHANNEL_SECRET` 確認 **Vercel env** 有、且對應同一個 Login channel；LINE Console Callback URL 要完全等於 `https://ai-island-web.snowrealm.pet/auth/line/callback`。（Vercel 建置時自己 inline `NEXT_PUBLIC_*`，GitHub secret 只影響 CI。）
- [ ] 🔴 **VAPID / EMAIL_FROM / Google 同意畫面**：Web Push VAPID 貼 Vercel env；確認寄件 `EMAIL_FROM`；OAuth 同意畫面去掉 supabase.co 字樣。
- [ ] 🔴 **通路帳號**：TG BotFather token、Discord bot token + VIP role、Meta App（FB/IG/Threads 審核）、X、YT/抖音開發者。（解鎖 §B2 通路、§B3 社群發布）
- [ ] 🔴 **搜尋金鑰加量**：Brave/Tavily key 貼 `/settings/ai-keys`。
- [ ] 🔴 **機會島**：定期審 `/admin/opportunities/sources` 待審佇列、加信任 RSS；unverified 機會人工覆核。
- [ ] 🔴 **安全帳號**：Owner MFA、Cloudflare WAF、開 Dependabot（repo 目前沒有 `.github/dependabot.yml`，要我加也行）、定期備份、刪除多餘 client OAuth。
- [ ] 🔴 **生圖素材**（卡住首頁 5 層視差、模式卡、§4.1.4 圖文解說）：五層 stage-layer 同尺寸對齊版、三隻角色去背、夜景 CTA／五模式小圖、課程操作圖 110+ 張（現 61 張）。見 `index-img.md`。
- [ ] 🔴 **Lottie URL**：寵物 4 隻 + 訊息軍師 12 情境（`/admin/lottie-settings`，沒貼也會 fallback 動）。
- [ ] 🔴 **實機測試**：語音代理（Android/Windows Chrome、拒權限、中英混合、popup 被擋）、手機 nav 展開透明度（`TopNav.tsx`）是否還要調。
- [ ] 🔴 **桌面助手 release**：推 `v*` tag 觸發 ai-island-bridge 三平台 build → 更新 `DESKTOP_DOWNLOAD_URL`。

## 🧭 需林董拍板（決定了才能動）

- [ ] 🧭 **付費 gating 深化**（建議單獨開對話）：①兩套 Stripe 收斂（`payments/` vs 舊 `me/checkout`+`stripe.ts`）②plus vs pro 分層真正生效 ③兩條加幣路徑收斂（`zcoin.ts` vs gamification/referral）④統一 402 gate helper。詳見記憶 `monetization-gating-map`。
- [ ] 🧭 **付費章節**：全站目前沒有「付費章節」概念（`PaywallOverlay` 是孤兒），要不要做？
- [ ] 🧭 **Z 幣單次購買**：運勢（每日私人推播）、訊息軍師（進階語氣包）、求職包（一次性產包）、晨報進階版——定價。
- [ ] 🧭 **真金流市集 + KYC**（Creator Island）。
- [ ] 🧭 **AutoTranslate 範圍**：後台 `/admin` 與 bot 回覆要不要排除自動翻譯。

---

## A. 可以直接做的工程（不需外部帳號）

### A1. 穩定 / 技術債（建議先做）
- [x] ~~A1.1 **Zeabur 殘留文字**：src 約 60 個檔（多在後台 env/ops/discord/ga4/email 測試頁）仍寫「去 Zeabur 設定」→ 改 Vercel；`docs/setup/cron-setup.md` 改寫。~~ ✅ 1113（後台/API 提示全改 Vercel、隱私頁託管改 Vercel+R2+Google 翻譯；剩歷史註解不動）。⬜ `docs/setup/cron-setup.md` 仍待改寫。
- [x] ~~A1.2 **清 5 支沒人呼叫的 API**（已確認 src 內無呼叫端、git 可還原）：`api/me/checkout`（等 🧭金流收斂再刪）、`api/store/inventory`、`api/review/list`、`api/me/learning-plan`（base，`/generate` 保留）、`api/creator-island/assets/[id]/lineage`、`api/me/recommended-chapters`（/me 直接走 server）。~~ ✅ 1113 刪 5 支；`api/me/checkout` 保留等金流收斂。
- [x] ~~A1.3 **後台空殼**：`/admin/marketing/publish` 全是靜態卡、blog 卡連到字串 `"/admin/blog (待建)"`（死連結）→ 改名「發佈通路狀態」+ 移除死連結或補 `/admin/blog`。~~ ✅ 1113（改名、blog 指向 `/admin/blog-seed`、內部入口改走 adminHref）
- [x] ~~A1.4 **監控**：Sentry 上線~~ ✅ 1113（org `snowrealm`、專案 `javascript-nextjs`（歐洲區）；Vercel env `NEXT_PUBLIC_SENTRY_DSN` 已設 production+preview、redeploy 後實測正式站 bundle 帶 DSN、測試事件已進 Sentry）。⬜ 可選：Sentry auth token 設 `SENTRY_AUTH_TOKEN/SENTRY_ORG=snowrealm/SENTRY_PROJECT=javascript-nextjs` → 上傳 source map 看得到原始碼行號；PostHog。
- [ ] A1.5 **CSP 從 Report-Only 轉正式**（`next.config.mjs:65`，先看回報有沒有誤擋）。
- [ ] A1.6 **Turnstile + 蜜罐**：註冊/登入/留言/表單（目前 0 實作；Turnstile site key 需 🔴 Cloudflare 申請）。
- [ ] A1.7 **效能**：`select("*")` 還有 393 處 → 熱門路徑先改明確欄位；RLS 用的 `is_admin()` 改 SECURITY DEFINER + index（目前找不到定義）；平台附件上傳 OOM 檢查。
- [~] A1.8 **法律頁更新**（1113 ✅ 隱私頁第三方服務已改 Vercel + R2、揭露自動翻譯；其餘待補）：`/privacy`（5/25）、`/terms`（5/19）、`/cookies` 補：Agent 對外動作、連結外部帳號、機會島來源、@提及、個資保存期限、自動翻譯送 Google、Vercel/R2 資料位置。
- [ ] A1.9 v1 API key **後台**停用/輪替 UI（使用者自助頁 `/me/api-keys` 已有）。
- [ ] A1.10 DB schema 逐表核對 migration（`audit-db-columns.mjs` 已跑、無新破綻，剩人工逐表）。
- [ ] A1.11 AI 成本記帳 P2–P4（語意快取推廣、路由統一、RAG/vision；embeddings/Whisper/og 殘留記帳）。
- [ ] A1.12 測試：E2E + Smoke 擴充；Creator Island M5（tests/a11y/perf/security-review）；3D 島嶼降耗。
- [x] ~~A1.13 **排程可靠性**：GitHub Actions 排程實測延遲數小時（agent-reaper 設 15 分一天只跑 3 次、09:00 的 line-daily 05:04/16:08 才跑）~~ ✅ 1113 12 個 workflow 排程 → Vercel Cron → 再改 **Vercel Schedules**（`vercel.json` `schedules`、path 目標 GET、UTC 不變）；`vercel schedules executions list agent-reaper` 實測 2/2 succeeded。
- [x] ~~A1.14 **晨報防重送**：`/api/cron/daily-brief` 沒有 dedupe，重複觸發會送兩次~~ ✅ 1113 台北當日已送過就跳過（notifications 標記，同 fortune-daily）。
- [ ] A1.15（可選）cron-job.org 剩下的 7 個排程也搬進 Vercel Schedules（要先在 cron-job.org 停掉對應 job，避免兩邊各打一次）。
- [ ] A1.16 依賴：`package.json` `overrides.rollup = 4.61.1`（rollup 4.66.0 平台二進位不存在）——之後升級 Sentry / rollup 時移除並重驗建置。
- [ ] A1.17 `docs/setup/cron-setup.md` 改寫成「Vercel Schedules + cron-job.org」現況（仍寫 Zeabur）。

### A2. 每日情報 / 晨報 / Widget
- [~] A2.1 **Widget 首頁 2d**：✅ 引擎 + 8 個 widget（datetime/dice/countdown/anniversary/mini_calendar/world_clock/todo_list/breathing）+ `/home` 拖拉存 DB。缺：
  - [ ] A2.1.1 WidgetSettings 齒輪設定（依 `config-fields.ts` 自動產表單）
  - [ ] A2.1.2 多 layout 版面管理（目前只有單一 layout）
  - [ ] A2.1.3 Phase A 補完：HabitTracker、DailyWords、Fortune、ThemeSwitcher、BackgroundControl
  - [ ] A2.1.4 Phase B 串資料：Weather、CreativeStreak、GoalTracker、DailyCard、AgentMessage
  - [ ] A2.1.5 AI 島特有：Z 幣/AI Dot 餘額、今日學習任務、AI 新聞、匯率、GitHub commit、AQI 空品
  - [ ] A2.1.6 Space 端同步（跨 repo `luffysky/snowrealmspace`，另立一輪）
- [ ] A2.2 **背景 Phase 4b**：lottie 動態場景（dotlottie-wc）+ 自訂圖片上傳（`backgrounds` bucket 已備）+ 後台管理。
- [ ] A2.3 晨報 LLM 版天氣建議接線（`buildWeatherAdvicePrompt` 寫好沒人呼叫；目前走零成本確定性版）。
- [ ] A2.4 晨報獨立 ⏰ 提醒塊（回診/自訂提醒；現在只有截止日提醒混在 3 件事裡）。

### A3. 首頁 / 全站 UI
- [ ] A3.1 WorldMap/StageMap 接真實進度（`StageMap.tsx:52` `stateFor()` 用預設 `currentStage=1`）。
- [ ] A3.2 玻璃/動效外溢到章節、辭典、機會島（目前章節 0/4、辭典 0/4、機會島 1/12 頁用）——一區一區換、驗亮暗 + RWD。
- [ ] A3.3 後台「一鍵健檢」聚合頁（health/site-audit/db-check/errors/ga4 收成首屏卡）。
- [ ] A3.4 `/admin/strategy` 半動態：接 `competitor_snapshots` 自動追競品。
- [ ] A3.5 後台整體視覺美化（持續）。
- [x] ~~A3.0 **簡體中文 + 補翻所有語言**~~ ✅ 1112（zh-CN 用 OpenCC 從繁體轉、AutoTranslate 補翻寫死中文、`ui_translations` 快取表、en/ja/ko 補 10 個缺 key）
- [ ] A3.6 i18n 正式化：首頁、/me、/agent、/opportunities、/creator-island 的寫死中文抽成 i18n key（現在靠 AutoTranslate 機器補翻）。

### A4. 分身島 Agent
- [~] A4.1 LINE 入口：✅ `/分身` 建任務；缺使用者用 Rich Menu（現有的是 admin 的）/ LIFF。
- [ ] A4.2 Telegram / Discord agent 入口（現有 webhook 是 admin AI-chat、沒接 `launchAgentTask`）→ 統一 Bridge（LINE/TG/Discord 共用「訊息→task→回填」+ 聊天內批准）。（需 🔴 token）
- [ ] A4.3 **社群發布中心 send adapter**（`src/lib/social/` 不存在、目前只有 CRUD）：LINE/TG/Discord 先接 → 排程發布 cron → AI 起草→批准→發 → DM 收件匣；Meta 系需 🔴 OAuth；抖音/小紅書/Dcard 只能手動。
- [ ] A4.4 外部工具 OAuth（Gmail/Calendar/Drive/GitHub/Notion）（需 🔴 各平台 app）；解鎖「讀信箱/加行事曆」範本。
- [ ] A4.5 Credential Broker（`agent_credential_refs` 表未建）；L4 憑證/系統操作流程。
- [ ] A4.6 **吸收 OpenClaw 好設計**：記憶匯出/匯入 `AGENTS.md`/`SOUL.md`/`MEMORY.md`；`SKILL.md` 相容匯入；HEARTBEAT 式可讀自主策略。
- [ ] A4.7 **技能安全掃描**（匯入/發布前掃 prompt injection、資料外洩、越權）→ 技能市集/MCP Marketplace（規劃書 `docs/island/分身島規劃待閱.md` §四）。
- [ ] A4.8 公開行銷對照頁「托管安全 vs 自架風險」（現在只在 admin-only `/admin/strategy`）。
- [ ] A4.9 員工協作（L5）、「登入＝AI 公司」世界觀、工作空間 Hub（規劃書 §二）、AI COO（§三）、跨用戶效率排行（admin）、Cost-per-Task benchmark、MCP 外部實戰測試、技能 YAML 規格、內建技能 workflow（GitHub 管家/檔案整理師）。
- [ ] A4.10 多通路擴充 WhatsApp/Signal/Slack；NemoClaw 沙盒相容評估。
- [ ] A4.11 裝置傳輸升級：先做自適應輪詢（`bridge/poll`）；真即時要 device-token→JWT 走 Supabase Realtime（Vercel 不能跑常駐 WS）。
- [ ] A4.12 桌面助手升級（**ai-island-bridge 另一個 repo**）：offline agent loop、自動更新、更多本機 skill、Windows UIA、macOS、Tauri、WebSocket/E2E、真人 Demo；Android 原生（需 Kotlin 環境）。
- [ ] A4.13 語音預留類別位 `WhisperLocalSTT`/`PiperLocalTTS`（目前只在 roadmap 文件）。

### A5. 機會島
- [ ] A5.1 V2：AI 聊天追問、能力圖譜、推薦透明化、AI 島專屬頁。
- [ ] A5.2 V3：練習階梯（現只有 30 秒電梯簡報 → 補 1/3/10 分）、截止日加到 Google Calendar（先做 `.ics` 下載，免 OAuth）、AI 成熟度/對手/歷屆評審分析、海報/影片腳本、學習閉環。
- [ ] A5.3 雷達：PDF 規則解析 + 歷次版本 diff（現只在審核時記欄位 diff）、來源分頻（每個來源自己的抓取頻率）。
- [ ] A5.4 機會地圖、PDF 版本頁。
- [ ] A5.5 V5 Opportunity OS（十層機會/配對組隊/成長時間軸/Team/代報名）、Pipeline 跨島、方案分層。

### A6. 寵物照顧（新區 `/petcare` + `user_pets` 表，**不可佔用吉祥物的 `pets` 表與 `/me/pet`**）
- [ ] A6.1 AI 寵物翻譯（照片/描述 → 牠想說什麼；分享卡）
- [ ] A6.2 寵物運勢 / 性格測驗（複用運勢 infra）
- [ ] A6.3 寵物生命提醒管家（疫苗/驅蟲/回診/生日 LINE 推播）
- [ ] A6.4（候選）症狀初篩（⚠️醫療紅線：只衛教、一律導獸醫）、藝術照（生圖成本）、餵食計算機

### A7. 社群 / 變現（工程側）
- [~] A7.1 Z 幣經濟：✅ 儲值 5 套餐、✅ 商城 sink（`/store` 外觀/寵物/加成/解鎖）；缺：訂閱付款監測 dashboard、Z 幣綁 Agent 動作、點數代管。
- [ ] A7.2 學習社群 / Cohort 使用者端（`study_groups` 表不存在）：期數制、組隊 Boss、讀書會。
- [ ] A7.3 SRS 間隔複習、每週學習週報、賽季排行榜。
- [ ] A7.4 直播/即時答疑（`live_sessions`）、企業方案（`organizations`）、職缺媒合、跨產品錢包（長線）。
- [ ] A7.5 綠寶 AI Code Review endpoint（`api/creator-island/ai/` 沒有 code-review）。
- [ ] A7.6 Creator Island：Workflow 視覺編輯器、Knowledge 區、Growth skill tree、記憶管理頁（TasteLibrary 有列/加，缺編輯刪除管理頁）、外部 cross-post OAuth（🔴）。

---

## B. 內容（持續性）

- [ ] B1 **辭典續寫到 5000**（現 **2583**，從 `dictionary-seed-82.json` 接；author → `import-dictionary.mjs` → `translate-sync-all.mjs` → commit）。
- [x] ~~B2 **殘留罐頭練習題**（舊檔寫「全站 0」不正確）：ch38（38.2/3/5/6）、ch39（39.9/39.10）、ch50（50.21/50.22）還是同一句「安裝工具跑 hello world」→ 換量身題，Python 編輯 JSON + `import_chapters_to_db.mjs`。~~ ✅ 1113 8 課換量身題、已 import DB
- [x] ~~B3 **互動教具補缺口**（舊檔說 ch1–11 100% 不正確）。0 缺口：ch01/07/13/16/17/19–22/26/31–41/43–45/47/48/51–60/68/71/76–79。還有缺口（沒沙盒也沒教具的課數）：
  - ch00(3)、ch02/04/05/06/08/09/11/24/27/29/42(各 1)、ch10/23/25/28(各 2)、ch03(5)、ch30(3)、ch12(8)、ch14(4)、ch15(6)、ch18(4)、ch46(6)、ch49(5)、ch50(10)
  - ch72–75 進階（3–4 課）視需要；ch61–67/69–70 速查附錄**刻意不塞**。~~
  - ✅ 1113：74 課補互動教具（scenario-judge/decision-quiz/workflow-flow/agent-loop/prompt-lab/color-contrast），**主線 ch00–60 + 76–79 全部 0 缺口**，27 章已 import DB。剩 ch61–75 附錄/進階（刻意不塞 / 視需要）。
- [x] ~~B2b **還有 28 課提到月入/年收**，要逐課判斷是市場薪資資訊還是收入保證（違反「不掛保證」）：18.15、27.1、28.24、28.25、29.5、29.6、29.17、35.6、37.4、41.3、41.6、42.3、42.6、43.24、47.22、50.17、50.25、51.5、51.6、53.6、56.1、56.6、59.21、60.5、66.5、68.15、77.7、77.21。（1113 已修 14.9/14.20/39.11，並移除 28.25/30.24/30.25 教規避反爬的段落）~~ ✅ 1113 逐課判斷：免責聲明、事實數據（Unity 授權門檻、公司營收、ML 範例欄位、OKR/燒錢率範例）保留；真正的保證與「被動收入／躺著收錢」說法改寫，含 tip 與 miniQuiz 解析（測驗正解不變），示意試算一律標「不是保證」。共 15 課、9 章已 import DB。
- [ ] B4 新互動元件：Tokenizer、SortingViz、SqlPlayground、NeuralForward/GradientDescent、HttpInspector、GitGraph、DataFrameExplorer、BigOGrapher、CronBuilder、SerpPreview、UnitEconomicsCalc、PersonaBuilder。
- [ ] B5 deep-rewrite（視需要）：ch15、24、32、34、35、36、41、附錄。
- [ ] B6 語言島（英/日辭典，`dictionary_terms.domain` 已預留）。
- [ ] B7 計畫書 ch2/ch6/ch7 + pitch-deck 對齊 `repositioning.md`；手寫種子 top-up（筆記市集包 120+/包、部落格固定文）。
- [ ] B8 AI 草稿語意抽查（手動 QA）。

---

## C. 長線（先擱置）
- [ ] AI 模型中台升級、Chapter 推薦演算法 + 全站語意搜尋 UI、Marketing OAuth / A/B ad copy、其他島嶼（Learning/Business/Research/Language）、AI 老師 marketplace、紫微斗數、N8N 12 workflow（需 self-host）。
- 🆕 點子池：統一發票對獎、AI 取名、喝水提醒 streak、AI 解夢/心情陪伴、生日提醒+送禮、AI 陪伴角色、AI 合約白話、老照片修復。

---

## 附錄 A：核對時發現「其實做完了、舊檔沒劃」（2026-11-13）

- ~~§1.7 fortune.share 8 個 key 補譯~~（11/12 `5a62de16` 一起補了）
- ~~§1.1–1.4 母項~~（子項全完成，只剩「紫微 ← 之後」，移到長線）
- ~~§2.1.8 主動代理~~（晨報 opt-in LINE 推播 + 任務完成/待批准/等裝置 web push）
- ~~§2.7.13「用 Agent→學會建 Agent」教學閉環~~（`989c8ad2`，FeatureGuide `agent-build-loop`）
- ~~§2.8.1.1–2.8.1.4、§2.8.2.1–2.8.2.4、§2.8.3.1 client-action 中繼層（含 RPC 原子更新、ack 冪等、new-tab 手勢）、§2.8.8~~（母項 0804 已完成，子項沒劃）
- ~~§4.1.1「後端/DevOps 全罐頭章清完」~~、~~§4.2.1.5 前端基礎大補 8 批~~
- ~~§5.4 晨報 `/settings` 開關~~、~~§5.7 top nav「每日情報」4 語~~（0806 收尾批重複列）
- ~~§7.10 bundle analyzer~~（`@next/bundle-analyzer` 已接）
- ~~§7.15.2.1 追蹤鈕、ai/runs 前端~~（`SocialFeed.tsx:192`、`GrowthClient.tsx:165` 已接）
- ~~`todo_list_0916.md` ch26/ch27 程式碼註解白話化~~（0917 全案完成，該檔封存）
- ~~§6.1 儲值套餐、商城 sink~~（5 套餐 + `/store`）

**作廢（搬到 Vercel 後不適用）**：Zeabur 拉 GHCR image、Zeabur env `ENABLE_SERVER_BROWSER`、§2.1.2 伺服器端互動瀏覽器 `browser.render`（Vercel 沒有 Chromium；桌面助手的 Playwright `browser.*` 已涵蓋）。**刻意不做**：`resume_profiles` 表（履歷從學習資料即時生成）。
