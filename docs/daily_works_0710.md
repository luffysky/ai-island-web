# 工作日誌 2026-07-10（大型場次：補助企劃 + AI 分層/免費策略/Z幣經濟 + UI）

> 完成用 ~~刪除線~~ 保留可見（不刪）。tsc + vitest(117) + next build 全綠、關鍵 migration 已上線。

---

## ✅ 今日完成

### 一、補助 & 競賽 完整企劃（docs/grant/）
- ~~**技術全盤點**~~ ✅ 多代理逐一讀真原始碼，逐項標 ✅真有/🟡半成品/❌只有殼 + 檔案:行號（`tech-inventory.md`）。
- ~~**DB 實查 traction**~~ ✅ `scripts/grant-facts.mjs`（唯讀查數字 + env 布林）：真實用戶 17、真人活躍~4、營收 0、seed 資料辨識、bot session 揭露。
- ~~**九章計畫書**~~ ✅ ch1~ch9 + ch0 現況口徑；面向 DIGITAL+「數位服務創新補助」。
- ~~**Codex 兩輪審稿逐條修**~~ ✅ pre-revenue 全書一致、seed 非 UGC、翻譯/成本/GDPR/求職閉環/島嶼經濟但書、口徑斷裂修復。
- ~~**市場數據換原始/官方來源**~~ ✅ HolonIQ 官方 $404B、資策會 MIC 官方新聞稿、國發會官方、104 報告、《Science》2019 MOOC 3.13%。
- ~~**競品 AI 現況查證**~~ ✅ 修正過時「競品缺 AI」（Hahow/均一/Codecademy 皆已有 AI），差異化改主張「完整組合」。
- ~~**TAM/SAM/SOM + pilot 量化 + KPI 反推模型 + 經費範例**~~ ✅（ch2/ch8/ch9）。
- ~~**pitch deck 中/英 + 一頁式競賽摘要 + 獨資商號登記清單 + full-plan 合併**~~ ✅。
- ~~**後台「補助&競賽作戰室」頁面**~~ ✅ `/admin/grant`（漸層 Hero、左側文件清單、react-markdown 渲染、RBAC 限 admin/owner）；`gen-grant-content.mjs` 打包 docs→bundle。

### 二、全站 AI 分層授權（一致化）
- ~~**免費 = 只能 auto、不能選模型**~~ ✅（伺服器強制 + 前端隱藏選單，`/api/ai/tier`）。
- ~~**Plus / Pro / 特權分層**~~ ✅ Plus 中階可選、Pro 高階可用、特權(ai_unlimited/owner)無限且 auto 直接最高階、可自切 Claude/GPT/Gemini。
- ~~**共用 `ai-tier-gate.ts` 套到寵物聊天**~~ ✅（Nami ai-help 為 admin-only 免閘）。

### 三、AI 免費三招（讓免費用戶幾乎用不完、成本≈0）
- ~~**招1 免費供應商輪替**~~ ✅ 閘道加 Cerebras/NVIDIA/SambaNova/Mistral（GitHub Models 因 7/30 退役標警告）；各家當前正確 model id 直接 seed 進 DB（`seed_free_models_2026-07.sql`）；後台加「新增/刪除模型 + 取 key 說明」。
- ~~**招2 瀏覽器模型 WebLLM/WebGPU**~~ ✅ `webllm.ts` + AITutorWidget「⚡本地模型」toggle（真無限免費、在裝置跑）。
- ~~**招3 語意快取**~~ ✅ `ai_semantic_cache_migration`（embedding + match_ai_cache RPC）；相似問題命中不打 API。

### 四、Z幣 AI 點數經濟（#3）
- ~~**高階每日限額 + 免費 100/日 + 超額用 Z幣**~~ ✅ `ai_quota_v2_migration`（high_used + consume_ai_quota_v2 原子扣 Z幣）；免費續用 2 Z幣、高階加購 20 Z幣（可調 `ai-quota-config.ts`）；免費上限 10→100；前端「💰花 X Z幣續用」按鈕。

### 五、定價分層
- ~~**Plus NT$149 / Pro NT$349（月）+ 年繳**~~ ✅ `config.ts` 4 方案 + tier + PLUS/PRO_PERKS；海外自動換算 USD；store 頁分層顯示。

