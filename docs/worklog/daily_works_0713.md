# 工作日誌 2026-07-13 — 分身島搜尋大修 + L4/L5/L2 引擎收尾 + 統一金鑰

> 本日詳細分項另見 `docs/worklog/daily_works_0712.md` 尾段（同一 session 連續）。
> **所有待辦統一放 `docs/todo/todo_list_0713.md`**（分身島 × 機會島 × 全站，含已完成劃線 + 建議順序）。以後待辦都寫進那個檔。

## 今日完成（已上線 / 已 push）
1. **Agent 搜尋效率大修**：查夠就收尾（web 工具 7 次硬上限）、合成不丟資料（stepEvidence + 濾驗證頁 + 禁編造）、修「結果吐 reasoning 草稿」（sanitizeAnswer + 強模型吐草稿改用 Haiku 重產）。
2. **搜尋省額度**：三級免費優先 **DDG → Tavily(非中文才用) → Brave**；實測 Tavily 對中文 0 結果 → 中日韓查詢自動跳過。Google CSE 全網被 Google 淘汰 → 移除。
3. **搜尋 BYOK + 統一金鑰**：Brave/Tavily 使用者自貼 key（AES-256-GCM 加密存 `user_api_keys`）+ 兩張卡加「如何免費申請」教學；註冊成 BYOK provider → **匯集 `/settings/ai-keys` 統一新增/測試/開關/刪除**。
4. **技能商店 v2（45→62）**：+11 支會自己搜尋的技能（找店/深研/市調/比價/行程/簡報/競賽獵人/學習教練/找課/計算/動態頁）+ 升級 12 支舊研究技能加 web.search+web.research。migration 已上 prod。
5. **L4 技能合成**：完成的任務一鍵「存成技能」→ AI 蒸餾成一般化技能草稿、開建立視窗預填。
6. **L5 平行多代理**：≥3 個可獨立子任務 → 子代理唯讀並行查 + 強模型合併去重；失敗落回序列。
7. **L2 伺服器瀏覽器（選配、預設關、零風險）**：`browser.render` 加 `ENABLE_SERVER_BROWSER` 開關；Dockerfile 加**選配** build arg `INSTALL_SERVER_BROWSER`（不設＝部署零變動）。
8. **文件**：`docs/todo/todo_list_0713.md` 匯集全部 10 份規劃文件的分身島/機會島完整待辦。

## 🚨 收尾前檢查清單（CLAUDE.md 鐵規則）
1. **API / DB / 資料表**：
   - migration `agent_skills_catalog_v2_migration.sql` 已跑 prod（內建技能 45→62 已驗）。
   - DB 欄位核對：`agent_tasks`(goal/plan/plan_done/result/turn_summary/thread_id/step_count)、`agent_steps`(task_id/idx/thought/tool_name/risk/args/result/ok/verified)、`user_api_keys`(provider/api_key_encrypted/is_active/metadata/label)、`agent_skills` — **全部存在**。
   - 62 支技能引用的 15 個工具名**全是真的註冊工具**（無 typo）。
   - `audit-db-columns` 對本 session 檔案無新錯（既有 ✗ 是 creator-engine 的樣板字串誤判、非本次）。
2. **UI 接對**：存成技能→`/api/agent/skills/synthesize`→草稿→SkillCreator→`POST /api/agent/skills`；Brave/Tavily 卡→`/api/user/ai-keys`（存 masked）；`/settings/ai-keys` 用 `BYOK_PROVIDERS` 列/新增、`testProviderKey` 測 brave/tavily。**皆接真 API、非空殼**。
3. **RWD（手機）**：結果卡標題列 `flex justify-between` + 右側 `flex gap-1.5`（存成技能 + 複製，360px 內放得下）；Tavily 卡＝已驗 Brave 卡的結構複製；申請教學 `<details>` 用可換行清單、短連結。**無新破版、無固定寬度**。
4. **桌面版**：沿用既有 grid/卡片，無版面異動。
5. **PWA**：manifest / sw 本次未動、無影響。
6. **建置**：tsc 0 · vitest 122 綠 · next build 0。
7. **機密**：`.env.local`（含 Brave/Tavily/Google key）未 commit；使用者 key 全 AES-256-GCM 加密存 DB。

