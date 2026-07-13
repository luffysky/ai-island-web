# AI 島待辦總表 · 分身島 × 機會島（2026-07-13）

> 匯集全部規劃文件：`待閱/{Agent.md, Agent2.md, 機會島.md}`、`island/{分身島.md, 機會島.md}`、
> `agent_{platform,island,memory,android}_plan.md`、`opportunity_island_spec.md`，以及 7/10–7/12 工作日誌。
> 圖例：~~劃線~~＝已完成上線 · 🚧＝做一半 · ⬜＝還沒做 · ＊＝原則/約束（非可勾選）。
> 狀態依**實際程式碼**核對（文件常落後於程式碼）。

---

# 一、分身島（AI 員工 / 行動代理平台）

## 1. 引擎核心 L1–L5 + 六支柱
- ~~**L1 任務拆解**：decompose() 把 goal 拆成子任務 checklist、逐項打勾（`agent_tasks.plan/plan_done`）。~~
- ~~**L2 Tool-First 省 token**：算數/日期/JSON 用程式不叫 LLM（`math.eval`/`datetime.now`/`json.query`）。~~
- ~~**L3 反思/驗證迴圈**：done 前 critique 檢查達標、沒過續做（最多 2 次）。~~
- ~~**L4 技能合成**：完成任務一鍵「存成技能」，AI 蒸餾成一般化技能草稿（#219）。~~
- ~~**L5 平行多代理**：≥3 個可獨立子任務 → runSubAgent 唯讀白名單並行 + mergeSubResults 合併去重（#220）。~~
- 🚧 **L2 伺服器真瀏覽器**：`browser.render`（headless Chromium 讀動態頁）程式完成、優雅降級；**Docker 裝 Chromium 未做**（見 §5）。互動式（點/填/登入/跑 JS）server 瀏覽器仍 stub。
- 🚧 **L2 程式沙盒**：跑 Agent 產的程式碼（isolated-vm / 外部容器、限時間/記憶體/網路）— 未實作。
- 🚧 **L4 執行中「當場自動建 skill」**：agent 遇缺能力當場合成並註冊（目前偏「完成後手動存」）。
- 🚧 **L5 經理–專才階層調度**：目前是簡單並行；經理 agent 智慧派工給研究/寫碼/設計/驗證專才未成熟。
- ⬜ **從歷史學習**：成功的計畫/工具序列存起來，相似任務直接套用。
- 🚧 **預算感知**：每任務 token/時間/Z幣硬預算上限（免費優先已做、硬上限未做）。
- ⬜ **主動代理**：不等你開口，每天掃機會島/信箱/待辦，主動推「今天值得做的 3 件事」。
- ⬜ **真串流部分成果**：邊做邊吐中間結果（現為輪詢看步驟）。
- ⬜ **工具自動發現**：從 OpenAPI/API 文件自動生成可用工具。

## 2. 搜尋 / 上網能力（7/12 大修，已完成）
- ~~查夠就收尾（web 工具滿 7 次硬上限）+ 合成不丟資料（stepEvidence + 濾驗證頁 + 禁編造）。~~
- ~~修「結果好亂」（sanitizeAnswer 清 reasoning 草稿 + 強模型吐草稿改用 Haiku 重產）。~~
- ~~省額度三級免費優先：DDG → Tavily(非中文才用) → Brave；中日韓查詢自動跳過 Tavily。~~
- ~~搜尋 BYOK（Brave/Tavily 使用者自貼、AES-256-GCM 加密）+ 申請教學 + 匯集 `/settings/ai-keys` 統一管理。~~
- ⬜ **搜尋額度/用量可視化**（使用者看自己 key 這個月用幾次、剩多少）。
- ⬜ **通用全網搜尋替代**（Google CSE 已淘汰全網；需要時評估 Serper/SerpAPI）。

## 3. 記憶 / 對話延續（Phase A/C）
- ~~對話串 `agent_threads`（多 task 串連續對話、planNext 帶前文）。~~
- ~~長期記憶 `agent_memory`（跨對話記得你，fact/preference/skill/project/goal，UI 可看可刪）。~~
- ~~回合收尾抽取事實 + turn_summary（`summarize-memories` cron）。~~
- ⬜ **pgvector 跨對話語意檢索**（「像上次那個活動再來一版」拉舊對話；embedding 欄已預留）。
- ⬜ **能力圖譜（越用越懂你）**：跨對話累積技能/作品/目標/資源，每次自動帶入。
- 🐛 **Task #209「Agent 沒記憶」**：已由 thread+memory 解掉，待實測確認關閉。

