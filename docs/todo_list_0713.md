# AI 島待辦總表（2026-07-13）

> 彙整 7/10、7/11、7/12 所有「已完成 / 做一半 / 還沒做」的項目，聚焦**分身島**與**機會島**兩座島，
> 末段補全站其他延續待辦。圖例：~~劃線~~＝已完成上線 · 🚧＝進行中/做一半 · ⬜＝還沒做。

---

## 一、分身島（AI 員工 / 行動代理平台）

### 1-1 引擎核心 L1–L5
- ~~**L1 任務拆解**：decompose() 把目標拆成 1–6 個可獨立子任務，存 DB 給 UI 顯示、逐項執行。~~ ✅
- ~~**L3 反思/驗收迴圈**：done 前 critique() 驗收，沒達標回饋續做（最多 2 次防燒錢）。~~ ✅
- ~~**L4 技能合成**：完成的任務一鍵「存成技能」→ `/api/agent/skills/synthesize` 把 goal/plan/用過的工具/結果 AI 蒸餾成一般化技能草稿，開建立視窗預填讓使用者微調。~~ ✅
- ~~**L5 平行多代理**：≥3 個可獨立子任務且非技能/無外掛 → 派多個 runSubAgent 唯讀白名單並行查，mergeSubResults 強模型合併去重；失敗落回序列。~~ ✅
- 🚧 **L2 真瀏覽器 + 程式沙盒**（分身島引擎最後一塊）：
  - ~~伺服器 `browser.render`（headless Chromium 開會跑 JS/擋 bot 的頁）已寫好、優雅降級（無 Chromium 時回清楚錯誤、不壞部署）。~~ ✅（程式面）
  - ⬜ **Docker 裝 Chromium**：改 `Dockerfile` runner 階段裝 Playwright Chromium + 系統相依（`npx playwright install --with-deps chromium`）＋確保 standalone runtime 有 `playwright` 套件。**高風險（動部署、Zeabur 無法本機驗）** → 保留降級、可用 env flag 開關，盯著部署 log 上。
  - ⬜ **程式沙盒**（跑使用者/Agent 產的程式碼）：目前無。規劃用受限子行程 or 遠端沙盒（時間/記憶體/網路限制），先支援 JS/Python 片段執行。
  - 備註：實測企業級反爬（tripadvisor/yelp）連真 headless 都擋（回空頁），需 stealth+住宅代理才破 → 屬鑽牛角尖、不追。

### 1-2 搜尋 / 上網能力（本批大修）
- ~~**查夠就收尾**：web 類工具滿 7 次硬上限強制合成；查 ≥4 次提示直接 done。單任務 web 呼叫從 ~18 壓到 ≤7。~~ ✅
- ~~**合成不丟資料**：stepEvidence() 按工具型別抽具體證據（店名/地址/價格）、isBlockedText() 濾驗證頁、maxTokens→2600、禁止編造。~~ ✅
- ~~**修「結果好亂」**：sanitizeAnswer()/looksLikeReasoning() 清 reasoning 草稿；強模型吐草稿時自動改用 Haiku 乾淨重產。~~ ✅
- ~~**省 Brave 額度**：searchLinks 三級免費優先 **DDG → Tavily(非中文才用) → Brave**；Tavily 實測對中文 0 結果 → 中日韓查詢自動跳過。~~ ✅
- ~~**搜尋 BYOK**：Brave/Tavily 使用者自貼 key（AES-256-GCM 加密存 `user_api_keys`）；兩張卡加「如何免費申請」教學。~~ ✅
- ~~**統一金鑰管理**：Brave/Tavily 註冊成 BYOK provider → `/settings/ai-keys` 可與 AI 模型 key 並列新增/測試/開關/刪除（全站 API 金鑰匯集一處）。~~ ✅
- ⬜ **Google Programmable Search**：已接程式又移除（Google 淘汰「搜尋整個網路」、新引擎只能搜列的站，會污染結果）。若之後要通用全網再評估 Serper/SerpAPI 等。
- ⬜ **搜尋額度可視化 / 用量統計**：讓使用者看到自己 key 這個月用了幾次（Brave/Tavily 剩多少）。

### 1-3 技能商店
- ~~**內建技能 45 個**（research/write/code/dev/learn）+ 純建議技能 + 自建 AI 員工（最多 20 位、取名/職務/職能/選工具）。~~ ✅
- ~~**技能商店 v2（45→62）**：+11 支會自己搜尋的技能（找店/深研/市調/比價/行程/簡報/競賽獵人/學習教練/找課/計算/動態頁）、升級 12 支舊研究技能加 web.search+web.research。~~ ✅
- ⬜ **技能市集分享**：使用者自建/合成的技能可（選擇性）分享給其他島民安裝。
- ⬜ **技能成效統計**：每個技能被用幾次、成功率，排序熱門技能。

