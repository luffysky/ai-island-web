# AI 島待辦總表 2026-07-21（**現行主檔**）

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
    - [ ] 1.1.1.2 農曆↔國曆轉換（現成庫/查表；八字需時辰）← 第二刀（裝 `lunar-javascript`）
      - [ ] 1.1.1.2.1 無時辰的 fallback（只算日主/星座、標示精度較低）
  - [x] ~~1.1.2 `fortune_daily` 快取表（唯一鍵 user_id+date+kind、payload jsonb）＝冪等不重複燒 LLM~~ ✅
  - [x] ~~1.1.3 API `/api/fortune/today`（快取優先、沒快取才 `completeForUsage("agent_core")` 生成+存）~~ ✅（邏輯抽到 `lib/fortune-service.ts` 與 cron 共用）
  - [ ] 1.1.4 API `/api/fortune/tarot`（POST：抽牌+AI 解讀、Z幣/付費門檻）← 第二刀
  - [x] ~~1.1.5 API `/api/fortune/profile`（GET/PUT：生日資料、自動算西洋星座）~~ ✅
- [~] 1.2 LLM 生成
  - [x] ~~1.2.1 運勢 prompt（整體/愛情/事業/財運 + 幸運色/數字 + 一句提醒 + score）~~ ✅（`lib/fortune.ts`）
    - [x] ~~1.2.1.1 護欄：不做醫療/投資/法律具體斷言、語氣正向不製造焦慮~~ ✅
    - [x] ~~1.2.1.2 結構化輸出 JSON + 容錯解析 parseFortune（含越界收斂、fallback）~~ ✅（8 支單元測試）
  - [ ] 1.2.2 塔羅牌庫（78 張大小阿爾克那 + 正逆位含義）→ 抽牌 → 依牌+提問 LLM 解讀 ← 第二刀
  - [~] 1.2.3 命理輕量版：星座先行 ✅（純月/日運算、零外部庫）；八字/紫微標進階（之後接）
- [~] 1.3 前端 `/fortune`
  - [x] ~~1.3.1 首次生日/時辰輸入頁 + 每日運勢卡（三面向卡 + score 環 + 幸運色塊/數字 + 今日提醒）~~ ✅
  - [ ] 1.3.2 塔羅抽牌互動（翻牌動畫、解讀）← 第二刀
  - [~] 1.3.3 分享卡：native share / 複製文字（帶站點浮水印）✅；截圖圖卡（html-to-image）← 之後
  - [~] 1.3.4 RWD + 亮暗 ✅；免費/付費分界 UI（MVP 全免費、gating ← 第二刀）
- [~] 1.4 LINE 每日推播
  - [x] ~~1.4.1 cron `/api/cron/fortune-daily`（撈綁 LINE + 開推播 + 有生日者、生成+推、dedupe、cap 500）~~ ✅
    - [ ] 1.4.1.1 🔴 去 cron-job.org 手動加 job #10（每天 00:00 UTC=台灣08:00 `GET /api/cron/fortune-daily?secret=<CRON_SECRET>`）
  - [x] ~~1.4.2 訂閱/退訂設定（`line_pref_fortune` 欄 + /settings 通知偏好開關 + notification-prefs API）~~ ✅
- [ ] 1.5 變現：免費看整體大方向；付費/Z幣解鎖四面向深解+塔羅+每日私人推播（沿用創作者綠寶軟上限模式）← 第二刀
- [x] ~~1.6 收尾檢查（tsc/vitest 145/next build 全綠 + DB 接線實測 + 4 語 nav i18n）~~ ✅ 0721 第一刀
- 🆕 **入口**：nav「每日運勢」（4 語 i18n、桌機抽屜+手機選單）✅；首頁模式卡 ← 待接（配 §🅰 生圖）。

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
- 🆕 **入口**：nav「訊息軍師」(4 語 i18n) ✅；`message_coach` 已註冊進 AiUsageKey（後台可配模型）✅。

### 3. AI 求職包（履歷+自傳+面試模擬+求職信）⬜
- [ ] 3.1 `resume_profiles` 表（經歷/技能/目標職位）
- [ ] 3.2 後端
  - [ ] 3.2.1 產履歷/自傳/求職信（結構化輸出）
  - [ ] 3.2.2 PDF 產出（沿用現有 PDF 能力）
  - [ ] 3.2.3 面試模擬（agent 對話：AI 面試官出題→答→回饋報告）
- [ ] 3.3 前端 `/job-kit`：填經歷精靈→產文件→下載 PDF；面試模擬對話 + 回饋
- [ ] 3.4 變現：一次性產包付費 / 短訂閱
- [ ] 3.5 收尾檢查

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
- [ ] 4.3 L2 程式沙盒 🔴（需 Zeabur `ENABLE_SERVER_BROWSER=1`）：跑 agent 產的 code（isolated-vm/容器、限時間/記憶體/網路）
- [ ] 4.4 成本 / ROI Dashboard ⬜（per-user 用量記帳、省了多少、效率排行）
- [ ] 4.5 技術債：stale-task reaper（Zeabur process 重啟會孤兒化進行中任務）