## 4. 桌面助手 / Device Bridge
- ~~Bridge 核心 `bridge-core.mjs`（輪詢→領取→執行→回填；Node 核心 + Electron 外殼 + 系統匣）。~~
- ~~佇列通訊 `agent_device_calls`（裝置無關，桌面/手機/Android 同一套）。~~
- ~~本機工具 `filesystem.list/read/write`（限 roots 白名單）、`system.run_command`（首詞白名單擋 rm -rf /）。~~
- ~~本機瀏覽器 `browser.open/click/type/screenshot`（Playwright、DOM 定位不靠座標、截圖回傳）。~~
- ~~配對/認證（一次性 token + 裝置 Bearer；token 只存本機）+ 打包公開下載（GitHub release + `/agent` 下載鈕）。~~
- ⬜ **桌面助手＝完整 Agent**（本機自帶規劃迴圈、斷網/純本機也能跑；需重打包才到舊用戶）。
- ⬜ **Electron 自動更新** + 出新版一鍵化（build→zip→publish→更新下載 URL 串一支腳本）。
- ⬜ **更多本機 Skills**：檔案批次、跑測試/建置、git、監看資料夾、對接本機 App、排程。
- ⬜ **Windows UI Automation**（pywinauto/UIA 讀桌面 App 元素，結構化非只截圖）。
- ⬜ **macOS 支援**（Accessibility API / AppleScript / Shortcuts）。
- ⬜ **Tauri 2 + Rust 正式版**（取代 Electron MVP，安裝小/權限乾淨）。
- ⬜ **視覺 Computer Use 補位**（截圖點座標，僅結構化 UI 找不到時）。
- ⬜ **通訊升級**：WebSocket 控制通道 + WebRTC 畫面串流 + 端到端加密。
- ⬜ **真人端到端 Demo 走一次**（下載/配對→下「跑 npm test」→確認→收結果）。
- ⬜ **桌面 Playwright 一鍵啟用**（現需手動 `npm install playwright && npx playwright install chromium`）。

## 5. L2 Docker 伺服器瀏覽器（進行中，本回合處理）
- 🚧 **Dockerfile 裝 Chromium**：runner 階段裝 Playwright Chromium + 系統相依，讓 `browser.render` 在正式站真能開。**高風險（動部署、Zeabur 無法本機驗）** → env flag 開關 + 保留降級 + 盯部署 log。

## 6. 手機遙控 / 跨裝置（已完成）
- ~~手機 RWD/PWA 下令 → 雲端 → 已配對電腦執行 → 串回手機。~~
- ~~Web Push（需確認/完成推播全裝置）+ 跨裝置批准（任何裝置決定都生效）+ 遠端觀看/停止。~~
- ~~語音輸入（Web Speech zh-TW）+ 任務背景執行（關頁照跑）+ stale-task reaper cron。~~
- ⬜ **雲端沙盒 Phase E**（選配 Pro）：伺服器臨時容器，沒 PC 也能跑本機類任務。

## 7. 手機 / Android 原生（獨立 repo，全未做）
- ⬜ Android 原生 Agent（Kotlin，操作手機自己）：AccessibilityService（`ui.read/tap/input/swipe/back/home`）、MediaProjection 截圖、Foreground Service 常駐 + QR 配對 + 輪詢佇列（`platform='android'`）。
- ⬜ Play 政策合規（Prominent Disclosure、敏感畫面黑名單、可視化軌跡、上架審查）。
- ⬜ iOS：App Intents / Siri / Shortcuts / URL Schemes（只做遙控 + 有限意圖，不做全 GUI 控制）。

## 8. 權限 / 安全
- ~~Approval Engine L0–L4（needsApproval + 動作/位置/影響/可復原 + 允許一次/取消）。~~
- ~~三級風險 read/write/dangerous + 稽核 log（agent_steps/approvals）+ RLS 全隔離 + 本機雙重白名單。~~
- ⬜ **Credential Broker**：本機管密碼、Agent 只知「有無憑證」看不到明文（`agent_credential_refs` 表未建）。
- ⬜ **L4 憑證/銀行/系統管理員操作**：預設禁止（政策已定義、實際憑證流程未接）。
- ＊ **對外動作紅線**：發文/報名/寄信/花錢/接案一律「AI 起草 → 你一鍵批准」，AI 不私自對外送東西。