## 今日續（0713 下午）— RWD 修 + AI 員工辦公室 MVP
9. **手機導覽破版修（192.jpg）**：TopNav 手機展開選單原本無捲動/無底部安全區 → 最後兩項（分身島/翻譯）被 Android 系統列卡住看不到。改成 `max-h-[calc(100dvh-3.5rem)] overflow-y-auto` + `pb-[calc(1rem+env(safe-area-inset-bottom))]`，超長可捲、不再被卡。
10. **技能商店工具列 wrap（193.jpg）**：員工卡的 `allowed_tools` 原本 `truncate` 單行截斷 → 改 `basis-full break-words` 整串換行、需本機/高風險徽章自然折到下一行。
11. **🆕 AI 員工辦公室 MVP `/agent/office`（對標 Genspark Claw 194–197）**：
    - 狀態列：本機電腦「已連線/離線 + platform」、在職員工數（+工作中）、今日產出件數。
    - **熱門任務快捷格**（7 項：查資料/找機會/寫文案/解釋術語/讀網頁/找課/整理本機檔案）＝點一下**預填指令**到下令列、看過再送出（不自動燒 API）；「整理本機檔案」需電腦上線才可點（gating）。
    - 我的 AI 員工卡（emoji/職務/閒置中/派工→`/agent?skill=<id>`）＋最近工作列表（狀態→`/agent?task=<id>`）。
    - AgentClient 加 `?goal=`/`?skill=` 深連結（辦公室派工用）；`/agent` 技能列加「🏢 辦公室」入口。
    - **純讀 + 導頁設計**（重用 `/api/agent/{skills,devices,tasks}`），不新增寫入 API、不會意外花錢。
12. **回答林董 Genspark 三問**（記進 todo §10-B）：桌面助手 UI ✅ 可做（我們 Web 原生、辦公室頁已達 80% 感覺，原生 tray App 列後期選配）；虛擬伺服器 ⚠️ 技術可行但常駐 VM 每台燒錢不合免費優先 → 改「用完即拋臨時沙盒」且限付費檔（見 §4 Phase E）；工作空間 Hub ✅ 可聚合既有能力（簡報/表格/文件生成器沒有＝大工程後補）。

### 收尾檢查（第二輪）
- **建置**：tsc 0 · vitest 122 綠 · next build 0（`/agent/office` 5.32 kB 已建）。
- **RWD**：辦公室頁 `grid sm:2/lg:3` 響應式；手機選單捲動 + 安全區已修；桌面沿用既有卡片無破版。
- **API/DB**：無新表、無新寫入端點（辦公室全讀既有 3 支 API）；`?goal=/?skill=` 僅前端預填、不改後端。
- **安全紅線**：辦公室頁對外動作＝0；熱門任務只「預填」不自動送、文案類任務文字明示「先給我看過再決定發不發」。

## 今日續（0713 晚）— 辦公室排程自動跑（cron 員工）
13. **排程自動跑上線**：辦公室可設「每天/每週某時（台灣時間）自動發起任務」，可綁員工、暫停/啟用、刪除、看上次結果。
    - **DB**：`supabase/agent_schedules_migration.sql`（RLS own policy）已跑 prod、15 欄位已驗。
    - **API**：`/api/agent/schedules`（GET 列 / POST 建，每人上限 20）＋`/api/agent/schedules/[id]`（PATCH 開關/改時間、DELETE）。
    - **Cron**：`/api/cron/agent-schedules`（撈 enabled 且 next_run_at≤now，單次最多 15 條，逐條 `launchAgentTask` 背景跑、推進 next_run_at/last_task_id/run_count）→ 已登記到 `docs/setup/cron-setup.md` job #7（建議每 15 分）。
    - **時間計算**：`src/lib/agent/schedule.ts`（`computeNextRun`/`describeSchedule`，台灣 UTC+8）＋ **6 個單元測試全綠**（daily/weekly/已過推明天/9am TW=1am UTC/clamp）。
    - **重構**：抽 `src/lib/agent/launch.ts`（建任務+背景開跑）為手動下令與排程**共用一條**，`/api/agent/tasks` POST 改用它（避免邏輯漂移）。
    - **UI**：`/agent/office` 加「排程自動跑」區（新增表單：指令/員工/每天或每週/星期/整點 + 清單含開關·刪除·下次時間·已跑次數·看上次結果）。
    - **紅線**：排程只「發起任務」；任務內對外仍走 `awaiting_approval` 待批准，排程不自動對外。表單也明示這點。

### 收尾檢查（第三輪）
- **建置**：tsc 0 · vitest **128 綠**（+6 排程）· next build 0（office 7.39kB、schedules、schedules/[id]、cron/agent-schedules 全建）。
- **API/DB**：`agent_schedules` 15 欄位已驗存在；launchAgentTask 重構後 `/api/agent/tasks` 行為不變（GET 仍用 admin）。
- **RWD**：排程表單 `flex flex-wrap` + select 響應式；清單 row `flex` 右側動作鈕 shrink-0，手機不破版。
- **安全**：cron 走 `verifyCronAuth`（三種認證）；排程 API 全 `user_id` 過濾 + RLS；對外動作 0。

