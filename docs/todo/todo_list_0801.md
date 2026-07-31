# AI 島待辦總表 2026-08-01（**現行主檔**·0721 建、0722/0723/0731 續用更新）

> ＊0731 進度摘要：全 80 章清晰度審查修 21 處（§4.1）；命理三功能 232/233/234（§1.3.5-7）；教具大工程 ch26/ch7/ch16 三章 100% 覆蓋（§4.1.5）；Agent Rule-filter 2.7.1 + 熱門排序 2.7.12（§2.7）；docs/Platform.md（SnowRealm 平台整合看法）。

> 本檔＝整合 `docs/todo/` 全部 10 個舊檔（MASTER_TODO / ROADMAP_2026Q3 / 0705new_todotask / todo_list_0713 / 0714 / 0715 / TODO / BACKLOG / BEGINNER_FRIENDLY_BACKLOG / REPORTS_TODO_2026-06-03）後的**唯一現行待辦**。
> 狀態經 3 組 subagent 逐項對照「程式碼 + git 紀錄」核對過（2026-07-21）。舊檔全部降為**歷史存查**（見文末〈附錄 A：舊檔核對裁決〉），之後只更新本檔。
> **圖例**：`[ ]` ⬜ 未做 · `[~]` 🚧 部分完成 · `[x]` ✅ 完成（劃線保留） · 🔴 需林董本人操作 · 🆕 新想法 · ＊ 原則/約束。
> **完成的用刪除線 `~~...~~` 標記、不要刪。** 編號用 1 / 1.1 / 1.1.1 / 1.1.1.1 / 1.1.1.1.1 五層對應主→子→子子→子子子→子子子子任務。

---

## 🅰 需林董本人操作 🔴（卡點——做完解鎖一票功能）

- [ ] 🔴 **部署確認**：Zeabur 服務拉 `ghcr.io/luffysky/ai-island-web:latest`、Restart、確認 🚀 角標版本對。
- [ ] 🔴 **Zeabur env `ENABLE_SERVER_BROWSER=1`**：L2 伺服器瀏覽器啟用（image 已裝 Chromium），設完 Restart、盯 RAM，太吃就拿掉。
- [ ] 🔴 **cron-job.org 排程**：確認 job #7 agent-schedules（15 分）、#8 opportunity-deadlines（每日 09:00）、#9 opportunity-radar 都在跑；**加 job #10 daily-brief**（每天 08:30 `GET /api/cron/daily-brief?secret=<CRON_SECRET>`）。
- [ ] 🔴 **金流**：Stripe 正式金鑰、bootstrap 3 產品 + price_ids 貼 env、webhook signing secret、redeploy、4242 測試。
- [ ] 🔴 **VAPID / EMAIL_FROM / Google 同意畫面**：Web Push VAPID 貼 Zeabur；確認寄件 `EMAIL_FROM`；OAuth 同意畫面去掉 supabase.co 字樣。
- [ ] 🔴 **通路帳號/審核**（分身島 outbound + bot 前置）：TG BotFather token、Discord bot token + VIP role 設定、Meta App(FB/IG/Threads 審核)、X 開發者、YT/抖音 開發者帳號+App 審核。LINE 已可用。
- [ ] 🔴 **搜尋金鑰加量**：Brave/Tavily 各官網申請 key 貼 `/settings/ai-keys`。
- [ ] 🔴 **機會島**：定期審 `/admin/opportunities/sources` 待審佇列（核准才上線）+ 加信任的官方 RSS/Atom；unverified 機會人工覆核成 verified。
- [ ] 🔴 **安全帳號**：Owner MFA、Cloudflare WAF、Dependabot + 定期備份 + 金鑰輪替、刪除 client OAuth 收斂。
- [ ] 🔴 **生圖素材**（首頁 5 層視差卡在這，見 `index-img.md`）：① 五層 stage-layer 對齊版（同畫布尺寸如 1672×941、sky 不透明其餘透明）② 三隻角色去背卡 ③（可選）scroll-scene 錨點 ④ 夜景 CTA / 模式小圖。
- [ ] 🔴 **寵物 4 隻 Lottie URL**（`/admin/lottie-settings`）。

---

## 一、大眾變現四功能（0721 新增·**全做**，依序、無外部依賴者先做）

> ＊**戰略**：目前只有「創作者/學程式」兩種小眾。要打到幾萬~幾百萬普通人＋願付費，做**單一用途、情緒/剛需、有每日習慣、靠 LINE 推播**的輕工具（我們有現成 LINE 推播＋每日 cron＋LLM＝優勢）。輕工具＝**獲客漏斗**：普通人為運勢/訊息軍師進來→綁 LINE→養成每日習慣→導流到創作島/學程式/Agent；且本身就是 Agent 的「任務範本」，一石二鳥。
> ＊順序建議：1（運勢·黏著最高）或 4.1（生活助理範本·最省）先開工；2（訊息軍師·最快落地）次之；3（求職包）再接。

### 1. 每日運勢 / AI 命理 + LINE 推播（訂閱制）🚧 **第一刀 MVP 已上線（0721）**：星座每日運勢＋profile＋前端卡＋LINE 推播 cron＋nav/settings 入口。塔羅、八字精算、付費門檻＝第二刀。
- [~] 1.1 資料模型與後端
  - [~] 1.1.1 `fortune_profiles` 表（user_id, birth_date, birth_time, gender, calendar_type 陽/陰曆, zodiac）
    - [x] ~~1.1.1.1 migration `supabase/fortune_migration.sql`（RLS：本人可讀寫）~~ ✅ 已跑、DB 驗證過
    - [x] ~~1.1.1.2 農曆↔國曆轉換~~ ✅ 0722（`lunar-javascript`：八字 `computeBazi` 農曆→國曆 `Lunar.fromYmdHms().getSolar()`；**修 bug**：西洋星座原本從 raw 生日算、農曆會錯 → 新增 `toSolarDate()`、profile PUT 先轉國曆再算星座）
      - [x] ~~1.1.1.2.1 無時辰的 fallback（只算年月日三柱/星座、時柱從缺、prompt 標示精度較低）~~ ✅ 0722（`hasHour` flag）
  - [x] ~~1.1.2 `fortune_daily` 快取表（唯一鍵 user_id+date+kind、payload jsonb）＝冪等不重複燒 LLM~~ ✅
  - [x] ~~1.1.3 API `/api/fortune/today`（快取優先、沒快取才 `completeForUsage("agent_core")` 生成+存）~~ ✅（邏輯抽到 `lib/fortune-service.ts` 與 cron 共用）
  - [x] ~~1.1.4 API `/api/fortune/tarot`（GET 回顯今日/POST 抽 3 張+AI 解讀、免費每日 1 次、付費無限、server 抽牌防作弊）~~ ✅（第二刀 0721）
  - [x] ~~1.1.5 API `/api/fortune/profile`（GET/PUT：生日資料、自動算西洋星座）~~ ✅
- [~] 1.2 LLM 生成
  - [x] ~~1.2.1 運勢 prompt（整體/愛情/事業/財運 + 幸運色/數字 + 一句提醒 + score）~~ ✅（`lib/fortune.ts`）
    - [x] ~~1.2.1.1 護欄：不做醫療/投資/法律具體斷言、語氣正向不製造焦慮~~ ✅
    - [x] ~~1.2.1.2 結構化輸出 JSON + 容錯解析 parseFortune（含越界收斂、fallback）~~ ✅（8 支單元測試）
  - [x] ~~1.2.2 塔羅牌庫（`src/lib/tarot.ts` 78 張=22 大+56 小、正逆位關鍵字、drawCards/buildTarotPrompt/parseTarotReading、7 支測試）→ 三張牌陣（過去/現在/未來）依提問 LLM 解讀~~ ✅
  - [x] ~~1.2.3 命理：星座 ✅ + 八字排盤 ✅（lunar-javascript 正統四柱/五行/十神/納音、0722）+ 易經·梅花易數 ✅（本地公有領域 64 卦查表+起卦、0722）~~；紫微 ← 之後
- [~] 1.3 前端 `/fortune`
  - [x] ~~1.3.1 首次生日/時辰輸入頁 + 每日運勢卡（三面向卡 + score 環 + 幸運色塊/數字 + 今日提醒）~~ ✅
  - [x] ~~1.3.2 塔羅抽牌互動（`/fortune` 展開式 TarotSection：提問輸入→抽牌→三張牌陣+逐張解讀+總結+建議、回顯今日、付費可再抽）~~ ✅
  - [x] ~~1.3.3 分享卡：OG 圖卡（`/api/og/fortune` 1200x630、CJK 子集字型）+ 分享面板（Web Share 帶圖檔/複製連結/下載圖卡）+ `/fortune/share` 落地頁 og:image（LINE/FB 抓得到預覽）~~ ✅ 0722
  - [~] 1.3.4 RWD + 亮暗 ✅；付費分界：塔羅 ✅ + 易經 AI 深解 ✅（免費每日 1 次·付費無限、鎖住顯示升級卡→/pricing、0722）；八字排盤 AI 免費（快取自然收斂）
  - [x] ~~1.3.5 未註冊訪客免註冊試「今日基本運勢」（232）~~ ✅ 0731——`/api/fortune/public`（?zodiac= 或 ?birth=、零 AI 決定性、複用 generateFreeFortune）+ Fortune.tsx GuestFortune（未登入→選星座即看整體/愛情/事業/財運+分數+幸運色數；底部引導註冊解鎖塔羅/八字/梅花→/login）；guest.* 四語 i18n。
  - [x] ~~1.3.6 八字可改生日/時辰 + 幫別人算（233）~~ ✅ 0731——bazi API 加 POST 自訂排盤(不動 profile、依輸入編進 kind 快取)；BaziSection 加「改生日/幫別人算」表單(日期+12 時辰下拉〔記得時辰不記得幾點也能選、值取時辰中點〕+曆別+性別)；表單四語。
  - [x] ~~1.3.7 歷史運勢納入八字命盤 + 梅花易數（234）~~ ✅ 0731——history API 折入 iching、八字改單獨回傳命盤卡(不再以裸生日混進日期列)；HistorySection 置頂🀄命盤卡 + 每日列☯️梅花明細；baziLabel/ichingLabel 四語。
- [~] 1.4 LINE 每日推播
  - [x] ~~1.4.1 cron `/api/cron/fortune-daily`（撈綁 LINE + 開推播 + 有生日者、生成+推、dedupe、cap 500）~~ ✅
    - [x] ~~1.4.1.1 cron-job.org job #10（運勢每日推播）~~ ✅ 0722 林董已設好
  - [x] ~~1.4.2 訂閱/退訂設定（`line_pref_fortune` 欄 + /settings 通知偏好開關 + notification-prefs API）~~ ✅