## 9. MCP / 技能商店 / 數位員工
- ~~MCP 骨架（`agent_mcp_servers` + `mcp.ts` JSON-RPC client + 自家 `/api/mcp` + 外部 Streamable HTTP）。~~
- ~~技能商店 45→62 內建技能 + 純建議技能 + 自建技能（安裝/移除/新增/刪除）。~~
- ~~數位員工 v1：6 位 AI 員工（Hunter/Researcher/Writer/Analyst/Teacher/Coder，限定工具集）。~~
- ⬜ **MCP 外部實戰測試**（接真外部 MCP server 驗 SSE/session）。
- ⬜ **MCP Marketplace**（第三方 MCP 工具市場）+ **技能市集分享**（自建/合成技能分享給島民）。
- ⬜ **技能 YAML 完整規格**（Prompt+Tools+Permission+Workflow+Success Criteria）。
- ⬜ **內建技能實作補齊**：GitHub 管家/檔案整理師/網站巡檢員/課程整理師/學習陪練員（名冊有、workflow 未齊）。
- ⬜ **技能成效統計**（被用幾次、成功率、熱門排序）。
- ⬜ **「用 Agent → 學會建 Agent」教學閉環**。

## 10. 🆕 AI 數位員工辦公室（autonomous office，大工程）
> 參考 dotai.hk「10 個 AI 員工的個人辦公室」：員工能自由活動、自己安排任務、找案子/比賽、針對比賽做產品、起草發文/文案。**對外動作一律待批准（見 §8 紅線）。**
- ~~**辦公室儀表板 `/agent/office`**：員工狀態列（在職/工作中）＋裝置連線狀態＋今日產出＋熱門任務一鍵派工（預填看過再送）＋最近工作列表＋待批准佇列聚合（一鍵允許/取消）＋即時刷新（前景+有任務在跑時每 10 秒更新任務狀態與待批准，看員工在工作）。（0713 MVP + 進階完成）~~
- ~~**排程自動跑（cron 員工）**：辦公室可設每天/每週某時（台灣時間）自動發起任務、綁員工、可暫停/刪除；`agent_schedules` 表 + `/api/agent/schedules` + `/api/cron/agent-schedules`（每 15 分撈到期）。migration 已跑 prod。（0713）~~ 待補：cron-job.org 上實際加 job #7、排程完成後 LINE/推播通知。
- ⬜ **自主任務規劃**：員工依職能自己決定今天做什麼。
- 🚧 **產出佇列 + 一鍵批准**：~~工具層待批准佇列已做（辦公室聚合所有 pending approvals、一鍵允許/取消）~~；待補：把「AI 起草的貼文/報名表/提案全文」也進同一佇列預覽（目前顯示工具名+摘要，尚未存草稿全文供預覽）。
- ⬜ **員工協作（用 L5）**：大目標調度多員工分工（研究/文案/簡報/程式）彙整。
- ⬜ **「登入＝你有一家 AI 公司」世界觀**：員工＝能力向量（非職位）、升級/裝技能/招募(商城)/培訓(去學習島)/開除、AI 開會（每天各員工報告）、履歷/KPI 累積、三種員工（通用/專業/你訓練的＝護城河）、派遣探索可視化。
- ⬜ **Agent 互相直接共享資料**（寫 DB 而非用 LLM 對話同步，省 token）。

### 10-B 🆕 對標 Genspark Claw（0713 林董截圖 194–197）— 我們的做法
> 差異：Genspark 是**獨立桌面 App + 幫每人租雲端 VM**；我們是**Web 原生**（/agent 頁就是聊天介面，桌面助手只是本機執行器）。所以大半「桌面助手」的感覺可在 Web 端做到、不必先做原生 App。
- 🚧 **`/agent/office` 對標 Genspark 右側面板**：~~① 裝置狀態卡（本機電腦「已連線/離線」+ platform）② 熱門任務快捷格（查資料/找機會/寫文案/解釋術語/讀網頁/找課/整理本機檔案＝預填指令一鍵派工）③ 我的 AI 員工狀態列＋今日產出＋最近工作（0713 MVP 上線）~~；待補：心跳/Gateway Running/目前模型細節、需電腦任務已 gating。
- ⬜ **工作空間 Hub（對標 197「工作空間 4.0」）**：把現有能力聚成一格一格入口（AI員工＝技能／辦公套件＝簡報·表格·文件生成／建構＝設計·程式·CRM／內容創作＝AI聊天·影像·影片／工具）。簡報/表格/文件生成器目前沒有＝大工程，先聚合既有（創作者島/機會島/辭典/章節）。
- ⬜ **原生桌面 App（對標 194 完整版，選配·後期）**：Electron/Tauri 常駐 tray + 聊天 + 防止睡眠/心跳開關 + 一鍵下載。需獨立 repo、簽章、自動更新＝大工程，Web 版滿足後再評估。
- ⬜ **每人雲端電腦/虛擬伺服器（對標 196，選配 Pro·成本重）**：Genspark 給每人一台常駐 VM（2vCPU/4GB…）＝每台每月都燒錢，**不合我們免費優先**。我們改**用完即拋的臨時沙盒**（單一任務起容器→跑完銷毀，見 §4 雲端沙盒 Phase E），且只給付費檔。技術可行、但先不做常駐 VM。

