# 工作日誌 0820

## 0. 全專案待辦大掃描（找出「真正還沒做完」的）

林董出門前交代：盤點整個專案所有待辦、找出真正還沒做完的、能做完的先做完、不要停。

**做法**：5 個平行 subagent 對照「todo 勾選狀態 × 實際程式碼」逐項核實（分身島 / 機會島+Creator / 內容+辭典+教具 / UI+商業+安全 / 其餘 plan 文件），抓出三類誤差：①標未做但其實早做好（該打勾）②標未做且真沒做（分我可做 / 卡外部 / 待決策）③master todo 沒收錄的新工作。

### 掃描結論摘要
- **標未做但實查已做好（該補勾）**：2.8.1/2.8.2/2.8.3.1 語音子項（`src/features/voice/*`）、7.4 API key 輪替 UI（`me/api-keys/`）、8.5 記憶頁+AI run 儀表板（`TasteLibrary`/`GrowthClient`）、3.1 推薦透明化+能力圖譜、7.15.2.1 follow 鈕。
- **我可做（純 in-repo 無外部依賴）**：辭典續寫、教具 ch31/32/47/48、後台空殼 7.0.1/7.0.3、機會島雷達 3.3.1/3.3.2/3.3.3、分身島 §2.3 social adapter（`src/lib/social/` 從沒建，token 已有）、2.2.2/2.2.3 TG/Discord agent 橋接（todo 誤標 🔴、其實 token 已有）、7.6 作業自動批改、6.3/6.5/6.6（表沒建、量大）。
- **卡外部**：首頁 5 層視差/角色去背（等生圖）、4.1.4 圖文解說圖（等生圖）、Meta/Google/GitHub OAuth、L2 伺服器瀏覽器 env、金流/cron/LINE 登入設定（§🅰）。
- **待林董拍板**：6.1 Z幣 sink、6.8 付費 gating 深化、8.2 真金流+KYC、Coco v1。
- **master 沒收錄的新工作**：Coco/Agent Economy（0812 docs）、`upgrade.md`（0818 infra/安全技術債：無 migration ledger、presign 沒接、RLS 缺 policy、輪替密路徑）、Creator FIE 推理層（`docs/creator/AI_Island_FIE_v1_0.md`）、`docs/admin_upgrade/` 40 項後台 roadmap。

## A. 辭典前端零基礎大補（§4.2.1.5）— +88 條 → 2436

手寫、零 API。續 seed-65 起編號，author 前跑 slug 去重掃描（planned 106 → 撞既有 18 → 新 88）。

- **seed-65** HTML 元素·語意 16：div/span/a/img/清單/table/heading/p/語意標籤/media/canvas/iframe/head標籤/doctype/attribute/entity
- **seed-66** HTML 表單·輸入 14：form/input-types/checkbox/radio/select/textarea/button/label-for/placeholder/required/action-method/validation/fieldset/autocomplete
- **seed-67** CSS 選擇器·盒模型 13：class/id/attribute/後代子選擇器/box-sizing/margin/padding/border/display/inheritance/float-clear/overflow/垂直置中
- **seed-68** CSS 排版·單位·色彩·文字 11：flexbox-basics/color/background/border-radius/opacity/font/line-height/text-align/letter-spacing/text-overflow/gradient
- **seed-69** JS 基礎語法·型別 9：變數/型別/運算子/==vs===/scope/預設參數/短路/型別轉換/NaN-undefined-null
- **seed-70** JS DOM·事件 13：querySelector/getElementById/createElement/appendChild/addEventListener/event物件/冒泡捕獲/preventDefault/classList/innerHTML-vs-textContent/dataset/DOMContentLoaded/submit事件
- **seed-71** JS 陣列/物件·async 入門 12：map-filter-reduce/forEach/find-some-every/includes/sort/Object方法/JSON/Array.from/async-await/fetch/then-catch/計時器

跑 `node scripts/import-dictionary.mjs` → upsert 2436、失敗 0、全站辭典 2436 條。全 71 seed 無 slug 衝突。（i18n 補譯 `translate-sync-all.mjs` 可之後長跑。）