- [~] 1.5 變現：星座每日免費（零 AI）✅；塔羅免費 1/日·付費無限 ✅；易經 AI 深解免費 1/日·付費無限 ✅（`src/lib/fortune-gate.ts` 統一 gate `getFortuneGate`、擋掉 iching 無限免費燒 LLM 的漏洞、0722）；Z幣單次購買/每日私人推播 ← 之後
- [x] ~~1.6 收尾檢查（tsc/vitest 145/next build 全綠 + DB 接線實測 + 4 語 nav i18n）~~ ✅ 0721 第一刀
- [x] ~~1.7 全頁 i18n（0722）：`/fortune` 六區塊 UI 字串抽進 `messages.fortune`（108 keys）→ 切語言真的變外文；en/ja/ko 免費 Google 譯好（fortune.share 8 顆待補譯）~~ ✅
- 🆕 **入口**：nav「每日運勢」（4 語 i18n、桌機抽屜+手機選單）✅；**首頁「免費 AI 小工具」區塊**（4 功能卡、`FreeToolsSection`）✅；5 層生圖 hero 模式卡 ← 仍待（配 §🅰 生圖）。

### 2. 訊息軍師（幫你把難開口的話講好）✅ **已上線（0721）** — 選情境→填要點→選語氣→3 版本可抄
- [x] ~~2.1 情境模板資料~~ ✅（`src/lib/message-coach.ts`）
  - [x] ~~2.1.1 情境庫（12 情境：加薪/婉拒/道歉/催款/請假/房東/老師/客戶/難開口私訊/客訴/婉拒告白/設界線）~~ ✅
    - [x] ~~2.1.1.1 每情境：emoji + hint（要點提示）+ 預設語氣~~ ✅
  - [x] ~~2.1.2 語氣選項（客氣/專業/堅定/幽默/溫暖）~~ ✅
- [x] ~~2.2 後端~~ ✅
  - [x] ~~2.2.1 API `/api/message-coach`（POST {scenario,points,tone,refine}→3 版本、`completeForUsage("message_coach")`、護欄、容錯解析）~~ ✅
  - [x] ~~2.2.2 免費每日 3 則計數（`message_coach_logs` 表 COUNT 台北日、不存內容顧隱私）+ 付費/特權無限（`hasAiUnlimited`/`getUserSubTier`）~~ ✅
- [x] ~~2.3 前端 `/message-coach`~~ ✅
  - [x] ~~2.3.1 選情境→填要點→選語氣→產 3 版本（每版可複製、微調 chips 再短/再委婉/更堅定/更有溫度/換一批、剩餘次數顯示、429 升級提示）~~ ✅
  - [x] ~~2.3.2 RWD + 亮暗~~ ✅
- [~] 2.4 變現：免費每日 3 則 ✅ + 付費無限 ✅；Z幣單次購買 / 進階語氣包 ← 之後
- [x] ~~2.5 收尾檢查（tsc/vitest 153(+8 msg-coach)/next build 全綠 + DB 接線實測 + 4 語 nav i18n）~~ ✅
- [x] ~~2.6 全頁 i18n（0722）：12 情境 label/desc + 5 語氣 + 潤飾/結果/錯誤抽進 `messages.messageCoach`（55 keys、依 scenario id 動態 t()）；en/ja/ko 譯好~~ ✅
- [x] ~~2.7 情境 icon 改 Lottie（0722）：12 情境接 `LottieIcon`（autoplay+loop、會自己動）；沒設 URL → fallback 會自己動的 lucide（`coach-icon-live`、非 hover）；**全部後台可換** `/admin/lottie-settings` 加 12 個 `coach_lottie_<id>_url` slot（標明前端 UI+推薦連結）~~ ✅ 🔴 林董去貼 lottie.host URL（沒貼也會動）
- 🆕 **入口**：nav「訊息軍師」(4 語 i18n) ✅；`message_coach` 已註冊進 AiUsageKey（後台可配模型）✅。

### 3. AI 求職包（履歷+自傳+面試模擬+求職信）✅ **已上線（0721）** — 一站式 `/me/job-kit` hub
> 盤點發現大半已存在（履歷 `/me/resume`、面試模擬 `/me/mock-interview` + 評分/歷史、`/me/career-path` 求職閉環）。本次補齊「自傳」「求職信」+ 統整 hub。
- [~] 3.1 `resume_profiles` 表（經歷/技能/目標職位）— **刻意不落地**：履歷/自傳從學習資料即時生成（沿用現況、career-path 註解已載明）；求職信經歷由使用者當場填。之後要存文件再加 `job_kit_documents` 表。
- [x] ~~3.2 後端~~ ✅
  - [x] ~~3.2.1 產履歷（既有）/自傳(`/api/me/job-kit/bio`)/求職信(`/api/me/job-kit/cover-letter`) — `lib/job-kit.ts` 共用 loadCareerData（兩段查穩、不靠脆弱 embed）+ prompt builders + AI runner；requireAiAction 月配額 bio/cover_letter 各 3/月~~ ✅
  - [x] ~~3.2.2 PDF 產出（沿用既有 `window.print()` + `@media print`；專案無真 PDF 生成庫、unpdf 只是 parser）~~ ✅（要像素級 PDF 再加 @react-pdf）
  - [x] ~~3.2.3 面試模擬（既有 `/me/mock-interview` 多輪對話+評分+`mock_interview_sessions` 歷史，5 模式 14 角色）~~ ✅ 沿用不重造
- [x] ~~3.3 前端 `/me/job-kit`（不另開 top-level /job-kit；留在 /me 內共用 auth/sidebar/quota）：履歷+面試入口卡 + 自傳/求職信產生器（表單→產文件→複製/下載.md/印PDF）~~ ✅
- [ ] 3.4 變現：一次性產包付費 / 短訂閱（現：免費各 3/月、Premium 無限；付費產包 ← 之後）
- [x] ~~3.5 收尾檢查（tsc/vitest 164/next build 全綠 + DB 接線實測〔loadCareerData 兩段查、check_ai_action bio/cover_letter〕+ MeSidebar 入口）~~ ✅
- [x] ~~3.6 全頁 i18n（0722）：自傳/求職信/DocActions/錯誤抽進 `messages.jobKit`（27 keys）；en/ja/ko 譯好~~ ✅
- 🆕 **入口**：`MeSidebar` 加「🎒 AI 求職包」；AI_ACTION_CAPS 加 `bio:3`/`cover_letter:3`（generic RPC、免 migration）。

### 4. Agent 補完 + 生活助理範本
- [x] ~~4.1 **一鍵生活助理範本庫** ✅ 已上線（0721）~~（把 Agent 從工程師工具轉成普通人生活助理）
  - [x] ~~4.1.1 範本資料 `src/lib/agent/task-templates.ts`（5 分類：生活/工作/財務/學習/家庭、共 31 範本、4 支測試）~~ ✅
    - [x] ~~4.1.1.1 範本項（每日新聞/旅遊/菜單/送禮/讀網頁/翻譯潤稿/健康QA/查資料/寫文案/email/會議記錄/比較決策/簡報/整理檔案/信箱/查補助/比價/追蹤降價/預算/合約白話/解釋術語/學習計畫/推薦課/出題/長文摘要/育兒QA/行程/長照資源/親子活動/加行事曆）~~ ✅
      - [x] ~~4.1.1.1.1 每範本欄位：id/emoji/title/hint/goal 模板/category/needsDevice/needsOAuth/popular~~ ✅
  - [x] ~~4.1.2 `OfficeClient.tsx` 的 `QUICK_TASKS` 改引用 `popularTemplates()`、不重複定義；加 needsOAuth「即將開放」badge + 「看全部範本」連結~~ ✅
  - [x] ~~4.1.3 獨立 `/agent/templates` 頁（全部/生活/工作/財務/學習/家庭 分類 tab、卡片點擊 → `/agent?goal=` 預填）~~ ✅
  - [x] ~~4.1.4 RWD + 亮暗~~ ✅
  - ＊needsOAuth 範本（讀信箱/加行事曆）先標「即將開放」不誤導；OAuth 接完（§4.2）再解鎖。
- [ ] 4.2 外部工具 OAuth 🔴（需林董各平台註冊 app）：Gmail/Calendar/Drive/GitHub/Notion 一鍵授權（`/settings/connections` 已有手動連結骨架、缺 OAuth）
- [x] ~~4.3 L2 程式沙盒~~ ✅ 0722（＝agent `code.run` 工具：抽 `src/lib/code-runner.ts`（Piston→Judge0→Wandbox 外部隔離沙盒、20+ 語言、限時間/輸出、playground 與 agent 共用）；tools.ts 加 `code.run`（risk=dangerous、逐次確認）。**不需 `ENABLE_SERVER_BROWSER`**（那只 gate browser.render）；用外部沙盒服務、非本機容器）
- [x] ~~4.4 成本 / ROI Dashboard~~ ✅ 0722（**使用者端** `/me/ai-usage`：本月 tokens 已用/額度/剩餘 + 近 30 天呼叫/tokens/估計成本 recharts 圖 + KPI 磚，讀 `ai_usage_daily`（嚴格 user_id）＋`gateAiUsage`；MeSidebar 加「📊 AI 使用量」。＊成本標「估計、非帳單」不誤導。「效率排行」跨用戶＝admin 事、之後）
- [x] ~~4.5 技術債：stale-task reaper~~ ✅ 早已存在（cron/agent-reaper 把 planning/running 逾時任務標 failed）——只差排程（🔴 加 cron job）

🆕 潛力池（之後評估）：AI 陪伴角色（沿用島吉祥物+記憶、情感黏著）、AI 合約白話解讀（已有 PDF 解析 unpdf）、AI 老照片修復/證件照（需付費生圖 API·暫緩）、AI 交友/約會訊息軍師。
- 🆕 **大眾變現候選池**（林董 0723 腦力激盪·待評估）：統一發票對獎（最台·剛需·中獎情緒·兩月一期天然推播，財政部雲端發票 API）、AI 取名（寶寶/英文/店名/寵物+筆劃生肖·一次性付費意願高·複用命理 infra）、健康喝水提醒+streak、AI 解夢/心情陪伴、生日提醒+送禮（可接聯盟行銷）。＊晨報＝§5 已升級為正式待辦；寵物系列＝§6。