## 11. 省 token 引擎（Snow Orchestrator）
- ~~Smart Model Router 免費優先按需升級 + 404 自動換家 + 每日 model-health 健檢。~~
- ~~Tool-First + Context/Semantic Cache（讀過別重讀）。~~
- 🚧 **Rule-filter before LLM**（20 筆用規則濾、只 2 筆丟 LLM；web 有限流、完整規則過濾層待補）。
- 🚧 **Embedding 先向量檢索再 LLM**（站內有 embeddings，agent 任務 RAG 未接）。
- ⬜ **Diff 只讀變動**（呼應機會島三層 hash）。
- ⬜ **Event-driven + Sleep + 每 Agent 每日 Budget 上限**。
- 🚧 **成本/ROI Dashboard**（`/api/agent/kpi` 有骨架；「花 2 元找到百萬競賽」效率排行/省錢模式未做）。
- ⬜ **AI COO**（不做事、只拆任務/派工/選模型/控預算/重用快取）。
- ⬜ **省錢模式三檔**（快速便宜/平衡/最高品質）使用者自選。
- ⬜ **Cost-per-Task benchmark 實測**（對外宣稱「比 ChatGPT 省 X%」前必先實測）。

## 12. 經濟 / 通路 / 差異化
- ~~BYOK `user_api_keys`（Brave/Tavily 已 BYOK）+ 免費每日額度 + 免費優先 + Z幣 overflow。~~
- ~~護城河工具接第一方資料（island.myProfile / island.searchLessons / opportunity.search）。~~
- 🚧 **「🔋 AI 能源中心」UI**（剩餘額度/今日消耗/哪位員工最耗能/本月成本/自動切便宜模型）：底層有、UI 未做。
- 🚧 **教育原生**（用你程度做事 + 每步用你學過的語彙解釋）：有 myProfile，待深化。
- 🚧 **Z幣/遊戲化綁 Agent 動作**（Z幣沿用，agent 扣/賺 Z幣動機系統待接）。
- ⬜ **點數代管方案**（不懂 API 的人買 AI 島點數）+ 混合模式；不同 Agent 用不同模型/key。
- ⬜ **外部工具**：Email/Google Calendar/GitHub/Notion/Drive 當 Agent 工具（讀/寫，寫入需確認）。
- 詳細通路整合見下方 §13。
- ⬜ **生活助理 Agent**（天氣帶傘/股票/Email 摘要/行程）。
- ＊ 定位守則：只做「幫人成長」（學習/創作/創業/找機會/生活），不做叫車/外送。
- ⬜ **完整商業流程自動化**（接機會島閉環）：補助/比賽自動備件、接案自動化、找投資、BD 全流程；三階段自動化（準備 100% / 填 80% 你按送出 / 授權後全自動守條款有回溯）。

## 13. 🆕 通路整合 / 深度整合（LINE / Telegram / Discord / 社群）
> 林董要：分身島 Agent 聊天能接各大軟體、機會島加自動排程 + LINE 通知。分兩向：**Inbound**（從各平台對 Agent 下令/回覆）＋**Outbound**（Agent 起草內容發到社群）。**紅線不變**：對外發布/報名一律「AI 起草 → 你一鍵批准」。