🆕 潛力池（之後評估）：AI 陪伴角色（沿用島吉祥物+記憶、情感黏著）、AI 合約白話解讀（已有 PDF 解析 unpdf）、AI 老照片修復/證件照（需付費生圖 API·暫緩）、AI 交友/約會訊息軍師。

---

## 二、分身島 Agent（補完 · 承 0713/0714）

### 2.1 引擎 L1–L5 進階（核心 L1–L5 ✅ 已上線）
- [ ] 2.1.1 L2 程式沙盒（isolated-vm/container）— 未實作，見 §4.3（需 🔴 env）
- [ ] 2.1.2 L2 互動式伺服器瀏覽器（`browser.render` code done、仍 stub、需 🔴 env 驗活）
- [ ] 2.1.3 L4 執行中自動建 skill（現為事後手動 synthesize）
- [ ] 2.1.4 L5 經理–專才階層調度（現只有平行 fan-out）
- [ ] 2.1.5 真串流部分成果（partial results streaming）
- [ ] 2.1.6 工具自動發現（OpenAPI → tools）
- [~] 2.1.7 預算感知硬上限（free-first + 每日上限 + 省錢三檔 ✅；per-task hard cap 部分）
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
- [~] 2.6.2 產出佇列（approvals 聚合 ✅；草稿全文預覽未做）
- [ ] 2.6.3 員工協作（用 L5）；2.6.4 「登入＝AI 公司」世界觀（能力向量/招募/培訓/KPI）
- [ ] 2.6.5 Agent 互相直接共享資料（寫 DB 不經 LLM）
- [ ] 2.6.6 工作空間 Hub（簡報/表格/文件生成器聚合入口——大工程）

### 2.7 省 token（Snow Orchestrator）＆ MCP／技能
- [ ] 2.7.1 Rule-filter 完整層；2.7.2 Agent 任務 Embedding RAG（站內有 embeddings、agent 未接）
- [ ] 2.7.3 Diff 只讀變動；2.7.4 Event-driven + Sleep + per-agent daily budget
- [~] 2.7.5 成本/ROI Dashboard（KPI/office 表現骨架 ✅；cost/efficiency 排行未做）＝同 §4.4
- [ ] 2.7.6 Cost-per-Task benchmark 實測；2.7.7 AI COO
- [ ] 2.7.8 MCP 外部實戰測試；2.7.9 MCP Marketplace + 技能市集分享
- [ ] 2.7.10 技能 YAML 完整規格；2.7.11 內建技能 workflow 補齊（GitHub管家/檔案整理師…）
- [~] 2.7.12 技能成效統計（usage ✅；熱門排序未做）；2.7.13「用 Agent→學會建 Agent」教學閉環

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
- [ ] 3.5 表：⬜ `opportunity_changes`、⬜ `user_portfolio`、⬜ `submission_tasks`（三表驗證不存在）
- [~] 3.6 篩選/詳情：多選 chips ✅、快截止 ✅。待：⬜ 地區/獎金/身分篩選、⬜ prep_effort AI 估算、⬜ 詳情頁 FAQ/PDF 版本、🚧 我的機會 Dashboard、⬜ 機會地圖
- [ ] 3.7 Pipeline / 跨島：機會流水線閉環、20 個機會島 Agent、與創作者島/學習島結合、社群經驗層
- [ ] 3.8 商業模式：方案分層機制

---

## 四、內容 / 辭典 / 教具

### 4.1 章節內容（de-can 罐頭練習 + 加深 + 教具）
- [x] ~~**旗艦章 ch49 AI Agent / ch50 n8n**：de-can + 新教具 AgentLoop/WorkflowFlow~~ ✅ 0721
- [x] ~~**薄章補厚 ch06/11/12/14/23/25/37/42**：de-can 91 題 + JsonTree/複用 ScenarioJudge·WorkflowFlow~~ ✅ 0721（ch15/ch24 本就 0 罐頭）
- [x] ~~ch03/13/43/44/45/47/48/51–60/33(Rust)/76(Angular) 深度重寫~~ ✅（0717 起陸續）
- [ ] 4.1.1 **剩餘技術章 de-can**（audit：ch01–60 曾 74% 罐頭練習，只清了旗艦+薄章）：ch01/02/04/05/07/08/09/10/16/17/26–32/34/35/36/46… 逐章 de-can + 視情況疊教具
- [ ] 4.1.2 **deep-rewrite tier 未動章**：ch15、ch24、ch32、ch34、ch35、ch36、ch40、ch41、ch63、ch68（strict-spec）、ch72–75、附錄 ch61–67/69–70
- [ ] 4.1.3 教具庫擴充：mobile 專屬教具（給 ch11）、規劃 B 教具（RegexTester/CronBuilder/JsonInspector 進階/HttpInspector/Tokenizer/SortingViz/GitGraph/NeuralForward/AuthFlow/MLBoundary）——依技術章需要再建
- [ ] 4.1.4 圖文解說圖：概念/B/D/E/F 區操作圖 110+ 張（🔴 等林董生圖；A 區 29 張 ✅）