### 5. 🆕 每日晨報（整合天氣·CP 值最高·複用現成 infra）— 林董 0723 拍板做
> ＊戰略：早上一則 LINE 把「運勢＋天氣生活建議＋今日待辦＋提醒」整合成一張晨報卡＝最省力、最黏。純天氣別做（免費到處有），做成晨報的一塊才有價值。骨架大半已有（daily-brief cron + fortune + buildListCard Flex）。
- [ ] 5.1 天氣來源：接 **Open-Meteo（免 key、免費、含逐時/紫外線/降雨機率）** 或 **中央氣象署開放資料平台 CWA（需免費 API key、在地精準）**——抽 `lib/weather.ts`（依使用者地區→經緯度→抓當日天氣，24h 快取、零成本）。＊經緯度可用現有 IP 定位或讓使用者設地區。
- [ ] 5.2 AI 天氣生活建議：把天氣（溫度/溫差/降雨/紫外線/空品）丟 LLM → 生**穿搭 / 帶不帶傘 / 適不適合曬衣運動 / 健康提醒**（溫差大心血管、空品差過敏、防曬）；綁節氣農民曆（複用 `bazi.ts` 農曆 infra）。護欄：不做醫療斷言。
- [ ] 5.3 晨報整合卡：擴充 `/api/cron/daily-brief` → 一張 LINE Flex 卡＝☀️天氣生活建議 + 🔮今日運勢一句 + ✅今天值得做的 3 件事 + ⏰重要提醒（機會截止/回診等）。用 buildListCard/新 buildMorningBriefCard。
- [ ] 5.4 訂閱/偏好：`/settings` 加「每日晨報」開關（複用 line_pref_* 模式）；cron 08:30 推（複用現有 daily-brief job #10）。
- [ ] 5.5 變現：晨報免費當黏著鉤子；進階（多地區天氣/更細健康建議/廣告置換）＝付費或 Z 幣。

### 6. 🆕 寵物系列（.pet 網域·對品牌·大眾變現漏斗）— 林董 0723 提，待拍板
> ＊觀察：網域就是 `snowrealm.pet`＝寵物本來就對品牌。完全符合「單一用途/情緒剛需/每日習慣/LINE 推播」打法。建議打法：兩隻娛樂輕工具當漏斗 + 一隻訂閱黏著。⚠️ 需先決定：寵物是「AI 島內新區」還是「獨立分站」。
- [ ] 6.1 **AI 寵物翻譯 / 叫聲・表情解讀**（娛樂·流量炸彈）：拍照/錄音/描述 → AI「翻譯」牠想說什麼。無醫療風險、分享率爆高＝獲客漏斗神器（同運勢級）。變現：免費幾次/付費無限。
- [ ] 6.2 **寵物運勢 / 性格測驗**（娛樂·零成本）：品種+生日算今日運勢/MBTI 性格。**複用運勢 infra**、分享驅動流量。
- [ ] 6.3 **寵物生命提醒管家**（訂閱·最黏）：疫苗/驅蟲/回診/生日 LINE 推播，**複用現有 cron+LINE infra**；每多一隻寵物一組排程。變現：訂閱/多寵物解鎖。
- [ ] 6.4（候選）AI 寵物症狀初篩問答（最剛需最願付費·⚠️醫療紅線高，只做初步參考+衛教、一律導向獸醫、絕不診斷）、AI 寵物藝術照/擬人化（付費意願高·⚠️需付費生圖 API 成本）、寵物營養餵食計算機（工具型·SEO·飼料用品導購聯盟）。

---

## 二、分身島 Agent（補完 · 承 0713/0714）

### 2.1 引擎 L1–L5 進階（核心 L1–L5 ✅ 已上線）
- [x] ~~2.1.1 L2 程式沙盒~~ ✅ 0722（見 §4.3：agent `code.run` 工具＝外部隔離沙盒 Piston/Judge0/Wandbox、20+ 語言、限時間/輸出、dangerous 逐次確認。＊非 isolated-vm/本機容器，是外部沙盒服務、免 env）
- [ ] 2.1.2 L2 互動式伺服器瀏覽器（`browser.render` code done、仍 stub、需 🔴 env 驗活）
- [x] ~~2.1.3 L4 執行中自動建 skill~~ ✅ 0801——任務成功且夠有重複價值(非技能發起/≥2步)時，orchestrator 收尾自動蒸餾一份技能建議存 `agent_tasks.suggested_skill`(自我把關、fire-and-forget、用快 Haiku)；前端讀到就把「存成技能」升級成高亮「💡 存成技能「name」」、一鍵開預填視窗(不用等 AI)。synthesize 邏輯抽 `lib/agent/skill-synth.ts` 兩處共用、route 優先回已算好的建議省一次 AI。migration agent_tasks.suggested_skill 已跑 prod。
- [x] ~~2.1.4 L5 經理–專才階層調度~~ ✅ 0801——平行 fan-out 之上加「經理→專才」層：`assignSpecialists()` 由經理依總目標替每個子任務指派專才角色(資料研究員/在地情報員/數據查證員…)，`runSubAgent` 帶 role → 專才用聚焦系統提示做事(比通用子代理精準)；步驟顯示「專才「角色」：子任務」、思考列「派 N 位專才(…)」。隔離實作、失敗退回通用行為、零風險序列路徑。
- [x] ~~2.1.5 真串流部分成果~~ ✅ 0801——序列路徑本就逐步寫 DB 串流；補齊平行路徑：專才改成「一做完就立刻寫步驟+串流(Promise.race 邊完成邊出)」而非 Promise.all 等全部→前端輪詢progressively看到各專才發現、不再一次冒出。（最終答案 token 級串流需 AI-router 全面支援串流、屬另案、暫緩）
- [x] ~~2.1.6 工具自動發現（OpenAPI → tools）~~ ✅ 0801——貼一份 OpenAPI spec 網址 → 每個 operation 自動變成 AgentTool（與 MCP 並列動態工具來源）。`lib/agent/openapi-tools.ts`（`openApiOperations` 純函式解析 + `parseOpenApiToTools` 包 execute 打 HTTP + `loadUserOpenApiTools` 載入）；risk 依 method(GET=read自動/寫入=審批/DELETE=dangerous)；SSRF 擋內網私有IP + 逾時 + 回應上限；表 `agent_openapi_sources`(RLS) 已跑 prod；API `/api/agent/openapi`(GET/POST驗spec/DELETE)；orchestrator 併入動態工具；AgentClient 加「OpenAPI 工具」區(加/列/移除)；7 支單元測試。
- [x] ~~2.1.7 預算感知硬上限（free-first + 每日上限 + 省錢三檔 ✅；per-task 步數硬上限 STEP_CAP saver12/balanced40/quality80 ✅ 0722）~~
- [~] 2.1.8 主動代理（daily-brief ✅；opt-in 主動 push 待補）

### 2.2 通路 Inbound（訊息→建 task→回填）
- [~] 2.2.1 LINE bot 入口 ✅（`/分身`、找機會、批准 postback）；待補 Rich Menu / LIFF
- [ ] 2.2.2 **Telegram agent 入口**（⚠️ 現有 `telegram-webhook` 是 admin AI-chat、非 agent bridge；要接 `launchAgentTask`）（需 🔴 token）
- [ ] 2.2.3 **Discord agent**（⚠️ 現有 `discord-interactions` 是 admin slash-chat；要 `/agent`/`/opportunity` task bridge）（需 🔴 token）
- [ ] 2.2.4 統一 Bridge（LINE/TG/Discord 共用「訊息→task→回填」轉接層）
- [~] 2.2.5 批准搬到聊天平台（LINE ✅；TG/Discord 待補）

### 2.3 通路 Outbound — 社群發布中心 `/agent/social`（🚧 最大半成品）
- [x] ~~2.3.1 撰稿 UI + 多平台勾選 + 排程 + 草稿 + `social_posts` 表 + CRUD~~ ✅
- [ ] 2.3.2 **各平台 send adapter**（`src/lib/social/` 目前不存在、route 自標 stub）
  - [ ] 2.3.2.1 🟢 LINE / TG / Discord adapter 先接
  - [ ] 2.3.2.2 🟡 Meta 系（FB/IG/Threads）需 OAuth（需 🔴）
  - [ ] 2.3.2.3 🔴 抖音/小紅書/Dcard 無 API、只能手動貼
- [ ] 2.3.3 排程發布 cron
- [ ] 2.3.4 私訊/DM 統一收件匣
- [ ] 2.3.5 AI 起草 → 你批准 → 發

### 2.4 外部工具 & 憑證
- [ ] 2.4.1 外部工具 OAuth 一鍵授權（Gmail/Calendar/GitHub/Notion/Drive 讀/寫）（需 🔴 各平台 app）
- [ ] 2.4.2 Credential Broker（本機管密碼、Agent 只知有無；`agent_credential_refs` 表未建）
- [ ] 2.4.3 L4 憑證/銀行/系統操作流程

### 2.5 桌面助手升級（core bridge ✅）
- [ ] 2.5.1 桌面助手＝完整 Agent（offline loop）
- [ ] 2.5.2 Electron 自動更新 + release 腳本
- [ ] 2.5.3 更多本機 Skills（git/test/build/watch/schedule）
- [ ] 2.5.4 Windows UI Automation（pywinauto/UIA）
- [ ] 2.5.5 macOS 支援；2.5.6 Tauri 2 + Rust 正式版；2.5.7 視覺 Computer Use 補位
- [ ] 2.5.8 通訊升級（WebSocket/WebRTC/E2E）；2.5.9 真人端到端 Demo；2.5.10 桌面 Playwright 一鍵啟用
- [ ] 2.5.11 Android 原生 agent（🔴 需 Kotlin/Android 環境、另 repo）；iOS App Intents

### 2.6 AI 數位員工辦公室 `/agent/office`（✅ 已上線 + 排程）
- [ ] 2.6.1 自主任務規劃（員工自己決定今天做什麼）
- [x] ~~2.6.2 產出佇列（approvals 聚合 ✅；草稿全文預覽）~~ ✅ 0801——approvalSummary 偵測 outbound 內容欄位(text/content/body/message/caption/comment…)、附完整草稿(至 4000 字不截斷)；ApprovalCard 加「📝 送出前預覽(完整內容)」捲動框 → 發文/寄信前看得到要送的全文再按同意。
- [ ] 2.6.3 員工協作（用 L5）；2.6.4 「登入＝AI 公司」世界觀（能力向量/招募/培訓/KPI）
- [ ] 2.6.5 Agent 互相直接共享資料（寫 DB 不經 LLM）
- [ ] 2.6.6 工作空間 Hub（簡報/表格/文件生成器聚合入口——大工程）

### 2.7 省 token（Snow Orchestrator）＆ MCP／技能
- [x] ~~2.7.1 Rule-filter 完整層~~ ✅ 0731（`src/lib/agent/rule-filter.ts`：純招呼/測試字→罐頭語不叫 LLM；10 分鐘內一字不差重複任務→回上次結果〔時效性任務不快取〕；掛 orchestrator 頂端、命中走正常收尾路徑；純函式有單元測試。commit 8e313722）
- [x] ~~2.7.2 Agent 任務 Embedding RAG~~ ✅ 其實早已接（`launchAgentTask` 用 `match_agent_tasks` 撈語意相似過去任務 + `agent_memory` 跨對話記憶 → 併進 planner priorContext）。todo 標記過時、已核。
- [ ] 2.7.3 Diff 只讀變動；2.7.4 Event-driven + Sleep + per-agent daily budget
- [~] 2.7.5 成本/ROI Dashboard＝同 §4.4：使用者端 `/me/ai-usage` ✅ 0722（本月額度+30天用量/成本圖）；跨用戶 efficiency 排行（admin）← 之後
- [ ] 2.7.6 Cost-per-Task benchmark 實測；2.7.7 AI COO
- [ ] 2.7.8 MCP 外部實戰測試；2.7.9 MCP Marketplace + 技能市集分享
- [ ] 2.7.10 技能 YAML 完整規格；2.7.11 內建技能 workflow 補齊（GitHub管家/檔案整理師…）
- [x] ~~2.7.12 技能成效統計 + 熱門排序~~ ✅ 0731（usage 早已算〔used/succeeded〕；熱門排序＝skills API 依 used 次數穩定排序、常用技能浮上快速取用列與各分類內，無需 migration）；[ ] 2.7.13「用 Agent→學會建 Agent」教學閉環（未做）