### 六之二、續場（UI 微調 + 拖曳鈕 + 補助頁目錄 + RWD scroll）
- ~~**首頁模式卡重排**~~ ✅ 經典→創作者→程式副本→沉浸式3D島嶼（島嶼放最後、目前 flag 關閉）（`Hero.tsx`，169.jpg）。
- ~~**語言下拉不再被截斷**~~ ✅ `w-max min-w` + 拿掉 overflow-hidden + 名稱 whitespace-nowrap（168.jpg）。
- ~~**漢堡/大綱浮動鈕可拖曳移動**~~ ✅ 新 `useDraggableFab`（點=原動作、拖=移動、位置記 localStorage、吞掉拖曳後誤觸 click）；套到後台側欄鈕 + 章節大綱鈕。
- ~~**後台補助頁：手機點文件自動捲到內容**~~ ✅（`openDoc` 手機 scrollIntoView，不用再手動下滑）。
- ~~**補助頁「完整合併版」目錄要有節點**~~ ✅ 以原始碼行號當 anchor id（h1~h3、跳過標題與手寫「目錄」）；`<details>` 目錄、點了平滑捲到該段、scroll-mt 扣 header。
- ~~**RWD：overflow 不要 hidden 用 scroll**~~ ✅ playgrounds 程式碼預覽 overflow-x-hidden→auto；ai-history 兩欄補 min-w-0；site-audit 表格 overflow-hidden→overflow-x-auto。
- ~~**全站表格橫向可捲**~~ ✅ 逐一查 27 個含 `<table>` 元件：多數已有 `overflow-x-auto`；discord / ai-cache 兩支補上 wrapper。
- ~~**comma-in-grid 唯一確定壞的**~~ ✅ `EngineWorkspace` `grid-cols-[minmax(0,1fr),340px]`→底線；全站已零筆逗號 grid。
- ~~**SWOT 寫入補助資料夾 + 後台頁**~~ ✅ `docs/grant/swot.md`（S/W 以程式碼實況、O/T 沿用既有可查證來源、不編造數字；含 SO/WO/ST/WT 對策），重打包 grant-content（17 篇）。
- ~~**AI 聊天輸入排版升級（170/171.jpg）**~~ ✅ 把輸入框左邊功能鍵移到「貼著輸入框上方」的工具列 → 輸入框吃滿整行寬、不再被擠窄（`AITutorWidget`：AI導師/綠寶；`IslandChat`：創作夥伴綠寶）。

### 六、UI / RWD / 修正
- ~~**筆記破版真凶 = grid 缺 grid-cols-1**~~ ✅（手機隱式 auto 軌道撐爆）。
- ~~**全站輸入多行 + 手機 Enter 換行**~~ ✅（`composer.ts`：綠寶/Nami/寵物/島聊/私訊/論壇/部落格/社群）。
- ~~**教學占位偽代碼修正**~~ ✅ ch26/ch07 `do_stuff()` 改真範例。
- ~~**E2E locale fix**~~ ✅（US CI runner 被 i18n 判英文→全滅；`e2e/fixtures.ts` 固定 LOCALE=zh，31 passed）。
- ~~**後台側欄手機不佔空間 + 全站側欄收合展開「方向性滑動」動畫**~~ ✅（CollapsibleAside 寬度滑動、NavGroup/筆記樹 max-height 上下滑）。
- ~~**build 修復**~~ ✅（重構後 prefer-const 擋 build）。

---

## 🔨 待辦（下次）

### 🚀 全站 AI 升級路線圖 P0–P4（詳規劃 → `docs/ai_upgrade_plan.md`）
> 盤點：旗艦 AI 導師 `api/ai/chat` 全配；其餘 AI 只用一半工具箱、`streamAI` 出口記帳有洞。
> 決策：創作者綠寶=只擋高階模型保持免費+軟上限預埋（見規劃書 §4）。

- **P0 成本記帳補完（=下方 HIGH，最優先、低風險）**
  - ⬜ `admin/quiz/generate:92`、`pet/tick:121` streamAI **零記帳** → 收尾補 `logAiUsage`。
  - ⬜ 主聊天 `ai/chat:384` 沒進 `inc_model_usage`（per-model 儀表板漏最大宗）→ 補上、注意不重複計。
  - ⬜ 抽 `streamAndLog` helper，掃全站 streamAI 出口都經過它。