## 今日續（0713 深夜）— 連續推進 todo（林董離開、自動做）
14. **辦公室待批准佇列聚合**：`/api/agent/approvals` GET 跨任務列所有 pending；辦公室「等你確認」區一鍵允許/取消、樂觀更新。
15. **辦公室即時刷新**：前景分頁 + 有任務在跑/有待批准時每 10 秒刷新任務狀態與待批准（看員工在工作）。→ 辦公室 §10 儀表板 MVP+進階完成。
16. **機會島篩選 chips 改多選**：分類 chips 由單選改 Set 多選＝OR；成本/狀態維持獨立 toggle＝AND。API `category` 收逗號分隔→`.or(ilike)`，對真 DB 驗證（AI+創業 7 筆）。（191.jpg）
17. **機會島 V3「幫你贏」AI 三件套**（詳情頁，皆 `completeForUsage("agent_core")`、禁編造、需登入）：
    - **AI 讀規則** `RulesSummary` + `/api/opportunities/[id]/rules-summary`：讀本頁或貼官網全文→一句話/資格/文件/日期/獎金/評分/該注意的坑。
    - **AI 適合度/缺件分析** `FitAnalysis` + `/fit-analysis`：描述自己→高/中/低適合度 + 你符合的 + 缺件 + 建議補強 + 老實說。
    - **AI 生成報名素材** `GenerateMaterials` + `/generate`：30秒電梯簡報/Pitch大綱/一頁商業計畫/報名自我介紹，可複製。
18. **機會島↔分身島串接**：詳情頁「丟給分身島幫我準備」→ 預填指令到 `/agent`（列文件清單/日期待辦/下一步，對外先問）。重用 `?goal=` 深連結、零新後端。
19. **機會截止提醒 cron** `/api/cron/opportunity-deadlines`：掃「我的航線」收藏機會，距截止 30/14/7/3/1 天發 in-app 鈴鐺 + LINE（綁定才送），同機會 20h 去重。登記 cron job #8。

### 收尾檢查（第四輪）
- 每個功能都 tsc 0 + next build 0 過才 commit；vitest 維持 128 綠（無新測試邏輯）。
- 全部**純加法**：新增 6 個 API route + 4 個 client 元件 + 1 cron，**無改既有寫入邏輯**（唯一重構是 launch.ts 已於前一批驗過）。
- 安全：詳情頁 AI 工具全需登入；截止提醒只發 in-app/LINE（LINE 綁定才送）；對外動作 0。

## 今日續（0713 更晚）— 機會島 V2 + 後台雷達 + 分身島統計
20. **我的機會檔案（V2）**：`opportunity_profiles` 表（RLS，migration 已跑）+ `/api/opportunities/profile` GET/PUT；`/opportunities` 加編輯器（身分/擁有/完成度/想參加類型），存一次→AI 幫我挑/適合度/生成素材全自動帶入（詳情頁 server 端 `defaultAbout`）。
21. **我的航線強化**：依截止急迫排序、7 天內「快截止」紅框+頂部急件提醒、每列「丟給分身島幫我準備」；routes API join 補 organizer。
22. **後台 AI 島專屬機會雷達 `/admin/opportunities`**：規則引擎 `src/lib/opportunity-fit.ts`（零 AI 成本，免費+25/主題+/免上台+12/線上+10/Demo+8/高獎金+/限學生-40/已截止濾掉）+ **5 單元測試**；列前 30 名 + 原因 chips + 倒數 + 丟給分身島 + 官網；nav 加「🧭 機會雷達」。
23. **技能成效統計**：`/api/agent/skills` GET 附 `usage{used,succeeded}`（agent_tasks 依 skill_id 聚合）；技能商店卡 + 辦公室員工卡顯示「用過 N 次·成功 X%」。
24. **辦公室分身表現 KPI**：重用 `/api/agent/kpi` 顯示成功率/平均步數/介入率/任務數。

### 本輪總結（0713 一整天，未停）
- 分身島：辦公室 MVP+排程+待批准佇列+即時刷新+KPI+技能統計。
- 機會島：多選篩選、V3「幫你贏」AI 三件套（讀規則/適合度/生成素材）、丟給分身島串接、我的機會檔案、航線強化、截止提醒 cron。
- 後台：AI 島專屬機會雷達（規則引擎）。
- 共 ~15 commit、全部 tsc 0 / next build 0 / vitest **133 綠**（新增 schedule 6 + opportunity-fit 5）；migration 3 支已跑 prod（agent_schedules / opportunity_profiles）。
- **全程守紅線**：對外動作 0，AI 生成/排程/雷達都只到「起草/建議/發起任務」，真正對外仍待人工批准。