---

## 三、機會島（Opportunity Island · 承 0713/0714）

- [~] 3.1 **V2 精準推薦**：recommend/問卷/profile/subscriptions ✅。待：⬜ AI 聊天追問、⬜ 能力圖譜、⬜ AI 島專屬頁、⬜ 推薦透明化
- [~] 3.2 **V3「幫你贏」**：mock-judge/fit-analysis/缺件/generate/rules-summary ✅、AI 作品分析 ✅、長 PDF 規則 ✅。待：⬜ AI 成熟度、⬜ 缺點/對手/歷屆評審分析、🚧 生成海報/影片腳本、⬜ 排程接 Google Calendar、⬜ 練習階梯（電梯簡報→10 分）、⬜ 學習閉環/路線圖
- [~] 3.3 **V4 智慧雷達**（安全基礎 ✅：sources/candidates 表 + admin/sources + cron/radar）。待：
  - [ ] 3.3.1 API/sitemap/爬蟲來源；3.3.2 三層 hash 變動偵測
  - [ ] 3.3.3 每欄原文證據 + 信心分（AI 幫填 ✅、證據分未做）
  - [ ] 3.3.4 PDF 解析 + **版本比較**（存歷次規則 diff：截止/獎金/資格變動）
  - [ ] 3.3.5 cron 分頻；3.3.6 Sentry 監控
- [ ] 3.4 **V5 Opportunity OS**：十層機會（補助/獎學金/VC/徵件/標案/工作/實習/海外/證照）、AI 配對組隊、成長時間軸、Team/Enterprise、AI 代報名（授權+守條款）
- [x] ~~3.5 表：`opportunity_changes` / `user_portfolio` / `submission_tasks`~~ ✅ 0722（migration `opportunity_v5_tables_migration.sql` 已跑 prod、RLS 本人 only（changes 公開讀）；**全部真接**：submission_tasks→我的航線缺件清單、user_portfolio→作品庫+餵 AI 幫我挑、opportunity_changes→approve 去重更新記 diff + 詳情頁「規則變動紀錄」）
- [~] 3.6 篩選/詳情：多選 chips ✅、快截止 ✅、~~地區/獎金/身分篩選~~ ✅ 0722（地區🇹🇼/🌏 本就有；補**獎金下限**≥1萬/10萬/100萬 + **身分**🎓限學生/🏢限法人 filter，API `minPrize`/`student`/`company` server 端過濾 + 卡片 badge）。~~我的機會 Dashboard~~ ✅ 0722（我的航線＝Dashboard，每個機會可展開**缺件清單**：勾選/新增/刪、一鍵「建議缺件」依 requires_* 帶入、n/m 進度）。~~prep_effort 估算~~ ✅ 0722（`lib/opportunity-prep.ts` 依 requires_*(計畫書/影片/Demo/pitch/組隊/法人/學生) 規則式估「準備量 低/中/高」＝可靠零成本、非 LLM；詳情頁+清單卡片顯示準備量 badge）。~~詳情頁 FAQ~~ ✅ 0722（依機會資料自動組 6-7 題常見問答：報名費/身分限制/要準備什麼/截止追蹤/獎勵/怎麼開始，`<details>` 摺疊）。待：⬜ PDF 版本、⬜ 機會地圖
- [ ] 3.7 Pipeline / 跨島：機會流水線閉環、20 個機會島 Agent、與創作者島/學習島結合、社群經驗層
- [ ] 3.8 商業模式：方案分層機制

---

## 四、內容 / 辭典 / 教具