- **P1 創作者綠寶補漏**：⬜ `gateHighTierModel` ⬜ 改串流(+前端 IslandChat) ⬜ 語意快取 ⬜ 每日軟上限 config(預設關)。
- **P2 語意快取推廣**：⬜ pop-quiz / learning-plan / blog-write / ai-assistant 接 `lookupSemanticCache`。
- **P3 路由統一+補洞**：⬜ 面試/challenge/resume/admin生成器 → `completeForUsage` ⬜ 模擬面試只擋 start→每回合計 ⬜ 移除重複 `providerFromModel`。
- **P4 能力擴充**：⬜ RAG 加到 assistant/面試/創作 ⬜ vision 加到面試/grade_draft ⬜ 舊 `consume_ai_quota`→`_v2` 統一。

### 🚨 HIGH：AI 成本沒真正抓到所有 API 實際花費（林董指出）＝上方 P0
- ⬜ 目前 `ai_model_usage` / `logAiUsage` 記帳**不完整**——不是每個用到 AI 的入口都有記真實 token/成本；且早期用量只在各供應商後台。
- ⬜ 目標：**全站所有 `callAI`/`streamAI` 入口都確實記 token→成本**（含背景任務：學習計畫、模擬面試、創作引擎、LINE bot、summarize-memories、forum residents…），並對帳各供應商實際帳單。
- ⬜ 免費供應商雖成本≈0，但要能區分「免費/付費」用量、算真實邊際成本。

### 🧪 測試（下次）
- ⬜ **E2E 補齊**（現有已修 locale、綠）：擴到金流 / 筆記 CRUD / 島嶼 / 語言切換 / 離線。
- ⬜ **Smoke test**：關鍵頁 200 + 核心 API 健康的快速煙霧測試。

### 🏝️ 沉浸式 3D 島嶼（IslandV0，方向鍵操控角色的「真的一座島」）
- ⬜ **現況問題：太吃資源**（@react-three/fiber + GLB + postprocessing，手機/弱機掉幀）。
- ⬜ **下次規劃替代方案**：(a) 降 draw call / LOD / 關 Bloom；(b) 手機自動切 2D 版；(c) 只在桌機 / 高效能裝置載入 3D、其餘給輕量版；(d) 進度存 DB（目前 localStorage、換裝置歸零）。
- ⬜ 與遊戲化經濟（Z幣/成就/任務）真正接上（目前多為 localStorage 半成品）。

### ❤️ 生命值（hearts）決定
- ⬜ header 的「生命」目前是**裝飾/半成品**（預設 5、只有島嶼睡覺 +1、無消耗端、完課不加）。三選一：(1) 做成體力機制（探索/挑戰消耗、完課/睡覺回）、(2) **改成「連續學習天數 🔥」streak（建議、已有打卡資料）**、(3) 先從 header 拿掉。

### 🚨 島嶼經濟刷幣漏洞（延續 0709）
- ~~`catch-fish` / `redeem` 信任前端申報 → 無限刷幣~~ → ✅ 伺服器權威**每日賺幣上限** `ISLAND_DAILY_ZCOIN_CAP=500`（`src/lib/island-economy.ts`）：即使前端謊報龍魚/200水晶，一天最多只能拿 500；加總來自 `coin_transactions`（island_fish*/island_harvest*）。含 vitest 單元測試。
- ⬜ phase 2（需同步改前端）：釣魚魚種改**伺服器擲骰**、前端顯示伺服器回傳結果 → 連單筆 outcome 也權威化；完整 E2E（Playwright）回歸另立。

### 其他（低）
- ⬜ Plus/Pro tier 的高階 gating UI 顯示（目前後端已限，前端可標示剩餘高階額度）。
- ⬜ admin routes `req.json()` try/catch；PWA icon 收斂；reaction 防刷。

---

## 七、部落格／AI／emoji 大補 + 種子內容規模化（0710 下半）

### ✅ AI 聊天（截圖 173）
- ~~送出的 emoji 掉回靜態字元~~ → `renderUserContent` 改走 `EmojiText`，送出後會動。
- ~~傳圖片/GIF 有綠色對話框~~ → 圖片/GIF 單獨傳時去掉 bubble、透明背景、放大不裁切、去邊框。
- ~~綠寶人設太罐頭~~ → 綠寶：更像島民朋友、預設講重點別長篇、拿掉公式化客服開場/結尾、收到圖會真的評論內容。
- ~~多聞人設不對~~ → 對齊名字本義「博學多聞」，改成博學溫和的傾聽者（拿掉「吐槽擔當」）。