### 14-1 Inbound：把聊天平台當 Agent 入口
- ⬜ **LINE**：LINE Bot（Messaging API）當入口——打字下令 → Agent 執行 → 回訊息；Rich Menu 快捷（找機會/看員工/今日待辦）；LIFF 內嵌分身島/機會島頁。（已有 `user_line_bind`、`NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID`）
- ⬜ **Telegram**：Telegram Bot 當入口，群組 `@bot` 下令，inline keyboard 互動。
- ⬜ **Discord**：Discord Bot slash commands（`/agent`、`/opportunity`）、DM 下令、伺服器頻道貼每日機會/員工報告。（已有 `discord_binding`）
- ⬜ **統一 Bridge**：三平台共用一套「訊息 → 建 agent task → 回填結果」轉接層（沿用現有 task/thread 架構）。

### 14-2 批准流程搬到聊天平台（安全核心）
- ⬜ **在 LINE/TG/Discord 內按鈕批准**：需確認的動作（發文/報名/寄信）直接在聊天平台用按鈕「允許/取消」，不必回網站——最順的授權體驗，且守紅線。
- ⬜ **統一通知中心**：截止提醒 / 任務完成 / 需批准 統一推到使用者選的平台。

### 14-3 Outbound：Agent 起草 → 批准 → 發布（社群發文）
- ⬜ **YouTube**（community 貼文 / 影片描述 / 留言回覆，Data API）
- ⬜ **Instagram**（貼文 / 限動，Graph API，需商業帳號）
- ⬜ **Threads**（Threads API 發文）
- ⬜ **抖音 / TikTok**（Content Posting API，權限審核嚴、受限）
- ⬜ **FB 粉專 / X(Twitter)**（Graph API / X API）
- ⬜ **共通**：AI 生成貼文/文案 → 進「待批准佇列」→ 你按一下才發；排程發布；留言/私訊整理摘要。**每個平台守其開發者條款**。

### 14-4 機會島 × 通知/排程（本段對應機會島 V3/V4 的輕量前置）
- ⬜ **機會島自動排程掃描**（cron，先輕量：每日跑「機會獵人」員工 `web.search`+`opportunity.search` 掃新機會，早於 V4 全自動雷達）。
- ⬜ **LINE 截止通知**（剩 30/14/7/3/1 天推播；新符合你條件的機會推播）＋ Email/Discord 同機制。
- ⬜ **在 LINE 內「幫我準備這場」**：收到截止通知 → 按鈕直接丟給分身島員工團隊備件（回 §一.10 辦公室）。

## 14. 附屬構想（Agent2.md，多 aspirational）
- ⬜ **AI 模擬競賽/評審**（技術/商業/投資人/使用者/酸民多人格逼問 + 追問 + 評分：語速/自信/口頭禪/眼神/超時）。
- ⬜ **上台簡報練習**（30 秒電梯簡報→1/3/5/10 分鐘；角色扮演國中生/阿嬤/投資人/工程師都聽懂）。
- ⬜ **Digital Twin 數位分身**（懂你目標/作品/偏好，主動幫你找機會完成任務）。
- ⬜ **AI 寶可夢/屬性/合成繁殖**（搜尋型×商業型→競賽 Hunter，趣味構想）。

---

# 二、機會島（Opportunity Island）

## 1. V1 找得到 ~~（已上線）~~
- ~~opportunities 表（泛化十層 type）+ opportunity_routes（我的航線 stage）+ RLS。~~
- ~~8 筆競賽種子（全標 unverified、不捏造）。~~
- ~~/opportunities 瀏覽 + 搜尋 + 類別/免費/狀態篩選；/opportunities/[id] 詳情；/opportunities/routes 我的航線（收藏+投件進度+截止倒數）。~~
- ~~nav + 首頁卡片 + agent `opportunity.search` 閉環 + 參賽成本篩選（🎤免上台/🌐線上）。~~
- 🚧 **主動「截止提醒」推播**（卡片有倒數、推播未做）。
- ~~**AI 規則摘要**：機會詳情頁「AI 讀規則」（`RulesSummary` + `/api/opportunities/[id]/rules-summary`）→ 讀本頁資料或貼上官網全文 → 結構化重點（一句話/資格/文件/日期/獎金/評分/該注意的坑），禁編造、需登入。（0713）~~ PDF 解析待補。

## 2. V2 找得準 🚧
- ~~AI 推薦 `/api/opportunities/recommend`（描述狀況→挑 3-5 個附符合率+原因）。~~
- ⬜ **首次登入 5 分鐘問卷**（身分/擁有什麼/完成度/想參加類型）。
- ⬜ **AI 聊天追問**理解使用者（文件標「最推」）。
- ⬜ **能力圖譜**（你有什麼 vs 競賽需要什麼）。
- ⬜ **機會訂閱**（追蹤條件「AI+台灣+免費+10萬+」，符合就推播）。
- ⬜ **AI 島專屬頁**（內部作品檔案自動對照所有競賽資格→新符合/倒數/缺件）。
- ⬜ **推薦透明化**（附「不推薦+原因」）。