### 4.1 章節內容（de-can 罐頭練習 + 加深 + 教具）
- [x] ~~**旗艦章 ch49 AI Agent / ch50 n8n**：de-can + 新教具 AgentLoop/WorkflowFlow~~ ✅ 0721
- [x] ~~**薄章補厚 ch06/11/12/14/23/25/37/42**：de-can 91 題 + JsonTree/複用 ScenarioJudge·WorkflowFlow~~ ✅ 0721（ch15/ch24 本就 0 罐頭）
- [x] ~~ch03/13/43/44/45/47/48/51–60/33(Rust)/76(Angular) 深度重寫~~ ✅（0717 起陸續）
- [x] ~~**全 80 章清晰度/正確性審查 + 修正**~~ ✅ 0731——林董抓到 ch26.6 `*args/**kwargs`「所有」與範例矛盾為起點；6 平行子代理掃 ch01–79 找同類 bug（規則太絕對但範例是例外／規則與輸出矛盾／內容截斷），我逐條驗證後修 **21 處**：ch17.9 殘留作者註記「wait…」+竄改資料、ch10.8 Next15 fetch 預設講反、ch78.4/78.6 softmax/CrossEntropyLoss 算錯(本地驗算)、ch27.3 np.median、ch32.5/32.9 Go slice/goroutine、ch36.1/36.4/36.6 PHP coercive/Eloquent非JOIN/DB::prepared、ch64.4 正則交替、ch66.1 色名色碼不符、ch67.1/67.3 GDPR時限/OWASP版本+截斷補完、ch38.1 速查表截斷、ch53.1/ch63.1 型號一致 等。commit c1c6d2d3/d818ac08/1a14e3af。
- [~] 4.1.1 **剩餘技術章 de-can**（audit：ch01–60 曾 74% 罐頭練習，只清了旗艦+薄章）：ch01/02/04/05/07/08/09/10/16/17/26–32/34/35/36/46… 逐章 de-can + 視情況疊教具
  - [x] ~~ch01 HTML 完整：25 節全 de-can~~ ✅ 0721（原本 1.2–1.25 全同一句「做個人介紹頁」+同 hint/answer、標籤 fill 常壞→換各節量身題）
  - [x] ~~ch02 CSS 完整：25 節全 de-can~~ ✅ 0721（原本 22/25 是「copy code 改 1-2 參數」罐頭→換各節量身題：選擇器/特異性排勝負/box-sizing 算寬/flex 導覽列/grid 相簿 auto-fill/position 五情境/HSL 深淺色/RWD mobile-first/CSS 變數切深色模式/transition vs animation/transform 效能/Sass mixin/Tailwind 取捨/CSS-in-JS/Design Token/動畫心理學/a11y 對比焦點/捲動效能/版面除錯三兇手/上線檢查表）
  - [x] ~~ch04 JavaScript 完整：25 節全 de-can~~ ✅ 0721（罐頭→各節量身題：var/let/const 選用、值 vs 參照、== vs === 陷阱、箭頭函式 this、map/filter/reduce、Map/Set/WeakMap、class 私有欄位、原型鏈找方法、事件迴圈 A-D-C-B、Promise.all vs 序列 await、generator 無限序列、事件委派、fetch 錯誤處理、儲存選型與 token 風險、Web Worker、Wasm 分工、ESM vs CJS tree-shaking、設計模式取捨、debounce/throttle、XSS/CSRF/原型污染、測試三層、記憶體洩漏三來源、正則手機驗證/回溯、2026 新特性）
  - [x] ~~ch05 TypeScript 完整：25 節全 de-can~~ ✅ 0721（罐頭→各節量身題：TS 何時抓錯、編譯流程、any/unknown/never、type vs interface、字面量 union 窮盡檢查、函式型別、Record vs Map、泛型 pluck、Utility Types 選用、enum vs as const、宣告合併、class 修飾詞、import type、type narrowing 守衛、tsconfig paths、strict null、.d.ts、React+TS props/useState、Zod/tRPC 執行期型別、常見錯誤訊息、漸進遷移、泛型攻略 keyof/條件型別、ReturnType 反推、satisfies/template literal）
  - [x] 🏁 **核心 Web 基礎四章 de-can 完成**：ch01 HTML + ch02 CSS + ch04 JS + ch05 TS（各 25 節、共 **100 題**全量身重寫）
  - [x] ~~ch07 程式邏輯共通：28 節全 de-can~~ ✅ 0721（跨語言概念題：編譯 vs 直譯、可變/不可變、浮點誤差與金額、短路求值、switch/查表窮盡、迴圈 off-by-one、函數副作用、陣列 vs 其他結構、HashMap 碰撞、Stack/Queue/Set/Graph 選用、OOP 封裝/多型、組合優於繼承、純函數、型別系統取捨、Stack/Heap/GC 洩漏、Result vs 例外、模組循環依賴、命名/linter、設計模式勿過度、執行緒/鎖/死鎖、async vs 平行、actor/channel、Big O、排序/遞迴/DP、字串編碼/正則貪婪、I/O 串流、測試金字塔、系統化除錯）
  - [x] ~~ch08 React 完整：25 節全 de-can~~ ✅ 0721（宣告式 UI/Vite 掛載/JSX 規則/props 單向流/useState 快照與函式更新/事件參照坑/list key 錯位/useEffect 依賴與 cleanup/useRef 兩用途/useMemo 別濫用/custom hook/Context 反模式/useReducer 純函數/Error Boundary 分區/RHF+Zod/React Query server state/狀態方案選型/效能 Profiler/Testing Library 測行為/RSC/shadcn 源碼模式/React 19 Actions·use()/RSC vs Client 界線/memo 家族何時用）
  - [x] ~~ch09 Vue 完整：25 節全 de-can~~ ✅ 0721（漸進式/響應式、SFC、模板指令、ref vs reactive、computed 快取、props/emit/provide、生命週期清理、Pinia store、Vue Router 守衛、Nuxt SSR/SSG、Vue vs React 選型、setup/toRefs、v-if vs v-show、slots、巢狀路由 lazy、洩漏對照清單、composable vs mixin、Teleport/Transition/Suspense、Nuxt useFetch hydration、Vue+TS、scoped/:deep、Vite HMR、Vue↔React 對照、Todo+Pinia+Supabase 樂觀更新、生態選型問句）
  - [x] ~~ch10 Next.js / Nuxt 完整：25 節全 de-can~~ ✅ 0721（meta-framework 補 SPA 不足、五種渲染模式選型、App Router 特殊檔、Server vs Client 界線、generateMetadata SEO/OG、Server Actions 要驗權限、Route Handler 何時用、fetch 三層快取與 revalidate、Streaming/Suspense、error vs not-found、Middleware edge 限制、next/image·font 優化、Parallel/Intercepting Routes、i18n 路由前綴、認證多層防禦、Nuxt 約定自動匯入、useFetch vs $fetch 雙抓、Nitro server、routeRules 混合渲染、Nuxt Modules、Next vs Nuxt 選型、部署三產物 zbpack 雷、效能檢查清單、App Router 架構決策、Vercel/CF/self-host 取捨）
  - [x] 🏁 **前端框架三章 de-can 完成**：ch08 React + ch09 Vue + ch10 Next/Nuxt（共 75 題）
  - [x] ~~ch16 後端世界全圖：25 節全 de-can~~ ✅ 0721（請求生命週期、HTTP 方法/狀態碼、REST/GraphQL/gRPC/WS 選型、單體/微服務/serverless 取捨、後端語言選型 5 維、ORM vs Raw SQL 與 N+1、Session vs JWT 與 XSS、background queue 冪等、三層快取失效、限流演算法與 key、WS/SSE/長輪詢、大檔預簽章直傳、logs/metrics/traces、效能四殺手先量測、Docker/env/health check、API 設計原則版本化、Edge/Serverless/AI-native 用需求檢驗、Cache-Control 安全、REST 資源設計、三種認證選型、登入嚴格限流 429、Redis stampede、多台 WS pub/sub、OpenAPI 契約測試）
  - [x] ~~ch17 SQL 資料庫：28 節全 de-can~~ ✅ 0721（含真實 SQL：宣告式威力、連線密鑰、建表約束、SELECT 別 *、WHERE NULL/LIKE 坑、cursor 分頁、GROUP BY/HAVING、視窗函式 RANK、CTE/遞迴、upsert 冪等、UPDATE 忘 WHERE、軟刪除、INNER/LEFT JOIN 找沒下單、SELF/CROSS/LATERAL Top-N、UNION/EXCEPT、EXISTS vs IN NULL、索引最左前綴、EXPLAIN Seq Scan、交易 ACID 轉帳、View/MV、Trigger 取捨、JSONB/GIN、全文搜尋、SQL injection 參數化、Supabase RLS policy、Todo 後端資料層清單）
  - [x] ~~ch26 Python 基礎：38 節全 de-can~~ ✅ 0721（基礎→資料→ML→深度學習→FastAPI→部署全線量身題：虛擬環境、名字綁物件、浮點/Decimal、字串不可變、四容器選型、拆包、comprehension、關鍵字參數/可變預設坑、作用域閉包、import 機制、with 檔案、try 抓具體例外、dataclass/super、decorator/generator、型別提示 mypy、NumPy 向量化、Pandas 別逐列、選圖表、監督/非監督/RL、sklearn 流程、特徵工程/資料洩漏、precision vs recall 情境、過擬合/交叉驗證、神經網路/反向傳播、PyTorch 訓練迴圈、CNN/RNN/Transformer、HF 微調 vs zero-shot、FastAPI/ASGI、Pydantic 邊界驗證、async I/O vs CPU、SQLAlchemy/Alembic、JWT/密碼雜湊/OAuth、Celery 冪等、FastAPI vs Django 選型、Gunicorn/Docker/密鑰別進 image）
  - [x] ~~ch27 Python 資料分析：25 節全 de-can~~ ✅ 0721（80% 清理、Notebook 隱藏狀態、NumPy 向量化、loc/iloc/SettingWithCopy、探索 vs 報告圖、時序 resample 不洩漏、分析流程先定義問題、Pandas 五操作 merge 膨脹、矩陣 * vs @、seaborn vs matplotlib、Plotly 互動代價、Streamlit cache、read_sql 下推、Notebook 交付重跑、Prophet 區間/walk-forward、A/B test p 值/peeking、PySpark 惰性/何時不用、Polars 取捨、DuckDB 列式、清理三類異常別亂刪、特徵工程勝過換模型、流失不平衡、Geo 空間思維、中文斷詞情感侷限、資料職涯溝通）
  - [x] ~~ch28 Python 爬蟲：25 節全 de-can~~ ✅ 0721（**全程強調合法合規、不掛收入保證**：robots/ToS/個資/著作權合規檢查、requests+BS 禮貌 UA/間隔、Playwright 等元素、Scrapy 限速守規、反爬是網站表達別抓、proxy 正當性界線、增量去重架構、耐改版選擇器、pipeline 分離、無限捲動省資源、UA/cookie 正常 vs 假冒繞過、CSS vs XPath、CSV/DB upsert 編碼、httpx async 限併發、抓自己資料 vs 他人非公開、排程告警、找 JSON API、raw 先落地、Selenium vs Playwright、授權管道勝對抗爬蟲、失敗處理 0 筆警訊、PDF/OCR 抽查、負責任守則、合規優先應用、能不爬就不爬決策樹）
  - [x] ~~ch29 JavaScript 爬蟲：25 節全 de-can~~ ✅ 0721（**同 ch28 合規優先；反偵測類 29.14/29.15 導向正途、不教惡意規避**：Node vs Python 合規相同、fetch+Cheerio 輕量、Puppeteer 先找 API、Playwright auto-wait、Crawlee 框架合規仍你負責、增量去重架構、耐改版選擇器、抓自己 vs 他人、選型別糾結、Bun 瓶頸在網路非 runtime、攔截 network 正當 vs 竄改、edge 排程 vs 繞封鎖、反 fingerprint=該停訊號、TLS 指紋=改走正門、RSS/sitemap 官方入口優先、Apify 平台責任仍你、TS+Zod 執行期驗證、監控 0 筆警訊、serverless 限制、scraping API 合規責任、比價工具優先官方 API/聯盟、AI 爬蟲不改變邊界+限制動作、OCR 抽查+防抓圖片、能不爬就不爬決策樹）
  - [x] ~~ch30 跨語言爬蟲：25 節全 de-can~~ ✅ 0721（**合規優先；反偵測 30.18/叢集 30.19 導向正途**：Go/Rust 何時值得、Colly 高併發要限速、Rust 長跑穩定 vs 探索殺雞、cron/Actions/Temporal、Redis Queue 多 worker 規模化非繞單站、千萬級靠授權策略、語言選型看團隊、JVM/PHP/Ruby 看既有生態、curl 探索、Sheets 免程式、AI 爬蟲不改邊界+限 agent、OCR 抽查+破防不可、streaming checkpoint、分散式冪等、fingerprint 全修=該停、瀏覽器叢集貴先窮盡輕量、去重驗證垃圾進出、ETL raw 保留冪等、CSV/Parquet/DB 選型、交付附來源口徑、決策樹、四句心法）
  - [x] 🏁 **爬蟲系列三章 de-can 完成**：ch28 Python + ch29 JS + ch30 跨語言（共 75 題、全程合規/反規避導向正途）
  - [x] ~~ch31 Node.js 完整：25 節全 de-can~~ ✅ 0721（event loop I/O vs CPU、nvm 版本管理、內建 http vs Express、dep vs devDep/lockfile、ESM vs CJS 坑、pnpm 硬連結、TS 開發 vs 編譯部署、微任務順序/阻塞卡全部、Express middleware/next、Hono/Fastify 選型、Prisma N+1、Zod 邊界驗證、bcrypt/JWT HttpOnly、WS 多台 pub/sub、BullMQ 冪等、Redis 快取 stampede、Vitest 金字塔、Pino 結構化 log、部署 serverless 限制、runtime 之爭穩定優先、tRPC 內部 vs REST 對外、AI SDK 串流金鑰後端、Node 22 內建減依賴、Hono 跨 runtime、Stream pipeline 大檔）
  - [x] ~~ch32 Go 完整：25 節全 de-can~~ ✅ 0721（Go 哲學單一二進位、零值/未用變數嚴格、一個 for/switch 免 break、多回傳值 error、slice 共享底層陣列、struct 值 vs 指標接收者、指標無運算、interface 隱式小介面、goroutine 輕量與洩漏、channel 用溝通共享、select+context 取消、error wrapping vs panic、go.mod/go.sum 校驗、標準庫 json tag/時區、net/http 免框架、Gin/Fiber/Chi 選型、GORM/sqlx/sqlc、JWT middleware+context、table-driven test、單一二進位交叉編譯 scratch image、分層 handler/service/repo、worker pool 限併發、panic/recover 隔離、vendor/依賴、覆蓋率是參考非目標）
  - [x] 🏁 **後端語言雙章 de-can**：ch31 Node.js + ch32 Go
  - [x] ~~ch34 Java+Spring Boot / ch35 C#+.NET / ch36 PHP+Laravel（各 6 節）全 de-can~~ ✅ 0721（生態總覽章：JVM 穩定/Spring Boot 自動配置/DI 建構子注入/JVM 洩漏/Spring Security+JPA N+1 lazy/部署測試分層 · .NET 跨平台/minimal API/AOT/C# record NRT/Blazor Server vs WASM/Unity 物件池 · PHP 8 現代化/Laravel Eloquent N+1/廣播佇列排程/facade 隱藏依賴/Livewire Filament/資安框架防護但自己開洞）
  - [x] ~~ch46 AI/ML 原理：25 節全 de-can~~ ✅ 0721（**on-brand 核心章**：AI/ML/DL/GenAI 同心圓、三大學習、神經網路非線性、Transformer 注意力、LLM 預測 token 會幻覺、模型選型別追榜、token/context/成本、prompt 要素、few-shot/CoT/ReAct、function calling、結構化輸出容錯、串流、RAG 原理、embedding 語意、向量庫 pgvector ANN、Agent 架構護欄、LangChain 抽象代價、Vercel AI SDK 金鑰後端、LlamaIndex chunking/rerank、fine-tune vs RAG vs prompt 順序、開源自架取捨、成本快取、多模態負責任、AI Eval 先建、AI 治理/prompt injection）
  - [x] ~~ch15 前端 DevOps：23 節全 de-can~~ ✅ 0721（DevOps 循環與回滾、PR/conflict、CI 擋 PR 要快、部署平台取捨、secrets 別 commit/前端 env 公開、preview/staging 別在 prod 試、Sentry 監控 source map、feature flag 灰度、上線 SOP 別週五、pnpm/lockfile、GitHub Flow vs Git Flow、code review 對事不對人、SemVer/changelog、monorepo Turborepo 快取、品質工具鏈自動化、Storybook 隔離、README 讓新人自助、測試金字塔、performance budget CWV 真實裝置、a11y 語意+鍵盤+對比、SaaS 樣板要懂底層、開源 License、on-call/blameless postmortem）
  - [x] ~~ch18 NoSQL 資料庫：25 節全 de-can~~ ✅ 0721（NoSQL 放寬什麼換什麼、文件嵌入 vs 引用、Firebase security rules、Redis 記憶體風險/五結構、向量 DB 相似搜、SQL vs NoSQL 問存取模式、query-first 設計、Mongo CRUD 無 schema 要自律、aggregation 下推、Firestore 即時但查詢受限計費、Redis TTL、pgvector metadata filter、Supabase RLS、NoSQL 也要索引、混用 polyglot、DynamoDB access pattern、Cassandra 多數用不到、Neo4j 關係一等公民、時序庫、ES/Meili 搜尋索引同步、備份要驗證還原、connection pool、migration 漸進、選型框架預設關聯式、原理可遷移）
  - [x] ~~ch19 DB進階 / ch20 API設計 / ch21 認證授權 / ch22 部署Docker / ch24 監控Logs（54 節）全 de-can~~ ✅ 0721（DB進階：索引型別/EXPLAIN/交易隔離/讀寫分離延遲/分片是最後手段/連線池/多層快取/慢查詢/migration 漸進/備份驗證/多租戶 RLS/CDC·Event Sourcing/搜尋 · API：REST/GraphQL/tRPC 選型/RESTful/GraphQL N+1/API 文件版本/限流/webhook 驗簽冪等/OpenAPI 契約測試 · 認證：認證 vs 授權/OAuth/Passkey 防釣魚/RBAC+RLS/Session vs JWT/Cookie/OAuth 授權碼/最小權限/MFA 備援/bcrypt 加鹽慢 · 部署：dev→prod 鴻溝/Docker 多階段/PaaS 務實/edge 限制/密鑰別烤 image/Dockerfile layer 快取/CI-CD/零停機/K8s 過度/IaC · 監控：三支柱/Sentry source map/結構化 log/Web Vitals RUM/uptime 告警/observability/request id/RED p95/告警藝術）
  - [ ] 🏁 **後端/DevOps 全罐頭章清完**（ch15/16/17/18/19/20/21/22/24）
  - [x] ~~ch06/11/12/14/23/25/37/38/39/40/41/42/49/50 殘餘罐頭 63 題全 de-can~~ ✅ 0721（JSON/行動App/資安OWASP/PWA/後端架構/CDN-DNS/WordPress/電商/LINE生態/Kotlin-Dart/遊戲/接案型態/AI Agent/n8n；接案/職涯/變現題一律不掛收入保證）
  - [x] 🏁🏁 **全站章節 de-can 完成 — 掃全 chapters JSON『canned remaining: 0』**（罐頭練習全數清零）