## 今日壓軸（0713，林董在線）— 三大項一起收
25. **P0 AI 記帳**：核對程式碼發現**本來就做完了**（`ai/chat:528` 有 `inc_model_usage`；`pet/tick:138`、`admin/quiz/generate:109` 有 `logAiUsage`）→ 文件先前落後，已更正劃線。**沒重加（會重複計）。**
26. **L2 伺服器瀏覽器＝已開**：`docker.yml` build-args 加 `INSTALL_SERVER_BROWSER=1`（image 裝 Chromium）。push 觸發 GHCR 重建。**待林董**：Zeabur 設 `ENABLE_SERVER_BROWSER=1` + Restart、盯 build/RAM。build 失敗會保留舊 image、站不壞。
27. **機會島 V4 雷達（安全版基礎完成）**：
    - 表：`opportunity_sources`（curated 來源）+ `opportunity_candidates`（待審佇列），RLS 後台專用，migration 已跑。
    - 後台 `/admin/opportunities/sources`：加/開關/刪來源 + 待審佇列核准/拒絕（nav 加「📡 雷達來源/待審」）。
    - API：sources CRUD + candidates review（核准→insert opportunities 標 unverified）。
    - cron `/api/cron/opportunity-radar`：抓 enabled RSS/Atom→pending、同 URL 去重、**不自動上線**。
    - `src/lib/rss-parse.ts` 無相依 RSS/Atom 解析 + **4 單元測試**（vitest 137）。
    - **紅線**：雷達只搬來源原文、不生成不猜；要人工核准才上線 → 防 AI 亂放假資料。

### 三大項驗證
- P0：讀碼確認三出口都已記帳、無重複風險。
- L2：Dockerfile 選配 block + docker.yml build-arg 對齊；tool 端 `ENABLE_SERVER_BROWSER` gate + graceful 降級 + `--no-sandbox/--disable-dev-shm-usage`。
- V4：tsc 0 / build 0 / vitest 137；migration 已跑；全走 `requireAdmin` gate + RLS 後台專用。

## 今日再續（0713 深夜第二輪，林董「一直做不要停」）— 通路 + 主動 + 訂閱
28. **機會島擴充**：手動查證官網加 **25 筆真實機會**、跨 14 分類（AI/創業/補助/雲端 + 設計/攝影/文學/影視/音樂/動漫/黑客松/永續/社會創新/廣告），機會島篩選 chips 7→14。全 unverified。剔除不符的（AI CUP 限學生、Google SEA 台灣沒資格、新創事業獎已截止）。
29. **LINE Bot 入口（分身島+機會島）**：`/分身 <指令>`→背景跑→**完成推回 LINE**（orchestrator `notifyLineIfFromLine` 偵測 thread「📱 LINE」）；`找機會 <關鍵字>`/`我的機會`/`建議`（今日3件事）。
30. **機會訂閱（V2）**：`opportunity_subscriptions` 表 + API + `/opportunities` 訂閱 UI；比對併入 `opportunity-deadlines` cron（新符合→in-app+LINE）。
31. **主動代理「今日 3 件事」**：`daily-brief.ts` 規則式（近截止收藏+推薦新機會+弱項章節）；LINE「建議」+ 辦公室 widget + API。
32. **AI 結構化抽取（V4）**：審佇列「🤖 AI 幫填」讀候選原文抽 分類/截止/獎金/主辦/免費，核准帶入。
33. **LINE 內按鈕批准（守紅線核心）**：LINE 發起任務要批准時推「✅允許/❌取消」postback 卡→更新 `agent_approvals`→分身島續跑。

### migration（本輪已跑 prod）
`opportunity_profiles`、`opportunity_sources`、`opportunity_candidates`、`opportunity_radar`… 之外新增：`opportunity_subscriptions`。

### 待辦優先序（林董要「全部做完」，我排的）
Tier1：~~LINE入口~~/~~機會訂閱~~/~~今日3件事~~/AI讀規則吃PDF(需 PDF 相依、延到你在線)。
Tier2：~~AI結構化抽取~~/~~LINE按鈕批准~~/AI島專屬頁對照資格/統一通知中心/外部工具(需OAuth)。
Tier3(大工程/需外部帳號)：TG/Discord入口、對外發文、桌面App、Android、雲端沙盒、AI COO、機會島V5。
Tier4(低風險可插隊)：AI記帳P1–P4、pgvector、辭典5000、機會地圖。

## 待辦
👉 **全部見 `docs/todo/todo_list_0713.md`**（含最末 §五「需要林董自己操作」清單）。
⚠️ **部署後手動**：cron-job.org 加 job #7/#8/#9；Zeabur `ENABLE_SERVER_BROWSER=1`；機會雷達加真實 RSS 來源。詳見 §五 與 `docs/setup/cron-setup.md`。