### ✅ 動態 emoji 基建
- `AnimatedEmoji` 三段式 fallback：Noto 動態 WebP → Microsoft Fluent 3D（立體、筆畫粗）→ 純字元（等於接上 fluentui-emoji、修好「Noto 沒動畫就掉回細瘦字」）。
- emoji 選單新增「顔文字（ツ）」分頁 + 「貼圖」分頁（自建 12 張動態 SVG 貼圖，`scripts/build-stickers.mjs` → `public/stickers/`）。
- 圖片網址渲染規則（聊天/部落格留言/論壇）加 `.svg` 支援，貼圖走 `<img>` 會動。

### ✅ 部落格留言
- 留言框＋回覆框加 emoji + GIF 選擇器；留言內容改成顯示動態 emoji / 圖片 / GIF。

### ✅ 種子部落格補到布林哥規模（DB 內容，已即時生效）
- `scripts/gen-persona-blogs.mjs`（新）：多角色通吃，AI 先產專屬大綱（快取 `scripts/_data/persona-syllabus-*.json`→slug 穩定）再一篇篇生文，冪等、可 `--limit` 分批、預設 Haiku 省錢、可 `--model` 覆蓋。
- 7 個種子角色各補到 ~72 篇：綠寶助教/前端精靈/Debug 老爹（技術）+ 蘇晚/林之遠/何默/江見（創作者）。**公開文章 97 → 591 篇。**
- `scripts/gen-blog-seed-comments.mjs`（新）：給留言少的文章補 AI 生成讀者留言（帶 emoji、偶爾作者回覆），冪等。**留言 56 → 2000+ 則、多數文章 2+ 則。**

### ✅ 計畫書：Creator Island 亮點化
- 新 `docs/grant/creator-island.md`（第二根支柱亮點頁：兩島同魂「降低 AI 時代的恐懼」、誠實口徑「路徑已串接、閉環待驗證」）。
- `ch3-product.md` §9 從 2 行「第二產品線」擴寫成完整亮點模組；後台補助頁 metaFor 補一筆；`gen-grant-content.mjs` 加排除清單（`待改.md` 內部批評稿不打包）→ 重生 `grant-content.ts`。
- 📌 待辦：計畫書「重新定錨」四塊（一句話定位／補助研發題目／補助前後差異表／KPI＋API 成本驗證邏輯）—— 見 `docs/grant/待改.md`。

### ✅ 鐵規則入庫
- `CLAUDE.md` 頂加「🚨 每次 commit/push 前檢查清單」；同步新增 `codex.md`。

---

## 八、超長連續 session（0710 深夜）— AI/翻譯/計畫書/程式辭典大爆發

### ✅ 已完成並上線（~30 個 commit）
- **AI 聊天/emoji**：送出 emoji 會動、圖片去綠框、Fluent 3D fallback、顔文字(ツ)分頁、自建 12 張動態貼圖(SVG)、綠寶更像島民/多聞對齊「博學多聞」。
- **種子內容規模化**：7 個 AI 住民/創作者部落格補到布林哥規模（**公開文章 97→~590**）、種子留言 **56→2388**（多數文章 2+ 則）。生成器 `gen-persona-blogs.mjs`、`gen-blog-seed-comments.mjs`（Haiku、冪等、大綱快取）。
- **AI 升級 P0–P4**：P0 streamAI 三出口補記帳、P1 創作者高階模型分層(堵 money-leak)、P1c 每日軟上限 config、P1b 創作者聊天串流化、P2 語意快取上 assistant、P3 模擬面試補洞(3場/月保留+回合計token)+移除重複 providerFromModel、P4 寵物/學伴共用主聊天免費池。
- **hearts→streak**：拿掉半成品生命值、留連續學習天數。
- **島嶼刷幣**：伺服器權威每日賺幣上限 `ISLAND_DAILY_ZCOIN_CAP=500` + 單元測試。
- **build heap OOM 修復**：ci.yml + Dockerfile 加 `NODE_OPTIONS=--max-old-space-size=4096`（CI #179 起紅的都轉綠）。
- **「查看翻譯」(FB/IG 式)**：`TranslateButton`（免費 Google、切中英日韓、看原文）接到 部落格留言/論壇/AI導師/社群貼文+留言/寵物AI/綠寶創作。共用 `ChatContent` 升級（動態 emoji+圖片+貼圖）。
- **選擇器補齊**：emoji/顔文字/貼圖/GIF 補到 社群留言(含顯示升級)/創作碎片/市集描述/導師簡介/部落格簡介/寵物聊天。
- **計畫書重新定錨**：`repositioning.md`（四塊核心）+ `creator-island.md`（第二支柱亮點）+ ch1/ch3/ch5/ch9 對齊；後台補助頁已更新。`gen-grant-content.mjs` 排除 `待改.md`。
- **程式辭典（新功能）**：`/dictionary`（搜尋+篩選+詳解+JSON-LD+自建 Lottie hero）、`dictionary_terms` 表、i18n 接翻譯管線、nav 四語。**手寫種子 1022 條**（20 批）。規劃書 `docs/dictionary_plan.md`（含語言島骨架）。