- [~] 4.1.2 **deep-rewrite tier** ＝「A→B→C→D」的 **C**：~~ch40~~ ✅（修 40.1 截斷+換 40.5 罐頭題+深寫 40.2/3/5/6）、~~ch63~~ ✅（附錄C 補術語白話）、~~ch68/72/73/74/75~~ ✅ 0722（內容評估已紮實·非「長但表面」，補教具層＋驗證品質）。其餘 ch15、24、32、34、35、36、41、附錄 ch61–67/69–70 內容多已 de-can+夠深，視需要再逐章深修
- [~] 4.1.3 教具庫擴充 ＝「回原路線」的 **D**（互動教具）：~~全站 80 章都有教具~~ ✅ 0722（原 24→補齊 56 章、每章 1-2 對題教具、霧面玻璃美化）——**但林董 0723 定調「太薄」，升級為下方 §4.1.5 大工程**。
- [ ] 4.1.5 🔴🔴 **互動學習道具大工程（林董 0723 定調·全站加密）**——「教具＝能讓使用者真正學懂該章的互動道具、玩了就懂，不是塞選擇題充數」。**規則**：
  - **① 程式碼章節：每節課「沙盒(playground)必備」**（Python 走 Pyodide〔已自動預載 numpy/pandas/matplotlib、可出圖表〕、其他語言走 server sandbox `/api/playground/run`）。**除非該課只講概念** → 給對應道具。沙盒只放程式章、別亂塞。
  - **② 非程式章節：放該領域的道具**——例：寫作/創作章放 **WritingStudio**（TipTap 編輯器 + 即時字數 + 引導發部落格，✅ 已建、掛 ch51.3）；設計章配色/版面；SEO 章 SERP 預覽；創業章單位經濟試算；行銷章漏斗…（其餘非程式章的道具再想）。
  - **③ 既有好道具鋪更密**（flex-playground/json-tree/workflow-flow/box-model… 大章每 3-5 課一個）＋**可遊戲化引導**（概念闖關解鎖+XP、Debug 偵探點錯行、拖拉配對、限時 Speedrun）。
  - **④ 新互動元件 backlog（玩了就懂）**：~~RegexTester~~ ✅ 0723（打 pattern 即時看命中/群組、掛 ch64.4/ch04.24/ch07.25）、~~WritingStudio~~ ✅ 0723；待建：Tokenizer（看字→token 數/成本，LLM 章）/SortingViz（演算法）/SqlPlayground（SQL JOIN 視覺化）/NeuralForward+GradientDescent（深度學習）/HttpInspector（HTTP）/GitGraph（Git）/DataFrameExplorer（Pandas）/BigOGrapher/CronBuilder/SerpPreview/UnitEconomicsCalc/PersonaBuilder…
  - **做法**：新元件我逐一建（React demo 元件 + 註冊型別/dispatcher + 掛章 import DB）；沙盒全補 + 概念道具鋪章用平行子代理（spec：讀每課 content、code 課補 playground〔initialCode 從 content code block 改寫〕、概念課掛對題 demo）。**是跨多次 session 的大工程**、逐章推進逐次 commit。
  - **盤點基準（0723）**：程式章 code 課多已有 playground（ch1-11/17/19-22/33/76 覆蓋 90%+）；缺口＝ch26 資料/ML 段 20 課、ch7/16/31/32/47/48 部分、非程式章多只 1-2 demo。優先 ch26（Python 基礎·觸發此討論）當範本。
  - **進度**：
    - [x] ~~**ch26 Python 基礎（範本章）100% 覆蓋**~~ ✅ 0731——原 15 沙盒+1 教具 → **27 沙盒 + 12 教具、38 課 0 課沒互動**。新增 12 個可跑 Python 沙盒（Pyodide 預載 numpy/pandas/matplotlib/sklearn，每段本地 exec 驗過）＋11 個教具（PyTorch/HF/FastAPI/Django 等需 GPU/server 無法瀏覽器跑 → decision-quiz/workflow-flow/scenario-judge 對題）。commit ee91669d。
    - [x] ~~**ch7 程式邏輯共通（跨語言概念章）100% 覆蓋**~~ ✅ 0731——原 5 沙盒 → **17 沙盒 + 14 教具、28 課 0 課沒互動**。12 個新 JS 沙盒(每段 node 實跑驗過)＋11 個概念教具(記憶體/Big O/並發/設計模式/測試等純概念用 decision-quiz/scenario-judge/workflow-flow)。commit de9ae5d1。
    - [x] ~~**ch16 後端世界全圖（架構/策略章）100% 覆蓋**~~ ✅ 0731——原 12 沙盒 → 14 沙盒 + 11 教具、25 課 0 沒互動。2 個可跑 JS 沙盒(Token Bucket 限流 / N+1 查詢數暴增，node 驗)＋11 概念教具(語言選型/認證/快取/即時通訊/可觀測性/架構/趨勢等)。
    - [ ] 下一章：ch31 Node(25課8PG)、ch32 Go(25課10PG)、ch47 AI應用(25課8PG)、ch48 Vibe(29課14PG) 補沙盒；非程式大章鋪領域道具。
    - **驗證方法定調**：Python 沙盒本地 exec 驗、JS 沙盒 node 驗、教具 schema 驗——每個都確認能跑/合法才掛。
- [ ] 4.1.4 圖文解說圖：概念/B/D/E/F 區操作圖 110+ 張（🔴 等林董生圖；A 區 29 張 ✅）