- **seed-72** 常見前端錯誤訊息 11（`category=error`，todo 點名的下批主題）：讀 undefined 屬性/x is not a function/Uncaught TypeError/ReferenceError not defined/Failed to fetch/NetworkError-ERR_CONNECTION/Unexpected token < in JSON/Unexpected end of input/Maximum call stack/Too many re-renders/無限渲染迴圈。撞既有 5 條（cors-error/hydration-error/module-not-found/port-in-use/syntax-error）已剔除。→ 辭典 **2447**。
- **seed-73** 瀏覽器開發者工具 12（`category=tool`）：Console/console.log/console 進階(table/warn/time)/檢查元素/Elements 檢視器/Network 分頁/網速模擬/中斷點/Application(儲存·PWA)/Performance/Lighthouse/響應式檢視模式。12 條全新無衝突。→ 辭典 **2459**。

## B. 後台成就管理真正可 CRUD（§7.0.3）

原 `/admin/achievements` 標題「成就管理」實為唯讀（只 `.select("*")` 印卡、無任何寫入）＝空殼。補齊：
- **API** `/api/admin/achievements`（`requireAdmin` 守）：GET（清單+各成就解鎖人數）、POST（新增，id=slug 主鍵唯一、欄位驗證+夾值）、PATCH ?id=（編輯，不許改主鍵）、DELETE ?id=（**已被解鎖的擋下、回明確 409**，避免破壞 `user_achievements` FK 與使用者紀錄）。
- **前端** `AchievementsClient.tsx`：新增表單 + 每卡 inline 編輯（名稱/說明/圖示/分類/稀有度/XP/Z幣）+ 兩段式確認刪除 + 稀有度色標；已解鎖數顯示、已解鎖者刪除鈕 disabled。`page.tsx` 改渲染 client。
- 對照 `admin/opportunities/sources` 既有 CRUD 慣例；RWD grid-cols-1 md:2 + flex-wrap。

## C. 其他

- §7.0.4 `/admin/strategy` 靜態註記 → **實查已存在**（page 第 18 行已有「📄 靜態分析文件」badge），無需再動。
- §7.0.5 跑 `scripts/audit-db-columns.mjs`：無新增破綻（既有 ✗ 全是 `${POST_COLS}` 這類 template-literal 欄位名的靜態分析誤判 + route 前綴誤判，非真錯）。

## D. 機會島雷達：每欄原文證據 + 信心分（§3.3.3）

原 candidates/extract 只回 5 欄值、`opportunity_candidates.parsed`/`confidence` 欄留空（migration 註明「本版先 null」）。補齊：
- **API** `candidates/extract`：SYSTEM prompt 加要求 AI 逐欄回傳 `evidence`（原文逐字佐證、抽不到 null、明令不可捏造）+ 整體 `confidence` 0~1；`cleanEvidence` 淨化；**寫回候選列** `parsed={5欄+evidence}`、`confidence=數字`（填滿本來留空的欄）。
- **API** `candidates` GET：select 加 `parsed, confidence` → reload 後 RadarClient 能還原、不用重抽。
- **UI** `RadarClient`：`load()` 從 parsed/confidence 還原 sug/ev/conf；待審卡加信心分色標 badge（≥75%綠/≥40%黃/否紅）+ 可展開「原文佐證（核對用）」逐欄列出 + 提醒仍需比對原文。無 migration（用既有欄）、後台限定、`requireAdmin` 守。

**建置**：`npx tsc --noEmit` 0 error、`npx vitest run` 225/225、`npx next build` 綠（含 A/B/D 全部改動）。

## E. 教具大工程 §4.1.5：ch31 Node.js 100% 覆蓋