## 3. V3 幫你贏 🚧
- ~~AI 模擬評審 `/opportunities/mock-judge`（5 種評審人格 Q&A 追問 + 評分卡 + 準備建議）。~~
- ⬜ **AI 作品分析**（網站/GitHub/PDF/PitchDeck/商業計畫/履歷/作品集/影片）。
- ⬜ **AI 成熟度**（技術/市場/商業/創新/完成度各給分）。
- ~~**AI 競爭力分析**（符合/缺項 + 參考分數，不保證）：詳情頁「AI 分析我適不適合」(`FitAnalysis` + `/api/opportunities/[id]/fit-analysis`) 給高/中/低適合度 + 你符合的 + 缺件 + 建議補強 + 老實說。（0713）~~
- ~~**AI 缺件分析**（缺 Pitch/Demo/財務/商業模式/使用者數據）：併入詳情頁 FitAnalysis「你可能還缺的」區塊。（0713）~~
- ⬜ **AI 缺點分析**（歷屆評審常扣分項）+ **AI 對手分析**（去年第一名拆解）。
- ⬜ **AI 生成**（Pitch/商業計畫/簡報/海報/介紹影片腳本）。
- 🚧 **AI 讀規則**（~~文字規則→結構化重點已做（詳情頁 RulesSummary）~~；長 PDF 摘要待補）+ 🚧 **AI 自動代辦**（~~詳情頁「丟給分身島幫我準備」一鍵預填指令→分身島列文件清單/日期待辦/下一步（0713）~~；真正建 todo 打勾清單/寫回機會島待補）。
- ⬜ **AI 排程接 Calendar** + **通知管道 LINE/Email/Discord**。
- ⬜ **練習階梯**（電梯簡報 30 秒→1/3/5/10 分鐘；角色扮演）+ 語速/自信/口頭禪/超時偵測。
- ⬜ **AI 學習閉環**（一直輸→分析原因→推薦 AI 島課程）+ **AI 路線圖/生涯**（三年創業逐年規劃）。

## 4. V4 智慧雷達 ⬜（需真實來源 + 人工覆核，最後做）
- ⬜ 全自動爬蟲（政府/獎金獵人/大學/新創基地/國際/企業活動頁；先 API/RSS/sitemap/Email、爬蟲當最後手段守 robots）。
- ⬜ 三層 hash 變動偵測（raw_html/normalized_text/structured_fields，只結構化欄位變才通知）。
- ⬜ AI 結構化抽取（名稱/主辦/起訖/獎金/報名費/資格/文件/連結）+ 每欄存原文證據 + 信心分數 + 人工確認。
- ⬜ PDF 解析 + 版本比較；來源信心分數 / 人工覆核佇列。
- ⬜ Cron 分頻（官方 6h/已開放 3h/距截止 14 天內 1h…）+ 通知任務層（新競賽/異動/剩 30·14·7·3·1 天/缺件/自動建投件任務）。
- ⬜ 監控（Sentry + crawl_logs）。

## 5. V5 Opportunity OS ⬜
- ⬜ 十層機會全上線（補助 SBIR/SIIR/青創/文創；獎學金；VC/加速器/天使；徵件漫畫/小說/LOGO/貼圖/歌曲/MV；標案；工作；實習；海外 Google/MS/OpenAI/NVIDIA；證照 AWS/Azure/Cisco）。
- ⬜ AI 配對組隊（缺前端/設計/PM/行銷→依技能/興趣/地區/時間媒合）。
- ⬜ 個人成長時間軸（學習→作品→投競賽→得獎→創業→求職）+ 成就/積分/徽章/排行。
- ⬜ Team 方案（多作品/多人/分工/留言/版本/AI 會議）+ Enterprise（API/白牌/學校/政府/加速器/內部競賽）。
- ⬜ AI 代報名（登入/填/上傳/送出，需授權且守主辦條款）。