### 4.2 程式辭典（→ 5000）
- [x] ~~seed 36–40：Python 模組 128 個（stdlib+外部）→ 1773 條~~ ✅ 0721
- [ ] 4.2.1 續寫到 5000（現 **1773**，從 `dictionary-seed-41.json` 接）
  - [ ] 4.2.1.1 ⚠️ 續寫前先跑 slug 去重掃描（辭典已很滿；「工程師黑話」早期 seed 已收很多、seed-41 首版 31 條撞名 27 條已廢）
  - [ ] 4.2.1.2 挑真正沒收的主題（可考慮：資料庫術語、Git 進階、雲原生/K8s 術語、前端框架黑話、AI/LLM 名詞）
  - [ ] 4.2.1.3 每批 author → `node scripts/import-dictionary.mjs` → commit
  - [ ] 4.2.1.4 新批次跑 `node scripts/translate-sync-all.mjs` 補 i18n（免費 Google、冪等）
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
- ＊參賽級門檻：破版/對比/RWD/動效都要過。

---

## 六、商業 / 變現 / 社群

- [ ] 6.1 Z幣經濟：⬜ 商城 sink（寵物配件/主題）、⬜ 儲值 4 套餐、⬜ 訂閱付款監測 dashboard、⬜ Z幣綁 Agent 動作、⬜ 點數代管方案
- [ ] 6.2 **可驗證證書**：`/verify/[certId]` 公開驗證頁（**驗證不存在**）+ 市集收尾
- [ ] 6.3 學習社群 / Cohort 使用者端（只有 `admin/cohort` 分析、無 `study_groups` 表/使用者頁）：期數制、組隊 Boss、讀書會
- [ ] 6.4 SRS 間隔複習、每週學習週報自動化、賽季排行榜
- [ ] 6.5 直播/即時答疑（`live_sessions` 表/頁不存在）
- [ ] 6.6 企業方案 dashboard（`organizations` 表/頁不存在）
- [ ] 6.7 職缺媒合、跨產品錢包（長線）
- [x] ~~付費 paywall/單章購買/包年/訂閱、退費工單、聯盟分潤、AI 額度分層、模擬面試、導師檔案~~ ✅（ROADMAP S6/S10/S12）

---

## 七、安全 / 合規 / 品質 / 技術債

- [ ] 7.1 **真 CSP header**（`next.config.mjs` 目前無；先前「已做」是章節內容誤判）→ 先 Report-Only 再收斂
- [ ] 7.2 **Cloudflare Turnstile + 蜜罐**（repo 零實作、只在章節 JSON 出現）
- [ ] 7.3 **GDPR `user_settings` 表**（無此表、gdpr/export 仍靜默略過）→ 建表或移除引用
- [ ] 7.4 v1 API key **輪替/停用 admin UI**（表存在、無 UI）
- [ ] 7.5 綠寶 **AI Code Review endpoint**（`api/creator-island/ai/` 下缺 code-review）
- [ ] 7.6 作業**自動批改**（現 `graded_by:null` 純手動）+ 教師/助教 role admin 介面 + 作業批改介面
- [ ] 7.7 監控 LT-17：Sentry / PostHog 接上（錯誤 + 產品分析）
- [ ] 7.8 **更新法律頁** `/privacy`、`/terms`、`/cookies`（對齊現況：AI/BYOK、分身島對外動作、連結外部帳號、LINE 推播、機會島來源、@提及、個資保存）
- [ ] 7.9 apple-touch-icon（192/512 maskable ✅ 已補、僅缺 apple-touch）
- [ ] 7.10 效能收尾：bundle analyzer、剩餘 `select("*")`→明確欄位、RLS `is_admin()` SECURITY DEFINER + index、大檔上傳 OOM（平台附件路徑仍可能 buffer；creator 已 presigned）
- [ ] 7.11 AI 成本記帳 P2–P4（P0/P1 ✅）：P2 語意快取推廣、P3 路由統一、P4 RAG/vision 擴充；H2 殘留記帳（embeddings/Whisper/og 圖）
- [ ] 7.12 測試：E2E + Smoke 擴充；3D 島嶼降耗
- [ ] 7.13 N8N 12 workflow（🔴 external·self-host gated；部分被站內 agent/cron 取代）
- [ ] 7.14 AI 草稿語意抽查（手動 QA）
- [ ] 7.15 **清 dead endpoint / 補半成品 UI**（0721 接線掃描：無「UI 沒後端」，但有 ~14 支「後端沒前端」）
  - [ ] 7.15.1 冗餘可刪（有 sibling 取代）：`api/me/checkout`（用 `payments/checkout`）、`api/store/inventory`、`api/review/list`、`api/me/learning-plan`(base)、`api/creator-island/assets/[id]/lineage`
  - [ ] 7.15.2 真孤兒·多半是半成品 UI 要嘛接前端要嘛移除：`api/creator-island/{fruit, ai/runs, community/follow, series/[id] PATCH/DELETE}`、`api/me/recommended-chapters`、`api/forum/user/[userId]`、`api/ai/route-suggest`、`api/agent/threads`、`api/notify-leave`
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