### 4.2 程式辭典（→ 5000）
- [x] ~~seed 36–40：Python 模組 128 個（stdlib+外部）→ 1773 條~~ ✅ 0721
- [x] ~~seed 41：DB查詢/Git/K8s雲原生/LLM/分散式系統 33 條 → **1806 條**~~ ✅ 0721
- [x] ~~seed 42：網路協定/Web/資安/加密驗證 41 條 → **1847 條**（全查過無 slug 衝突）~~ ✅ 0721
- [ ] 4.2.1 續寫到 5000（現 **2348**，從 `dictionary-seed-65.json` 接）
  - [x] ~~seed 64：分散式系統進階 + 硬體/底層 + 深度學習 22 條 → **2348**~~ ✅ 0723（Raft/Paxos/腦裂/向量時鐘/CRDT/分散式鎖/outbox/Saga · CPU核心執行緒/GPU運算/SIMD/快取階層/RAM-vs-storage/韌體/硬體中斷 · 神經網路/反向傳播/激活函數/梯度消失爆炸/嵌入層/遷移學習/softmax溫度）
  - [x] ~~seed 63：資料庫進階 + 測試 + API 設計 22 條 → **2326**~~ ✅ 0723（MVCC/ACID-vs-BASE/髒讀/幻讀/視窗函數/遞迴CTE/觸發器/CDC · 測試金字塔/單元整合E2E/mock-vs-stub/性質測試/快照測試/契約測試/負載vs壓力 · REST成熟度/HATEOAS/API限流/API-Key-vs-OAuth/GraphQL-N+1/webhook安全/API淘汰）
  - [x] ~~seed 62：商業/產品 + SEO + 行銷成長 21 條 → **2304**~~ ✅ 0723（TAM-SAM-SOM/GTM/JTBD/MVP-MLP/pivot/PLG/飛輪 · on-page SEO/backlink/SERP/CWV/結構化資料/canonical/sitemap · 轉換漏斗/AARRR/歸因模型/再行銷/滴灌郵件/社會證明/誘餌內容）
  - [x] ~~seed 61：CSS 進階 + 型別理論 + 程式範式 20 條 → **2283**~~ ✅ 0723（@keyframes/CSS變數/巢狀/層疊層/特異性大戰/scroll-snap/aspect-ratio/流體排版 · 共變逆變/型別抹除/漸進式型別/和積型別/型別類別/變異標註 · 命令式/OOP/函數式/邏輯式/反射/面向切面範式）
  - [x] ~~seed 60：進階資料結構 + 網路底層 + PWA 22 條 → **2263**~~ ✅ 0723（B樹/LSM樹/紅黑樹/AVL/skip-list/併查集/環形緩衝/bitmap · 子網劃分/DNS記錄類型/DHCP/proxy-vs-vpn/ping/頻寬vs吞吐 · SW生命週期/web-manifest/安裝提示/app-shell/離線快取/背景同步/web-push/cache-storage）
  - [x] ~~seed 59：錯誤處理 + 可觀測性 + 可靠性/發布 23 條 → **2241**~~ ✅ 0723（try-catch-finally/例外vs錯誤/fail-fast/重試退避/斷路器/優雅降級/stack-trace/panic-recover · log級別/span-trace/OpenTelemetry/correlation-id/黃金訊號/RED指標/錯誤追蹤/可用性監控 · 零停機/安全DB遷移/主幹開發/回退策略/錯誤預算/toil自動化/影子流量）
  - [x] ~~seed 58：Linux/系統管理 + 密碼學 + 微服務模式 19 條 → **2218**~~ ✅ 0723（檔案權限/root-sudo/daemon/systemd/cron-job/套件管理器/PATH/磁碟用量/log輪替 · AES/RSA/salt-pepper/雜湊vs加密/金鑰交換 · API閘道/BFF/sidecar/絞殺榕/服務註冊表）
  - [x] ~~seed 57：統計/資料 + 身分驗證 + 快取策略 22 條 → **2199**~~ ✅ 0723（常態分佈/變異數/z-score/信賴區間/抽樣偏誤/貝氏/迴歸/大數法則 · OIDC/SSO/SAML/session-cookie/無密碼/MFA/RBAC-ABAC · cache-aside/write-through/write-back/TTL/LRU/SWR/CDN-purge）
  - [x] ~~seed 56：時間日期 + Unicode/文字編碼 + 開發工具 19 條 → **2177**~~ ✅ 0723（UTC時區/cron語法/日期解析/duration/單調時鐘 · Unicode/UTF-8/ASCII/字元編碼/BOM/grapheme/emoji編碼 · formatter/pre-commit/lockfile/功能開關/watch-mode/debugger/monorepo工具）
  - [x] ~~seed 55：郵件/訊息協定 + 媒體/壓縮 + 搜尋/索引 23 條 → **2158**~~ ✅ 0723（SMTP/IMAP-POP3/SPF-DKIM-DMARC/退信/MQTT/AMQP/訊息確認/at-least-once · gzip-brotli/有損無損/影像編碼/WebP-AVIF/lazy-image/轉碼/bitrate/自適應串流 · 反向索引/TF-IDF/全文索引/模糊搜尋/字幹還原/自動完成/相關性評分）
  - [x] ~~seed 54：並發/非同步 + 雲端服務 + 金流/支付 21 條 → **2135**~~ ✅ 0723（actor模型/綠色執行緒/thread-pool/worker-pool/生產消費者/反應式/事件驅動/lock-free · serverless/物件儲存/blob/託管DB/可用區 · 金流閘道/PCI-DSS/代碼化/3DS/訂閱計費/webhook冪等/chargeback/退款流程）
  - [x] ~~seed 53：敏捷協作 + 遊戲/圖形 + CS 理論 20 條 → **2114**~~ ✅ 0723（每日站會/燃盡圖/泳道/程式凍結/發布列車 · delta-time/tick-rate/物理引擎/ECS/shader/光柵化/光線追蹤/z-buffer · 有限狀態機/圖靈機/NP完全/圖走訪/位元運算/雜湊碰撞/regex引擎ReDoS）
  - [x] ~~seed 52：函數式編程 + 網頁平台 API + 無障礙 19 條 → **2094**~~ ✅ 0723（宣告式vs命令式/不可變/記憶化/pipe-compose/ADT · Fetch/AbortController/Web-Share/Clipboard/Notification/Geolocation/History API · aria-label/報讀器/鍵盤導覽/焦點管理/對比度/WCAG/prefers-reduced-motion）
  - [x] ~~seed 51：編譯器/語言實作 + 行動 App + 網路底層 18 條 → **2075**~~ ✅ 0723（AST/lexer/parser/JIT/transpiler/linker/符號表/IR/靜態vs動態型別 · 程式碼簽章/OTA更新/生物辨識/背景抓取/App沙盒/原生橋接 · TCP-vs-UDP/base64/NAT穿透）
  - [x] ~~seed 50：資料庫深入 + API/整合 + 工程師黑話/Web3/可靠性 22 條 → **2057**~~ ✅ 0723（複合索引/分區/VACUUM/代理鍵/ER圖/連線字串 · offset-cursor分頁/REST-vs-RPC/OpenAPI/SSE/HTTP快取 · cargo-cult/footgun/NIH/蛇油/nitpick/golden-path/容錯/共識機制/L2擴容/區塊鏈預言機）
  - [x] ~~seed 49：機器學習深入 + UX/設計原則 23 條 → **2035**~~ ✅ 0723（過擬合欠擬合/偏差變異/dropout/batchnorm/epoch-batch/one-hot/特徵縮放/集成/隨機森林/k-means · 原型/啟發式評估/資訊架構/使用者流程/persona/可用性測試/費茲定律/完形原則/擬物設計/黑暗模式/微文案/視覺層次/漸進揭露）
  - [x] ~~seed 48：作業系統/底層 + 資安攻擊手法 26 條 → **2012**~~ ✅ 0723（排程器/context-switch/mutex-semaphore/syscall/核心態/CPU快取/位元組序/stack-vs-heap/page-fault/paging-swap/fork-exec/殭屍行程 · 威脅建模/滲透測試/SAST-DAST/CVE-CVSS/命令注入/不安全反序列化/SSTI/XXE/TOCTOU/橫向移動/縱深防禦/供應鏈攻擊/開放重導向/安全標頭）
  - [x] ~~seed 47：AI/LLM 進階 + 產品成長黑話 25 條 → **1986**~~ ✅ 0723（temperature/max_tokens/stop-seq/logit-bias/串流/Transformer/MoE/KV-cache/context-caching/few-shot/AI-agent/LLM-eval/VLM/chunking/vector-embedding/reranking/hybrid-search/context-stuffing · 北極星指標/啟用/成長循環/護城河/單位經濟/LTV-CAC/燒錢率-續命期）
  - [x] ~~seed 46：軟體工程實務——後端/DevOps/SOLID 原則/資料工程/前端建置 28 條 → **1961**~~ ✅ 0722（多層快取/ACID/fan-out/DB索引 · artifact-registry/metrics/SLO-SLA-SLI/GitOps/Helm/service-discovery/負載測試 · SOLID/單一職責/開放封閉/里氏替換/介面隔離/重構/契約式設計/SemVer · ETL/批次vs串流/列式儲存/資料血緣/schema演進/backfill · minify/hydration-mismatch/HMR）
  - [x] ~~seed 43：前端框架/React-Vue/TS 型別/測試 概念黑話 31 條 → **1878**~~ ✅ 0722（ssr-csr/render-props/HOC/受控非受控/portal/ref-forwarding/debounce/throttle/island-arch/RSC/樂觀更新/衍生狀態/雙向綁定/單向資料流/組合優於繼承/slot/teleport/watcher/computed/reactivity/proxy-signal 響應式/utility-type/satisfies/infer/mock/stub/spy/AAA/回歸測試/coverage）
  - [x] ~~seed 44：Git/CLI-shell/CSS 版面 黑話 30 條 → **1908**~~ ✅ 0722（cherry-pick/squash/upstream/remote-tracking/hunk/merge-vs-rebase/commit-sha · pipe/stdin-out-err/glob/redirect/ssh/tmux/背景執行/signal/grep/sed/awk/curl/ripgrep/man · stacking-context/reflow-repaint/grid/BFC/rem-em/will-change/clamp/container-query/subgrid）
  - [x] ~~seed 45：資料結構/演算法/設計模式 + 瀏覽器/JS 進階 25 條 → **1933**~~ ✅ 0722（stack/queue/heap/graph/big-O/複雜度/排序/貪婪/singleton/closure · shadow-DOM/web-component/micro-macrotask/promise/generator/iterator/spread-rest/template-literal/tagged-template/weakmap/proxy/reflect/web-storage/structuredClone/EventEmitter）
  - [x] ~~4.2.1.1 ⚠️ 續寫前先跑 slug 去重掃描~~ ✅（已建流程：cat 全 seed 抽 slug → grep 候選 → python 驗證無 collision 才 author）
  - [x] ~~4.2.1.2 挑真正沒收的主題~~ ✅ seed-41 已用「資料庫/Git/K8s/LLM/分散式」；下批可挑前端框架黑話、TS 型別、測試、資安、網路協定
  - [ ] 4.2.1.3 每批 author → `node scripts/import-dictionary.mjs` → commit（持續）
  - [x] ~~4.2.1.4 新批次跑 `node scripts/translate-sync-all.mjs` 補 i18n~~ ✅ 0723 **翻譯 backlog 清完**（辭典 i18n 99% 覆蓋＝17962/18123 非空欄位×語言；跑了多輪 1000/輪迴圈直到 script 回「已同步完」。＊分母是「非空欄位」：僅 1345/2348 詞條有 analogy，其餘只翻 zh_name+plain。免費 Google、冪等）
- [ ] 4.2.2 語言島（英/日辭典，沿用 `domain='english'|'japanese'`）

### 4.3 其他內容
- [ ] 4.3.1 計畫書 ch2/ch6/ch7 + pitch-deck 對齊 `repositioning.md`
- [ ] 4.3.2 手寫種子 top-up（全手寫不花 AI 錢）：筆記市集包（目標 120+/包）、部落格固定文（AI persona 生成器會花錢、不跑）

---

## 五、首頁 / 全站 UI

- [x] ~~Hero 沉浸滾動穿越 / GPT 實景日夜 / 2.5D 骨架 / StageMap / 玻璃卡 / 淺色修正~~ ✅（0714–0715）
- [ ] 5.1 **完整 5 層視差**（`stage-layer-01~05` 同尺寸對齊 → `ParallaxScene` 疊真 2.5D）——🔴 asset-blocked（等 GPT 交同尺寸五層，見 §🅰）
- [ ] 5.2 各區塊重做（吉祥物三張去背卡 / 副本+魔王整併 / 精選章節 / 生涯路徑）——部分等 char 圖
- [ ] 5.3 WorldMap 接真實進度（`stateFor()` → done/current/locked）
- [ ] 5.4 玻璃/動效/間距外溢到 章節/分身島/機會島/辭典（一區一區換、每次驗亮暗+不破版）
- [ ] 5.5 手機 nav 展開透明度微調（`TopNav.tsx` 續調）
- [ ] 5.6 其餘主視覺（夜景 CTA / 五模式小圖 / char 去背）
- [x] ~~5.7 全功能使用說明 / 使用教學~~ ✅ 0722（共用元件 `components/FeatureGuide.tsx`：收合狀態記 localStorage、全站一致；掛到機會島/分身島 Agent/每日運勢命理/訊息軍師/AI 求職包五大新功能頂端，逐步驟教怎麼用 + 提醒付費/隱私/免責）
- ＊參賽級門檻：破版/對比/RWD/動效都要過。

---

## 六、商業 / 變現 / 社群