## 6. 篩選 / 詳情 / 個人化（細項）
- ~~**篩選 chips 改可複選**（`OpportunityBrowse.tsx`）：分類 chips 改多選（Set，點✓可疊加）＝ **OR**；成本/狀態（免費/免上台/線上/開放中）維持獨立 toggle = **AND**。API `category` 收逗號分隔多值→`.or(ilike)`，已對真 DB 驗證（AI+創業 回 7 筆）。（截圖 191.jpg，0713）~~
- ⬜ 篩選補齊：地區、獎金級距、截止級距、身分、作品類型、免 QA/免組隊/不限公司學生/可遠端/不用影片作品集。
- 🚧 `prep_effort`（AI 預估準備時間）欄位已建、AI 估算未做。
- ⬜ 詳情頁補：評分標準/注意事項/FAQ、官方 PDF 解析存版本、歷年資訊、AI 規則摘要嵌入。
- 🚧 我的機會 Dashboard（今日新增+推薦+缺件；航線有倒數、完整儀表板未做）。
- ⬜ 機會地圖 🏝️（點島嶼看該類機會，非列表）。

## 7. 資料表 / 適合度引擎
- ~~opportunities（含成本欄位）、opportunity_routes。~~
- ⬜ opportunity_sources（爬蟲來源 etag/hash）、opportunity_changes（欄位級變動）、user_portfolio（作品/能力圖譜）、opportunity_subscriptions、submission_tasks。
- 🚧 `ai_island_fit_score` 欄位已建；**適合度規則引擎**（+AI20/+教育20/-限學生40…換算 85=必投）未實作。
- ⬜ 更多真實競賽資料（人工核實改 verified；目前 8 筆全 unverified）。

## 8. 後台複刻（AI 島專屬機會雷達）⬜
- ⬜ **`/admin/opportunities`**（目前無此目錄）：列「AI 島最該投的前 N 個」+ 倒數 + 缺件 + 一鍵丟給分身島「幫我準備這場」。
- ⬜ AI 島固定 profile（AI 教育+Agent+SaaS+創作平台+遊戲化+社群、有 Demo/課程、pre-revenue）。
- ⬜ 專屬適合度用規則引擎 + profile 算分（優先免費/AI/創業/教育/SaaS/初賽免上台/高獎金）。
- ⬜ 怎麼找：① 人工收 20–30 高價值來源 ② 分身島「機會獵人」每日 web.search+opportunity.search 掃 ③ V4 雷達。
- ＊ 複刻策略：重用 opportunities 表 + recommend API（帶 AI 島 profile），不重寫。**等前台 V2/V3 主幹穩定後再複刻。**

## 9. Opportunity Pipeline / 與其他島結合
- ⬜ **機會流水線閉環**：發現→AI 評估適合度→建專案→拆任務→備文件→補缺件→模擬評審→提交(授權)→追蹤→整理經驗→累積作品履歷；由分身島數位員工驅動（Hunter/PM/Writer/Designer/Research/QA/CEO 分工）。
- ⬜ **20 個機會島 Agent**（對應分身島 Skills）：獵人（每日掃，🚧 未排程）、規則分析、適合度、作品分析、提醒、任務、生成、新聞、數據、對手、FAQ、建 Notion、Calendar、Email、Discord、LINE、團隊分析、GitHub 分析、網站分析。
- ⬜ **創作者島結合**：作品自動變成「作品檔案/能力圖譜」輸入；徵件反向導回創作者島開工；共用 `user_portfolio`。
- ⬜ **學習閉環**：學完 React→推 Hackathon；學完 AI→推 AI 競賽。
- ⬜ **社群經驗層**：歷屆參賽者分享（Pitch 難不難/評審刁不刁/準備多久/常被問/推薦度）。

## 10. 商業模式 / 原則
- ⬜ 方案分層機制（免費 gating / Pro / Team / Enterprise；依「價值」不依「功能數」；V2 起開 Pro）。
- ＊ 定位：不是「競賽搜尋」是「人生機會作業系統」；命名用「機會」而非「競賽」；做在 AI 島裡＝最強獲客入口。
- ＊ 風險守則：資料可靠性是最大坑（日期藏圖/PDF/過期沒下架）→ selector fallback + PDF 解析 + 日期合理性 + 人工覆核；LLM 會抽錯欄位 → 每欄存原文證據 + 信心分數；分數用規則引擎不用模型心情；「得獎率」一律叫「競爭力/參考分數」不保證；先跑通整條鏈再擴。

---

# 三、全站其他延續待辦（7/10、7/11 起）