原 8 沙盒 + 2 教具、15 課無任何互動。補到 **25 課 0 GAP（12 playgrounds + 13 demos）**：
- **4 個自足 JS 沙盒（node 本地實跑驗過、無外部套件依賴、可在 server sandbox 跑）**：31.8 Event Loop 執行順序親眼看（同步→微任務→巨任務）、31.12 手刻迷你驗證器（理解 Zod）、31.17 手刻迷你測試框架（理解 Vitest，用 node:assert）、31.18 手刻結構化 logger（理解 Pino）。
- **11 個概念教具**（需 server/DB/infra 或純概念、用既有 scenario-judge / decision-quiz 型別、renderer 免改）：31.6 套件管理器選型、31.7 TS 用法判官、31.9 Express 判官、31.10 框架選型、31.11 Prisma 判官、31.14 WebSocket 判官、31.15 BullMQ 判官、31.16 Redis 快取判官、31.19 部署平台選型、31.21 tRPC 判官、31.22 AI SDK 判官。
- 以 Python 注入（indent=2 round-trip 與原檔逐字一致、只動到目標課）；`import_chapters_to_db.mjs ch31` 同步進 DB（lessons.playgrounds/demos 欄）。⚠️ 章節讀 DB 不讀 JSON，已跑 import。

## F. 教具大工程 §4.1.5：ch32 Go 100% 覆蓋

原 10 沙盒 + 1 教具、14 課無互動 → **25 課 0 GAP（18 playgrounds + 7 demos）**：
- **8 個 Go 沙盒**：32.6 struct+method(值vs指標接收者)、32.7 指標傳值vs傳指標、32.8 interface 多型、32.9 goroutine+WaitGroup、32.10 channel、32.11 select+context 逾時、32.14 標準庫 strings/time/json、32.19 手刻迷你測試(理解 go test)。
- **6 個概念教具**：32.13 package/module 判官、32.15 net/http 判官、32.16 Gin/Fiber/Chi 選型、32.17 GORM/sqlx/sqlc 判官、32.18 JWT+middleware 判官、32.20 部署/跨平台編譯 判官。
- ⚠️ 本機無 go 工具鏈、Go 沙盒為手寫 canonical（未本地 compile，靠 server sandbox 執行；已逐支目視審 syntax）。`import_chapters_to_db.mjs ch32` 同步 DB。`tsc --noEmit` 0 error（驗 bundle 內章節 JSON 型別）。

## G. 辭典再一批：終端機/命令列基礎（+15 → 2474）

- **seed-74** 終端機/命令列基礎 15（beginner 必備、`category=tool`/`concept`）：cd/ls/pwd/mkdir/rm/cp/mv/cat/touch/echo/chmod/man/家目錄~/隱藏檔dotfile/副檔名。（撞既有 relative-absolute-path、working-directory 已剔除。）import upsert 2474、失敗 0。

## H. 教具大工程 §4.1.5：ch47 AI應用 + ch48 Vibe Coding 100% 覆蓋

盤點結論：這兩章的 GAP 課**全是概念課、0 個可跑沙盒**（ch47 是各產業 AI 應用目錄、ch48 是工作流/心態）——照 §4.1.5「概念課給對題道具、沙盒只放程式章別亂塞」原則，全用 scenario-judge / decision-quiz。
- **ch47（17 課 GAP → 0 GAP）**：每個產業補「AI 應用判官」scenario-judge，判斷該產業的 AI 點子 可行(ok)/有風險(risk)/別做(no)——教育/醫療/法律/金融/電商/房仲/餐旅/製造/HR/設計/媒體/開發/資料/生產力/兒少長照/政府 + 47.22 一人公司決策測驗。**特別把醫療/法律/金融/長照/政府的紅線判斷寫進去**（診斷處方/編造判例/投資保證/黑箱核定/唯一照護＝no），教的是領域判斷不是充數選擇題。
- **ch48（14 課 GAP → 0 GAP）**：補 vibe coding 核心判斷 scenario-judge——任務粒度、該不該信 AI 測試(鎖 bug 的假測試=no)、該不該讓 AI 直接改、用 AI vs 自己寫、AI 輸出紅旗(偷加依賴=no)、多/雙 agent 分工、大重構節奏、0→上線、prompt 寫法、心態 + 48.21 終端 agent vs 編輯器決策測驗。
- 以 Python 注入（indent=2 逐字一致）；`import_chapters_to_db.mjs ch47 ch48` 同步 DB（0 errors）；`tsc --noEmit` 0 error。
- 里程碑：**ch1-11/15-22/26/7/16/31/32/47/48 已 100% 互動覆蓋**。