### 1-4 對話延續 / 記憶（Phase A/C）
- ~~**對話串（thread）分組** + turn_summary 延續本串前文。~~ ✅
- ~~**跨對話長期記憶**：extractMemory() 抽持久事實 upsert `agent_memory`、規劃時注入、UI 可看可刪。~~ ✅
- ⬜ **pgvector 語意檢索記憶**：目前記憶靠 key upsert；規劃用 embedding 做「跨對話相關記憶」語意召回（`agent_memory` 已預留 embedding 欄）。
- 🐛 **Task #209「Agent 沒記憶」**：已由 thread+memory 解掉，待實測確認關閉。

### 1-5 執行 / 平台
- ~~Phase 1a 雲端切片、1b 桌面助手 Bridge、2a 手機遙控、2b 背景執行、3 技能商店、4 MCP 骨架＋外部、桌面助手打包＋公開下載。~~ ✅（見 0710/0712 日誌）
- ⬜ **真人完整 Demo 走一次**（登入→下載/配對桌面助手→下「跑 npm test」→確認→收結果）。
- ⬜ **MCP 外部實戰測試**（接真外部 MCP server 驗 SSE/session，目前只自家 JSON 測過）。
- ⬜ **桌面助手 Playwright「一鍵啟用」**（現需手動 `npm install playwright && npx playwright install chromium`）。
- ⬜ **出新版一鍵化**（build→打包 zip→publish release→更新下載 URL 串成一支腳本）。
- ⬜ **stale-task reaper 上線確認**（GH workflow secret `SITE_URL`/`CRON_SECRET`）。
- ⬜ **model-health cron 上線確認**（每日自動停用下架模型，需 `SITE_URL`/`CRON_SECRET`）。
- ⬜ **Android 原生**（開新 repo 照 `docs/agent_android_plan.md`，需 Android 環境）。
- ⬜ **NSIS 安裝檔**（選配，需開發人員模式）。

### 1-6 🆕 AI 數位員工辦公室（autonomous office，大工程）
> 參考 dotai.hk「10 個 AI 員工的個人辦公室」：員工能**自由活動、自己安排任務、自己找案子/比賽、針對比賽做產品、自己發文/產生文案**。
> **安全紅線（不可破）**：真正對外的動作（發文/報名/寄信/花錢/接案）一律 **AI 起草 → 你一鍵批准**，不讓 AI 私自對外送東西（符合本專案審批守則）。

- ⬜ **辦公室儀表板 `/agent/office`**：一眼看所有 AI 員工、各自狀態（閒置/工作中/待你批准）、今日產出。
- ⬜ **排程自動跑（cron 員工）**：每位員工可設「每天/每週自動執行某職能」（接 CronCreate 或 GH workflow），自動產出草稿/發現。
- ⬜ **自主任務規劃**：員工依職能自己決定「今天該做什麼」（例：機會獵人每天掃新競賽、社群小編每天草擬貼文）。
- ⬜ **產出佇列 + 一鍵批准**：員工產的貼文/報名表/提案進「待批准」佇列，你按一下才真的對外。
- ⬜ **員工協作（用 L5）**：一個大目標（例「針對這個比賽做出產品」）→ 調度多位員工（研究/文案/簡報/程式）分工，成果彙整。
- ⬜ **針對比賽做產品**：接機會島 → 選一個比賽 → 員工團隊產出 Pitch/簡報/雛形/報名素材（草稿，待批准送出）。
- 依賴：L5（✅ 已完成，可直接當調度底座）、cron 排程、機會島 V3 生成能力。

---

## 二、機會島（Opportunity Island）

### 2-1 已完成
- ~~**V1 找得到**：`opportunities`（泛化十層 type）+`opportunity_routes`（我的航線）；8 競賽種子（全標 unverified 待核實、不捏造）；`/opportunities` 瀏覽+搜尋+類別/免費篩選；`/opportunities/[id]` 詳情；`/opportunities/routes` 我的航線（收藏+投件進度+截止倒數）；nav+首頁卡片；agent `opportunity.search` 閉環。~~ ✅
- ~~**參賽成本篩選**：is_online/requires_qa/requires_team/prep_effort + 「🎤免上台」「🌐線上」篩選 + 卡片標章。~~ ✅
- ~~**V2 AI 推薦**：`/api/opportunities/recommend` 描述狀況→AI 挑 3-5 個附符合率+原因（免費模型優先）。~~ ✅
- ~~**V3 AI 模擬評審**：`/opportunities/mock-judge` 選評審(投資人/技術/商業/使用者/😈酸民)→貼作品→犀利 Q&A→評分卡+準備建議。~~ ✅

### 2-2 V2「找得準」剩餘 🚧
- ⬜ **能力圖譜 / 問卷**：讓使用者填/AI 問出能力、興趣、資源 → 更準的媒合基礎。
- ⬜ **AI 聊天追問**：不只單次推薦，能來回追問把條件問清楚。
- ⬜ **機會訂閱**：訂閱某類機會 → 有新的就通知。
- ⬜ **AI 島專屬頁**：針對 AI 島學員量身的機會入口。