## AI 成本全面記帳（P0 最高，林董點名）
- ⬜ **P0**：`admin/quiz/generate`、`pet/tick` streamAI 零記帳補 `logAiUsage`；主聊天 `ai/chat` 沒進 `inc_model_usage` 補上；抽 `streamAndLog` helper 掃全站出口。
- ⬜ **P1 創作者綠寶**：gateHighTierModel、改串流、語意快取、每日軟上限 config（預設關）。
- ⬜ **P2 語意快取推廣**：pop-quiz/learning-plan/blog-write/ai-assistant 接 `lookupSemanticCache`。
- ⬜ **P3 路由統一**：面試/challenge/resume/admin 生成器→`completeForUsage`；模擬面試每回合計；移除重複 `providerFromModel`。
- ⬜ **P4 能力擴充**：RAG 加到 assistant/面試/創作；vision 加到面試/grade_draft；`consume_ai_quota`→`_v2`。
- 詳規劃 `docs/product/ai_upgrade_plan.md`。

## 內容 / 辭典 / 其他
- ⬜ 程式辭典續寫到 5000（現 ~1022/20%，從 `dictionary-seed-21.json` 接）+ i18n 續補。
- ⬜ 語言島 `/語言島`（沿用 dictionary `domain='english'|'japanese'`）。
- ⬜ 計畫書 ch2/ch6/ch7 + pitch-deck 對齊 `repositioning.md`；grant「重新定錨」四塊。
- ⬜ `PortfoliosClient.tsx` 補 emoji picker；Z 幣續用 UX（`need_zcoin` 402 前端提示）。
- ⬜ 島嶼刷幣 phase 2（釣魚伺服器擲骰 + Playwright E2E）；E2E + Smoke tests；3D 島嶼降耗。

---

# 四、建議執行順序（我的排法）

1. **L2 收尾**（Docker Chromium，小心弄、盯部署）→ 分身島引擎 L1–L5 完整。
2. **AI 數位員工辦公室 MVP**（`/agent/office` + cron 排程 + 待批准佇列，接已完成的 L5）。
3. **機會島 V2/V3 主幹**（作品分析 + AI 生成陪跑 + 缺件 + 通知）→ 前台穩定。
4. **後台複刻 AI 島專屬機會雷達**（重用 opportunities + recommend + AI profile）。
5. **機會島 V4 雷達**（先定真實來源 + 人工覆核鏈，最後做）。
6. **全站 AI 成本記帳 P0**（隨時可插隊，低風險高價值）。
7. 長尾：Credential Broker、pgvector 記憶、Android 原生、外部通路、辭典/語言島。

---

# 五、⚠️ 需要林董自己操作（Claude 做不了/不該做的）

> Claude 自動做程式＋push＋跑 migration，但以下是**要你本人動手**的（外部服務設定、金鑰、審核）。做完可劃線。

## 立即（不做這個，剛做好的排程不會自動跑）
- ⬜ **cron-job.org 加 job #7「agent-schedules」**：`GET https://ai-island-web.snowrealm.pet/api/cron/agent-schedules?secret=<CRON_SECRET>`、排程 `*/15 * * * *`（每 15 分）。設定照 `docs/setup/cron-setup.md`。**沒加這個 → 辦公室排程只是存著、不會到點自動執行。**

## 部署後驗一下（GHCR 重建約幾分鐘）
- ⬜ 開 `https://ai-island-web.snowrealm.pet/agent/office` 確認：狀態列、熱門任務、排程、待批准佇列都正常顯示（手機 + 桌面各看一次）。
- ⬜ 手機開 nav 選單確認最後兩項（分身島/翻譯）不再被系統列卡住（可捲到底）。

## 之後才需要（對應下面各段功能上線時）
- ⬜ **搜尋金鑰**：Brave / Tavily 要更多量 → 各自官網申請 key 貼進 `/settings/ai-keys`（教學已內建）。
- ⬜ **通路整合（§13）需要的帳號/審核**：LINE Messaging API channel、Telegram BotFather token、Discord bot token & slash command 註冊、YouTube/IG/Threads/抖音 各家開發者帳號 + App 審核（這些平台審核都要本人身分/商業帳號，Claude 無法代辦）。
- ⬜ **雲端沙盒 / 虛擬伺服器（§10-B、§4）若要做**：要你決定付費方案 + 開雲端容器服務帳號（成本重、先不急）。
- ⬜ **機會島真實競賽資料人工覆核（§二.7）**：目前 8 筆全 unverified；要你/小編人工核實日期來源後才改 verified（資料可靠性是機會島最大坑，不能讓 AI 亂捏）。