- [ ] 6.1 Z幣經濟：⬜ 商城 sink（寵物配件/主題）、⬜ 儲值 4 套餐、⬜ 訂閱付款監測 dashboard、⬜ Z幣綁 Agent 動作、⬜ 點數代管方案
- [x] ~~6.2 **可驗證證書**：公開驗證頁~~ ✅ 0721（原審計誤判「不存在」）：`/certificates/[code]` 本就是公開驗證頁（admin 讀繞 RLS、依 verification_code、含 OG 圖）→ 補「✓ 已通過 AI 島官方驗證」badge（4 語）+ 新增 `/verify`（驗證碼輸入 portal）與 `/verify/[code]`→證書頁 redirect。市集收尾另計。
- [ ] 6.3 學習社群 / Cohort 使用者端（只有 `admin/cohort` 分析、無 `study_groups` 表/使用者頁）：期數制、組隊 Boss、讀書會
- [ ] 6.4 SRS 間隔複習、每週學習週報自動化、賽季排行榜
- [ ] 6.5 直播/即時答疑（`live_sessions` 表/頁不存在）
- [ ] 6.6 企業方案 dashboard（`organizations` 表/頁不存在）
- [ ] 6.7 職缺媒合、跨產品錢包（長線）
- [x] ~~付費 paywall/單章購買/包年/訂閱、退費工單、聯盟分潤、AI 額度分層、模擬面試、導師檔案~~ ✅（ROADMAP S6/S10/S12）
- [ ] 6.8 **付費 gating 深化 ＝「回原路線」B 更深的部分**（0722 盤點、動金流風險高、**單獨開對話做**）：①兩套 Stripe/金流收斂（統一 `payments/` vs 舊 `me/checkout`+`stripe.ts`）②plus vs pro 分層**真正生效**（現多數 gate 只判「有沒有訂閱」、plus=pro）③兩條加幣路徑收斂（`zcoin.ts` vs `gamification`/`referral`）④統一 402 gate helper（現各路由各自 429）。詳見記憶 `monetization-gating-map`。（B 的**安全核心**已做：`fortune-gate` + 堵住易經燒 LLM 漏洞 ✅ 0722）

---

## 七、安全 / 合規 / 品質 / 技術債

- [~] 7.1 **真 CSP header**：~~先上 Report-Only~~ ✅ 0722（`next.config.mjs` headers 加 `Content-Security-Policy-Report-Only`：default/base/object-none/frame-ancestors/form-action/img/font/style/script/connect/media/worker/manifest；只回報不阻擋、不會弄壞站）。待收斂：觀察 console/report 無誤 → 改 `Content-Security-Policy`（enforce）+ script-src 換 nonce（需 middleware 注入、去掉 unsafe-inline/eval）+ connect-src 收成明確網域
- [ ] 7.2 **Cloudflare Turnstile + 蜜罐**（repo 零實作、只在章節 JSON 出現）
- [x] ~~7.3 **GDPR `user_settings` 表**（無此表、gdpr/export 靜默略過）~~ ✅ 0721：移除死查詢、改匯出真的有的 per-user 設定表 `user_blog_settings` + `email_subscriptions`（通知/LINE 偏好本就在 profiles.* 已 dump）；DB 實測兩表 user_id OK。
- [ ] 7.4 v1 API key **輪替/停用 admin UI**（表存在、無 UI）
- [ ] 7.5 綠寶 **AI Code Review endpoint**（`api/creator-island/ai/` 下缺 code-review）
- [ ] 7.6 作業**自動批改**（現 `graded_by:null` 純手動）+ 教師/助教 role admin 介面 + 作業批改介面
- [ ] 7.7 監控 LT-17：Sentry / PostHog 接上（錯誤 + 產品分析）
- [ ] 7.8 **更新法律頁** `/privacy`、`/terms`、`/cookies`（對齊現況：AI/BYOK、分身島對外動作、連結外部帳號、LINE 推播、機會島來源、@提及、個資保存）
- [x] ~~7.9 apple-touch-icon~~ ✅（核對發現已滿足：`src/app/apple-icon.tsx` 180×180 Next.js 慣例檔自動輸出 `<link rel="apple-touch-icon">`；192/512 maskable 也早已補齊。todo 為舊資訊）
- [ ] 7.10 效能收尾：bundle analyzer、剩餘 `select("*")`→明確欄位、RLS `is_admin()` SECURITY DEFINER + index、大檔上傳 OOM（平台附件路徑仍可能 buffer；creator 已 presigned）
- [ ] 7.11 AI 成本記帳 P2–P4（P0/P1 ✅）：P2 語意快取推廣、P3 路由統一、P4 RAG/vision 擴充；H2 殘留記帳（embeddings/Whisper/og 圖）
- [ ] 7.12 測試：E2E + Smoke 擴充；3D 島嶼降耗
- [ ] 7.13 N8N 12 workflow（🔴 external·self-host gated；部分被站內 agent/cron 取代）
- [ ] 7.14 AI 草稿語意抽查（手動 QA）
- [ ] 7.15 **清 dead endpoint / 補半成品 UI**（0721 接線掃描：無「UI 沒後端」，但有 ~14 支「後端沒前端」）
  - [ ] 7.15.1 冗餘可刪（有 sibling 取代）：`api/me/checkout`（用 `payments/checkout`）、`api/store/inventory`、`api/review/list`、`api/me/learning-plan`(base)、`api/creator-island/assets/[id]/lineage`
  - [~] 7.15.2 真孤兒接前端（subagent 盤點：6 可接、3 已另有 UI 免接）：
    - [x] ~~notify-leave（VisitTracker 加 pagehide sendBeacon 回報停留）~~ ✅ 0722
    - [x] ~~community/follow（SocialFeed PostCard 加追蹤鈕）~~ ✅ 0722
    - [x] ~~series/[id] PATCH/DELETE（EngineWorkspace 加系列改名/刪除）~~ ✅ 0722
    - [x] ~~fruit ledger（PayoutClient 果實收支明細）~~ ✅ 0722
    - [x] ~~agent/threads（AgentClient 歷史對話側欄 + 切換/刪除）~~ ✅ 0722
    - [x] ~~ai/runs（GrowthClient AI 用量/成本 分頁載入）~~ ✅ 0722
    - [x] 🏁 6 支可接孤兒端點全接完（3 支 redundant 已另有 UI）
    - ＊已另有 UI 免接（redundant wrapper 可留可刪）：recommended-chapters（/me RecommendedChapters 已 server 直呼）、forum/user/[userId]（頁面已存在且 3 處連入）、ai/route-suggest（非強制 advisory、無人呼叫）
    - [ ] 7.15.2.1 優先：`creator-island/community/follow`（追蹤鈕似乎沒接）、`ai/runs`（前端缺、= §8.5）、`me/recommended-chapters`（= §9.2 推薦）

---

## 八、Creator Island 收尾（M0–M4 + Phase 2 ✅ 已上線）

- [~] 8.1 M5 Hardening（smoke ✅；tests / a11y / perf / security-review 待補）
- [ ] 8.2 真金流 marketplace + KYC（🔴 需決策）
- [ ] 8.3 Workflow 視覺編輯器（+ n8n 整合）、其餘 agents、Knowledge 區、Growth skill tree、E11 完整版、Agent Blueprint、沉浸式島嶼
- [ ] 8.4 真·外部 cross-post OAuth（Threads/IG/Medium）
- [ ] 8.5 記憶管理使用者頁、AI run/成本儀表板前端（`api/creator-island/ai/runs` 有、前端缺）
- [x] ~~碎片庫/社群/通知/島內 AI/發 blog/presigned/創作引擎/後台 AI/RWD、AI 編織歌曲更完整、綠寶搜尋碎片寫歌~~ ✅（0721 含歌曲+綠寶搜尋碎片）

---

## 九、未來 / 長線（v7+·先擱置）

- [ ] 9.1 AI 模型中台升級（統一路由/降級/成本）
- [ ] 9.2 Chapter 推薦演算法、全站語意搜尋 UI
- [ ] 9.3 Marketing OAuth、A/B ad copy、人生星圖（暫緩）
- [ ] 9.4 其他島嶼（Learning / Business / Research / Language Island）
- [ ] 9.5 多語系深化（i18n 管線已有）、AI 老師 marketplace

---

## 十、這幾天（0717–0721）做完的大區塊 ✅（劃線歷史索引）

- [x] ~~**內容重寫大工程**：ch49/ch50 旗艦章 de-can + 教具；薄章補厚 ch06/11/12/14/23/25/37/42（de-can 91 題）；ch03/13/43/44/45/47/48/51–60 深度重寫~~
- [x] ~~**教具庫 +3 新元件**：AgentLoop（ReAct 逐步）、WorkflowFlow（n8n/SW 資料流）、JsonTree（互動 JSON 樹）＋複用 ScenarioJudge/PromptLab/PriorityMatrix… 分散掛章~~
- [x] ~~**辭典**：seed 36–40 Python 模組 128 個（stdlib+外部）→ 1773 條~~
- [x] ~~**box-model / prompt-lab 互動教具** 上線並掛 ch02.3 / ch51.1~~
- [x] ~~**Creator Island**：AI 編織歌曲更完整（全段落結構、≥2 verse、chorus×3、Suno 英文標籤）+ 綠寶「搜尋碎片→選取→編織/手動」寫歌~~
- [x] ~~**NotebookLM 創業計劃書指南** + 來源包（防膨風提示詞·11 章主題）~~
- [x] ~~**產品方向**：大眾變現四功能寫入待辦（本檔 §一）~~

---

## 附錄 A：舊檔核對裁決（2026-07-21，subagent × 程式/git 交叉驗證）

| 檔案 | 裁決 | 說明 |
|---|---|---|
| `todo_list_0715.md` | **前主檔** | 內容已併入本檔；本檔取代之。 |
| `todo_list_0714.md` | 歷史 | 自宣告被 0715 取代；未完項已併入本檔。 |
| `todo_list_0713.md` | 歷史 | 分身島×機會島大母表；核心 L1–L5/office/雷達 V1–V4 ✅，未完項已併入 §二/§三。 |
| `0705new_todotask.md` | **全數關閉** | #86–#106 全 ✅（含 FIE 白皮書 M1–M5），無殘留。 |
| `MASTER_TODO.md` | 已被取代 | 0629 曾為真源；PWA 192/512 icon 現已 ✅（勿再開），未完項併入 §六/§七。 |
| `ROADMAP_2026Q3.md` | 歷史（設計存查） | S1–S12 ~90% 已上線；淨未完＝學習小組(§6.3)、直播(§6.5)、企業(§6.6)、K1 polish 零星。 |
| `TODO.md` | 歷史 | 0623 最舊；未完 5 項是 MASTER_TODO 子集，已併入。 |
| `BACKLOG.md` | 歷史 | 自宣告被 REPORTS 整合；未完項（憑證/市集/cohort/Z幣 sink…）併入 §六/§七。 |
| `REPORTS_TODO_2026-06-03.md` | 歷史 | 0603 整合檔；安全 B 大多 ✅，未完＝CSP/Turnstile/憑證頁（併入 §七/§六）。 |
| `BEGINNER_FRIENDLY_BACKLOG.md` | 歷史（被 0717 audit 取代） | 「用人話講」100% ✅；深度重寫改由 `content_audit_0717.md` 主導、未完章併入 §4.1。 |

> **重要修正**：PWA 192/512 icon（多檔列為未做）**現已完成**（`public/logo-192.png`/`logo-512.png` + `manifest.ts` maskable），只剩 apple-touch-icon（§7.9）。TG/Discord 現有 webhook 是 **admin AI-chat bot、非 agent 入口**（§2.2.2/2.2.3 仍未做）。社群 send adapter 是最大半成品（§2.3.2）。