### ⬜ 待辦（下次接力）
- **辭典續寫**：從 `dictionary-seed-21.json` 接、目標 5000（現 1022/20%）。詳見 CLAUDE.md「程式辭典續寫接力」。→ 使用者說「續辭典」即從第 21 批繼續。
- **辭典 i18n 續補**：每加幾批跑 `node scripts/translate-sync-all.mjs` 補譯。
- ⬜ 作品集描述（`PortfoliosClient.tsx`，物件 state）補 emoji picker（audit 剩這一個）。
- ⬜ P4 **Z 幣續用 UX**：pet/chat、ai/assistant 的 `need_zcoin` 402 → 前端做「花 Z 幣續用」提示（現在只擋）。
- ⬜ 島嶼刷幣 **phase 2**：釣魚魚種改**伺服器擲骰**、前端顯示伺服器回傳結果；完整 **Playwright E2E** 回歸。
- ⬜ 計畫書其餘章節對齊 repositioning：ch2/ch6/ch7 + pitch-deck（把「完整閉環/MOOC 3.13% 旗艦/零成本多語核心」語氣收斂，同 `repositioning.md`）。
- ⬜ **語言島** 實作（`/語言島`，沿用 dictionary 元件 `domain='english'|'japanese'`；`docs/dictionary_plan.md` 有骨架）。
- ⬜ Lottie 星星 hero 若老闆不喜歡 → 換 LottieFiles 免費動畫（Lottie Simple License 可商用）或調整。
- ⬜（延續）E2E + Smoke tests；沉浸式 3D 島嶼降耗。

### 🚀 已立項：AI 島行動代理系統（Agent 平台）
- **已立項（0710）。架構規劃書 `docs/agent_platform_plan.md` 已出**（架構/資料流/6 張資料表/API contract/WebSocket 事件/Tool 介面/L0–L4 權限/目錄/分階段 task list/風險 KPI），待老闆 review 凍結 MVP 範圍與資料表後進 Phase 1。
- 來源分析：`docs/待閱/Agent.md`。**把 AI 島從「有 AI 的網站」推成「人類學會駕馭 Agent 的訓練場」，第三座島（學習/創作/行動）。**
- ✅ **Phase 1a 已完成（0710）— AI 島側垂直切片、UI 一起接通、已上線**：
  - DB：`agent_tasks/agent_steps/agent_approvals/agent_device_bridges` 四表 + RLS（`supabase/agent_platform_migration.sql`，已跑）。
  - 後端：`src/lib/agent/tools.ts`（Tool SDK + registry + 風險等級 + 確認摘要）、`orchestrator.ts`（Agent Loop：規劃→權限→執行→記步→回饋、最大步數、中止、approval 輪詢）；模型走 `completeForUsage("agent_core")`（記帳/配額/備援）。
  - API：`/api/agent/{tasks, tasks/[id], approvals/[id], tools}`（建任務走 SSE 串執行過程）。
  - 前端：`/agent` 面板（下令、即時步驟流、💭思考、確認彈窗含動作/影響/可復原、能力面板、任務歷史回放）+ nav 入口（4 語 i18n）+ RWD。
  - 工具：`web.fetch`、`dictionary.lookup`（伺服器真的能跑）；`filesystem.*`/`system.run_command` 為 device stub（會觸發確認流程、回「需桌面助手」）。
  - 驗證：tsc / vitest(122) / next build 綠；DB insert smoke 綠；真模型 planner 回合法 JSON + 選對工具。**尚未做**：登入態下的整條 HTTP SSE 點擊實測（可下次一起走一次）。