### 2-3 V3「幫你贏」剩餘 🚧
- ⬜ **作品分析**：吃網站/GitHub/PDF/PitchDeck → 分析成熟度、競爭力、缺件/缺點。
- ⬜ **AI 生成陪跑**：生 Pitch/商業計畫/簡報/海報/介紹影片腳本。
- ⬜ **讀規則 + AI 自動代辦**：讀比賽規則 → 拆成待辦清單。
- ⬜ **通知管道**：Calendar / LINE / Email / Discord 提醒截止與進度。

### 2-4 V4「智慧雷達」⬜（需真實來源 + 人工覆核鏈，不可造假）
- ⬜ 全自動爬蟲 + 三 hash 變動偵測 + PDF 版本比較 + 來源信心分數 + 人工覆核佇列 + 每日推播。
- ⬜ 先人工/半自動收 20–30 個高價值來源（政府/獎金獵人/Startup Terrace/國際 AI 賽），跑通「抓取→辨識→變動→通知→覆核」整條鏈再擴。

### 2-5 V5「Opportunity OS」⬜
- ⬜ 擴十層機會 type + AI 配對組隊 + 成長時間軸/成就 + Team/Enterprise/API/白牌 + AI 代報名（授權且合規）。

### 2-6 後台複刻（AI 島專屬機會雷達）⬜
> 林董要：機會島穩定後複刻一份到 `/admin`，**專門幫 AI 島自己找適合的機會**。
- ⬜ 策略（已定，spec §13.5）：admin 版**直接重用 `opportunities` 表 + `recommend` API（帶 AI 島 profile）**，不重寫。
- ⬜ 怎麼找 AI 島的機會：① 人工/半自動收 20–30 個高價值來源 ② 分身島「機會獵人」員工每日 `web.search`+`opportunity.search` 掃新機會 ③ V4 雷達自動化。
- ⬜ 觸發時機：**等機會島前台（至少 V2/V3 主幹）穩定後再複刻**。

### 2-7 其他
- ⬜ 機會地圖（視覺化）、社群經驗層（島民分享投件心得）、更多真實競賽資料（人工核實標 verified）。

---

## 三、全站其他延續待辦（7/10、7/11 起）

### 3-1 AI 成本全面記帳（P0 最高、林董點名）
- ⬜ **P0**：`admin/quiz/generate`、`pet/tick` 的 streamAI 零記帳 → 補 `logAiUsage`；主聊天 `ai/chat` 沒進 `inc_model_usage` → 補；抽 `streamAndLog` helper 掃全站出口。
- ⬜ **P1 創作者綠寶補漏**：`gateHighTierModel`、改串流、語意快取、每日軟上限 config（預設關）。
- ⬜ **P2 語意快取推廣**：pop-quiz / learning-plan / blog-write / ai-assistant 接 `lookupSemanticCache`。
- ⬜ **P3 路由統一**：面試/challenge/resume/admin 生成器 → `completeForUsage`；模擬面試每回合計；移除重複 `providerFromModel`。
- ⬜ **P4 能力擴充**：RAG 加到 assistant/面試/創作；vision 加到面試/grade_draft；`consume_ai_quota`→`_v2` 統一。
- 詳規劃：`docs/ai_upgrade_plan.md`。

### 3-2 內容 / 辭典
- ⬜ **程式辭典續寫到 5000**（現 ~1022/20%，從 `dictionary-seed-21.json` 接；「續辭典」= 從第 21 批 author→import→commit）。
- ⬜ **辭典 i18n 續補**（每加幾批跑 `translate-sync-all.mjs`）。
- ⬜ **語言島** `/語言島`（沿用 dictionary 元件 `domain='english'|'japanese'`）。
- ⬜ 計畫書 ch2/ch6/ch7 + pitch-deck 對齊 `repositioning.md`；grant「重新定錨」四塊（見 `docs/grant/待改.md`）。

### 3-3 遊戲 / UX / 其他
- ⬜ `PortfoliosClient.tsx` 補 emoji picker（audit 剩這一個）。
- ⬜ Z 幣續用 UX（`need_zcoin` 402 → 前端「花 Z 幣續用」提示）。
- ⬜ 島嶼刷幣 phase 2（釣魚伺服器擲骰 + Playwright E2E）。
- ⬜ E2E 補齊 + Smoke tests；沉浸式 3D 島嶼降耗（手機切 2D / 進度存 DB）。
- ⬜ Lottie 星星 hero 若不喜歡 → 換 LottieFiles 免費動畫或調整。

---

## 四、建議執行順序（我的排法）

1. **L2 收尾**（Docker Chromium，小心弄，盯部署）→ 分身島引擎 L1–L5 完整。
2. **AI 數位員工辦公室 MVP**（`/agent/office` 儀表板 + cron 排程 + 待批准佇列）→ 接上已完成的 L5。
3. **機會島 V2/V3 剩餘主幹**（作品分析 + AI 生成陪跑 + 通知）→ 前台穩定。
4. **後台複刻 AI 島專屬機會雷達**（重用 opportunities + recommend + AI profile）。
5. **機會島 V4 雷達**（需先定真實來源 + 人工覆核，最後做）。
6. 全站 **AI 成本記帳 P0**（隨時可插隊，低風險高價值）。