- ✅ **Phase 1b 進行中（0710）— 本機能力接通、桌面助手可實跑、已上線**：
  - 架構決策：Zeabur 不架長駐 WS，Bridge↔雲端用 `agent_device_calls` 佇列 + 輪詢（同 approval 那招）。
  - DB：`agent_device_calls` 佇列表 + `agent_device_bridges` 補 `token_hash/whitelist/revoked`（`supabase/agent_bridge_migration.sql`，已跑）。
  - Bridge API：`/api/agent/bridge/{pair,poll,result}` + `/api/agent/devices`（pair 發一次性 token、poll/result 用裝置 Bearer 認證、poll 兼心跳）。
  - orchestrator：`needsDevice` 工具改走 `dispatchToDevice()`（入列輪詢）；無在線裝置→提示配對。
  - 桌面助手 `apps/desktop/`：可實跑 Node 核心 `bridge.mjs`（零安裝、Node18+）+ Electron 外殼（系統匣/狀態視窗/啟停）+ README。工具：`filesystem.list/read/write`、`system.run_command`。安全：檔案限 `roots`、指令首詞白名單、寫入/高風險靠雲端逐次確認、token 只存本機（gitignore）。
  - `/agent` UI：桌面助手面板（在線狀態/解除配對）+ 配對彈窗（一次性 token + 設定步驟）。
  - 驗證：tsc / vitest(122) / next build 綠；**Bridge 端到端 smoke 綠**——真的寫檔/跑 echo/列目錄，且正確擋掉白名單外 `rm -rf /`。
- ✅ **Phase 2a 完成（0710）— 手機遙控，已上線**：Bridge↔雲端本就裝置無關，手機開 `/agent`（RWD/PWA）即可下令→PC 執行→串回手機。補上遠端感知：
  - Web Push（需確認/完成/未完成 → 推播全裝置，深連結 `/agent?task=<id>`；VAPID 未設自動 no-op）。
  - 跨裝置批准（推播點進手機→自動載入任務→直接批准；approval 走 DB、任何裝置都生效）。
  - 遠端觀看（進行中任務輪詢刷新 + 「遠端觀看中」+ 可遠端停止）。
  - 語音輸入（Web Speech zh-TW）+ 目標裝置提示。
- ⬜ 下一步 **Phase 1b 收尾**（Playwright browser-worker + 截圖 + 真跑端到端 Demo + KPI）／**Phase 2b**（任務背景執行、脫離連線照跑）／Android／排程。
- 核心：`Agent Core`（任務規劃迴圈＋最大步數＋重試＋驗證＋中止）、`Tool Registry`（每工具 JSON Schema＋風險等級 read/write/dangerous＋平台限制）、`Device Bridge`（本機助手 Electron→Tauri，WebSocket 連線）、`Browser Worker`（Playwright 走 DOM/Role/Accessibility、不用座標）、`Approval Engine`（L0–L4 權限、寫入/刪除/付款要確認）、`Credential Broker`（Agent 不碰明文密碼）。
- **MVP 只做 Windows + 瀏覽器 + AI 島開發工作流**（Demo：手機下指令→電腦開 VS Code 跑測試→分析錯誤→回傳，改檔前要確認）。Android 第二階段、iOS 最後（限制大、走 App Intents/Shortcuts）。
- 差異化敘事（接 AI 島原定位）：**「別人教你怎麼問 AI，AI 島教你怎麼讓 AI 真正做事」**——最透明、可教、可視化、可中止、失敗可回復的 Agent，讓新手敢授權。競賽自評 8/10。
- 執行優先級：API Agent > MCP Tool > 結構化 UI Automation > 視覺 Computer Use（能走門就別爬窗）。
- 待老闆決定要不要立項；要做的話先出「架構/資料流/資料表/API contract/WebSocket 事件/Tool interface/權限模型/目錄結構/分階段 task list」，不要先塞實作、不要把 Agent 迴圈塞前端。

---

## 🔒 安全紅線（不變）
- `.env.local` 永遠不 commit；`docs/logerr.md`、`docs/note.md` 保持 untracked。
- service_role key / DB 密碼整個專案完成後再輪替。
- 金流商特約商店需**企業會員 + 統編**（獨資商號登記後開通）——目前正式收款尚未開通。

## 📌 一句話交辦
**補助/競賽企劃全套 + 後台作戰室頁完成；全站 AI 分層(免費auto-only/Plus/Pro/特權) + 免費三招(供應商輪替/瀏覽器模型/語意快取) + Z幣扣點經濟 + 分層定價 全上；UI(筆記破版/多行輸入/側欄方向滑動) 修完。下次最該做：AI 成本全面記帳 + E2E/Smoke + 沉浸式島嶼降耗規劃。**
