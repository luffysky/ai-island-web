# 工作日誌 2026-07-12（bug 修復場：留言編輯 / 數據誠實化 / 收藏筆記 / 免費模型讀圖 + Agent 大工程規劃）

> 完成用 ~~刪除線~~ 保留可見（不刪）。tsc + vitest(122) + next build 全綠、關鍵 migration 已上線。

---

## ✅ 今日完成（四個 bug 全修 + 驗證）

### ① 留言「編輯」功能（討論區 + 部落格）
- ~~後端 PATCH 改內文（限本人）~~ ✅
  - 討論區 `api/forum/threads/[id]/replies` PATCH：新增 `body.content` 分支，本人限定改內文＋寫 `updated_at`（原本只切採納解答）。
  - 部落格 `api/blog/[userSlug]/[articleSlug]/comments` PATCH（新增）：service role 繞 RLS + `.eq(user_id)` 強制本人。
- ~~前端 inline 編輯~~ ✅ `ThreadReplies`(ReplyItem) + `CommentSection`(CommentItem) 加「編輯」鈕→就地 textarea→儲存/取消，optimistic 更新巢狀樹、失敗退回；顯示「（已編輯）」標記。
- ~~i18n~~ ✅ forum 四語加 `editButton/edited/editedTag/saveEdit/cancelEdit`（zh/en/ja/ko）；部落格沿用該檔既有中文字面。
- ~~migration~~ ✅ `supabase/comment_edit_migration.sql`：`forum_replies`＋`blog_comments` 補 `updated_at`（**已上線**）。

### ② 討論區數據誠實化（清假觀看數）
- ~~觀看數假底數清零~~ ✅ seed 硬塞的 486/231/135… 一律歸零，之後純靠 `ThreadViewTracker` 真實 per-session 累加。
- ~~reply_count 對齊實際~~ ✅ 重算 = 真實留言列數、修 drift。
- ~~止血未來~~ ✅ `seed-forum.mjs` 與 `admin/forum-seed/publish` 不再灌 `view_count`（一律 0）。
- ~~migration~~ ✅ `supabase/forum_data_honesty_migration.sql`（**已上線**：59 串觀看數全歸零、reply_count drift = 0）。

### ③ 章節「收藏 / 筆記」按了沒反應
- 病因：`BookmarkButton` / `NotePanel` / `FloatingNoteButton` / `useLessonNote` 都用 `supabase.auth.getUser()`，在 `revalidate=60` 的靜態章節頁會 **hydration race 回 null** → 靜默轉 `/login` → 看起來沒反應（`AuthContext` 註解早就寫過這雷、`ThreadReplies` 已改用 `useAuth()`）。
- ~~全部改用全站 `useAuth()`~~ ✅（getSession cookie cache、不會 race）。
- ~~浮動筆記鈕移到左下~~ ✅ 原本 `bottom-24 right-4 z-40` 被右下角綠寶助教泡泡（z-55）壓住 → 改 `left-4`，不再互擋。

### ④ 免費模型傳圖片無法解讀
- 病因：Auto 路由只看成本、**完全不看模型能不能讀圖** → 免費用戶送圖常挑到 Groq（默默丟圖）或純文字模型（報錯），且無任何提示。
- ~~視覺感知路由~~ ✅ 新增 `isVisionModel()`（provider+model_name 推斷）；`api/ai/chat` 有圖片時：非視覺模型→自動改挑視覺模型（免費池＝Gemini Flash/Flash-Lite），真的沒有→明確告知「請改付費雲端 / 用文字描述」。
- ~~fallback 也防呆~~ ✅ key-fallback 換到看不懂圖的模型時，寧可明講也不默默答錯。
- 直接回答林董：**不是所有免費模型都不能讀圖**——本地(WebGPU)模型天生純文字；免費雲端只有 Gemini 真能讀圖；修好後有圖會自動走 Gemini。

### 驗證（CLAUDE.md 檢查清單）
- ~~API/DB/腳本~~ ✅ 兩支 migration 已跑上線並驗證欄位/數據。
- ~~UI 真接~~ ✅ 編輯鈕打真 PATCH；收藏/筆記改可靠 auth；圖片路由到視覺模型。
- ~~RWD~~ ✅ 編輯 textarea 用既有 `w-full`＋flex 按鈕列（同回覆框樣式）；浮動鈕左下不溢出。
- ~~build~~ ✅ `tsc --noEmit` clean、`vitest run` 122 pass、`next build` exit 0。
- ~~機密~~ ✅ `.env.local` 未進版控；migration runner 在 scratchpad（repo 外）。

---

## ✅ 追加（同日第二輪）
### ⑤ 免費用戶每日 3 次高階模型（看圖/難題自動升級）
- ~~`AI_HIGH_DAILY_FREE = 3`；`highDailyFor(null)` 回 3~~ ✅
- ~~`api/ai/chat` auto 判為 high（含傳圖片）→ 先用每日高階額度、用完當天自動降級到免費模型（看圖降到 Gemini）；`highGranted` 防重複扣~~ ✅ 傳圖片有額度時自動走高階視覺模型、品質更好。

### ⑥ 移除失效的本地 WebGPU 模型
- ~~本地模型需下載約 1GB、實測無法用~~ ✅ 移除 toggle / 送出分支 / state / import；`webllm.ts` 已無人引用。

### 📐 兩份大規格（依林董要求先出 spec）
- ~~`docs/opportunity_island_spec.md`~~ ✅ 把 `機會島.md` 前後 GPT 提到的**所有功能**提煉分類：十層機會、AI 功能全集、多聞雷達四層、能力圖譜/組隊、資料模型、規則引擎適合度公式、分層收費、**重排 V1–V5**、風險但書。
- ~~`docs/agent_island_plan.md`~~ ✅ Agent 全面重規劃：命名提案（**分身島** ⭐/代理島/助手島）、**三種執行面（雲端/雲端沙盒/本機 Bridge）**、解「電腦沒開手機就沒用」（能力分流+離線排隊+雲端沙盒）、桌面助手升級成本機自主 Agent、桌機/平板/手機響應式、Phase A–F。

## 🦾 Agent 島大工程（開始實作，Phase A→F 連續做）
### ~~Phase A｜對話延續~~ ✅（migration 已上線）
- `agent_threads` 表 + `agent_tasks.thread_id`/`turn_summary`（`supabase/agent_threads_migration.sql`，已上線）。
- orchestrator：`planNext` 帶 `priorContext`（本串先前回合注入 prompt）；完成寫 `turn_summary` + bump thread。
- API：`/api/agent/tasks` POST 建/續 thread + 組前文；GET 支援 `?threadId`；新增 `/api/agent/threads`（列表/刪除）。
- UI：`AgentClient` threadId 續聊 + 「🔗 延續對話中」+ 本串先前回合顯示 + 「＋ 新對話」；replay/完成都會刷新前文。
- 效果：同一串問「幫我寫貼文」→ 分身記得上輪受眾/平台，不再每次重問。
- 命名：島名定為 **分身島**（nav/頁面全面改名待 Phase A polish）。

### ~~Phase B｜跨裝置執行~~ ✅
- 雲端工具本就 server-side、手機單獨可用；本機工具遇電腦沒開 → `awaiting_device` + 推播 + 輪詢等上線（最多5分）自動續跑，逾時優雅收尾。UI 納入 LIVE 狀態。

### ~~Phase C｜長期記憶（跨對話）~~ ✅（migration 已上線）
- `agent_memory` 表；完成後 haiku 抽取持久事實 upsert；API 帶入「我長期記得的」block；`/api/agent/memory` GET/DELETE；側欄「分身記得你」面板可逐條忘記。
- 效果：換一串新對話仍記得「我的受眾是 X」。

### ~~Phase F｜第一方護城河工具~~ ✅
- `island.myProfile`（讀你的等級/經驗/連續天數/Z幣）、`island.searchLessons`（站內課程搜尋）→ 分身「懂你、導你到對的教材」，通用 claw agent 拿不到。皆雲端唯讀、手機也能跑。

### ~~Phase D｜桌面助手＝完整 Agent~~ ✅（需重打包桌面 App 才到使用者）
- 桌面 App 內建「開啟完整 Agent（分身島）」：直接載入雲端 /agent 全功能（對話/記憶/技能/機會島），本機工具由同 App 的 Bridge 執行 → 桌面助手不再只是「被遙控的手」。
- **E 雲端沙盒**：需外部容器基礎設施，屬較大 infra，先規劃（agent_island_plan.md §1-B、§9-L2）。

### ~~Agent 引擎修正（林董實測回饋）~~ ✅
- 拿掉懲罰性步數限制（20→40、上限 100）；**達上限改合成最終答案、不再直接失敗**（「找美食 20 步失敗」不再發生）。
- 規劃器免費模型先跑、沒回有效 JSON 才升級強模型；全走系統金鑰、不分特權。

### 📐 引擎設計文件 ✅
- `docs/agent_island_plan.md §9`：「什麼任務都能完成的引擎」完整回答（六支柱＋L1–L5 分級路線＋再升級方向）。先做 **L1 拆解引擎 + L2 真瀏覽器/沙盒** 投報最高。

---

## 🏝️ 機會島（開新島、V1→V2 已上線）
### ~~V1 競賽雷達最小閉環~~ ✅（migration 已上線）
- schema `opportunities`（泛化十層 type）+ `opportunity_routes`（我的航線）。
- 8 個競賽種子（只取機會島.md 明確資料、全標 **unverified 待核實**、不捏造）。
- `/opportunities` 瀏覽＋搜尋＋類別/免費/開放篩選；`/opportunities/[id]` 詳情；`/opportunities/routes` 我的航線（收藏＋投件進度＋截止倒數）。
- nav「機會島」入口（四語）；agent `opportunity.search` 工具 → 分身↔機會島閉環。
- RWD 390/1440 皆 0 溢出。

### ~~V2 AI 推薦~~ ✅
- `/api/opportunities/recommend`：描述你的狀況 → AI 從開放機會挑 3-5 個、附符合率＋原因（免費模型優先、不耗使用者額度）。

### 機會島 V3–V5（規劃見 opportunity_island_spec.md §10）
- V3 陪跑（作品分析 GitHub/PDF/PitchDeck、成熟度、模擬評審、AI 生成）、V4 多聞雷達爬蟲、V5 擴十層＋Team/Enterprise —— 屬大工程、需真實資料來源與人工覆核鏈，下階段做。

## 🚧 Agent 後續（規劃見 docs/agent_island_plan.md、agent_memory_plan.md）
- 林董定調：agent「像玩具都不如」，核心缺口＝**對話延續＋跨對話記憶**，且要做到**別的 claw agent 做不到的事**。
- 已寫規格 `docs/agent_memory_plan.md`（thread 分組、跨對話長期記憶、能力圖譜、差異化護城河）。**另開場次實作**，不併進本次 bug 修復。

## 📌 待辦（延續）
- [ ] Agent 對話延續大工程（依 `docs/agent_memory_plan.md`）。
- [ ] 機會島（Opportunity Island）產品規劃：先出 V1 spec（找到適合的免費競賽 + 我的航線 + 截止提醒），爬蟲/全自動雷達留後段。
- [ ] 留言編輯目前涵蓋「回覆/留言」；討論串**主文**與其他區塊（如創作島社群貼文）編輯之後視需要再補。

---

## 🔧 Agent 搜尋效率大修（「爬一堆結果只出一條 + 浪費 API」）
林董實測「找台北車站美食」：跑 ~20 個工具呼叫（8× web.search、6× web.fetch、4× web.research）、一半撞 captcha/cloudflare、**Brave 一個任務就吃掉 12 次額度**，最後只吐一張很薄的表。根因不是「爬不夠」，是**蒐集到的好資料（ifoodie 店名+地址+均價、隱家拉麵、PopDaily 地址價位、台鐵便當 60/80/100）在最終合成時被丟掉**（finalize 每步截 500 字 + maxTokens 1200 + ai.ask 被截斷）。

### 三個精準修（`orchestrator.ts`）
- **合成不再丟資料**：新 `stepEvidence()` 依工具型別抽「具體證據」——web.search 保留每筆 title+snippet、web.research 保留每個來源正文、web.fetch 保留正文；`isBlockedText()` 濾掉 captcha/cloudflare/驗證頁；重複沿用(repeated)不重複計。`finalizeFromHistory` 改吃這份證據（上限 14000 字）、maxTokens 1200→2600、系統詞強制「把每個具體店名/地址/價格帶進來、**只能用資料裡真有的、禁止編造**」。
- **查夠就收尾**：web 類工具（search/research/fetch/render）滿 **7 次硬上限** → 直接用手上資料合成、不再燒 API；planner 在查 ≥4 次時收到「資料夠了、這步直接 done 並整理完整答案、別再重複搜」的強提示。
- **這兩項一起**把單任務 web 呼叫從 ~18 壓到 ≤7，Brave 額度消耗直接砍一半以上。

### 省 Brave 額度：改「DDG 優先、Brave 備援」（`tools.ts`）
- 林董提醒 Brave 免費 2000 次/月「一下就沒」。原本 `searchLinks` **Brave 優先** → 每次搜尋都吃額度。改成**先用免費 DDG 爬蟲，DDG 被擋/太少(<3 筆)才動用 Brave**。Brave 只在免費爬蟲失敗時才花 → 2000 次能撐更久。web.fetch / web.research 抓內文本來就是**直接爬網頁、不吃搜尋額度**（只有初始找連結那步才用到搜尋）。
- 驗證：tsc 0、vitest 122 綠、next build 0。

### L2 真瀏覽器 `browser.render`（server Playwright，優雅降級）
- 加了用真瀏覽器（headless Chromium）打開會擋 bot / 需跑 JS 的頁；`import("playwright")` 在無 Chromium 的 standalone Docker 會 throw→catch→回清楚錯誤（prod 目前降級為「尚未就緒」，不會壞部署）。實測 tripadvisor 仍回空頁（企業級反爬連真瀏覽器都擋，需 stealth+代理，屬鑽牛角尖、不追）。Docker 裝 Chromium 屬高風險改動、待林董確認後再小心弄。

### 🐛 修「結果好亂」（reasoning 草稿被當答案）+ 加 Google 搜尋
- 上一版把合成 maxTokens 拉高後，強模型（reasoning 型）把**思考過程**（"The user wants..."/"Source 1"/"Category 1"…）當最終答案吐出、還吃光 token 沒寫完清單 → 畫面一團亂。
- `orchestrator.ts`：新 `looksLikeReasoning()` + `sanitizeAnswer()`（去 `<think>`、去 code fence、思考開頭有真標題就從標題起取）。`finalizeFromHistory` 系統詞明令「第一行就是答案、嚴禁思考過程」，並在強模型吐草稿/太短時**自動改用聽話的 Haiku 乾淨重產一次**。planNext 的 prose fallback 也改成：像思考草稿就回 null → 交給乾淨的 finalize。done 的 summary 也過 sanitize。
- `tools.ts`：加 `googleSearch()`（Google Programmable Search JSON API，每日 100 次免費、可 BYOK：env `GOOGLE_CSE_KEY`+`GOOGLE_CSE_CX`，或使用者 `user_api_keys` provider=`google_cse`、cx 放 metadata）。`searchLinks` 升級三級免費優先：**DDG(免費爬蟲)→Google(100/日)→Brave(2000/月)**，付費/有額度來源只在前一級失敗才用。
- 驗證：tsc 0、vitest 122 綠、next build 0。

### 🔁 Google CSE 全網搜尋被 Google 淘汰 → 改接 Tavily + BYOK UI
- 林董去建 Programmable Search Engine，設定頁「搜尋整個網路」開關顯示「這項功能即將淘汰，無法再啟用」→ 新建的 CSE **只能搜自己列的網站、無法當全網搜尋用**。原本接的 googleSearch 會用林董自己站的少量結果**蓋掉 Brave**（污染）→ 移除。
- 改接 **Tavily**（AI agent 專用全網搜尋 API、1000 次/月免費、回乾淨內容）：`tools.ts` `tavilySearch()`（env `TAVILY_API_KEY` 或 `user_api_keys` provider=`tavily`；沒 key 就跳過）。`searchLinks` 三級免費優先改為 **DDG→Tavily→Brave**。
- `AgentClient.tsx`：新增「搜尋金鑰（Tavily）」BYOK 卡（跟 Brave 卡同款，綠色）——使用者可自貼 key、AES-256-GCM 加密存 `user_api_keys`、可移除。
- `.env.local` 的 `GOOGLE_CSE_*` 已無用（可留可刪）；要 Tavily 就加 `TAVILY_API_KEY`（可選，不加也能靠 DDG+Brave 全網搜）。
- 驗證：tsc 0、vitest 122 綠、next build 0。

### 🧪 Tavily 實測：對中文幾乎 0 結果 → 中文查詢自動跳過 + 申請教學
- 用林董的 key 實測：英文查詢正常回 5 筆；**中文查詢（含「台積電」）一律 0 筆** → Tavily 索引英文為主、對 zh-TW 幾乎沒用。
- `tools.ts` `searchLinks`：查詢含中日韓字元 → **跳過 Tavily**（免中文查詢空跑白吃 credit + 拖時間），直接 DDG→Brave；非中文才 DDG→Tavily→Brave。
- `AgentClient.tsx`：Brave/Tavily 兩張 BYOK 卡各加「▸ 如何免費申請」步驟教學（帶使用者註冊）。Brave 標「中文好、推薦先辦」；Tavily 標「英文/國際為主」。
- 驗證：tsc 0、next build 0。

### 🗝️ 統一使用者 API 金鑰到 /settings/ai-keys + 分身島技能商店 v2
- 林董定調：整個 AI 島（分身島搜尋 key、創作者島、機會島、AI 模型 key）所有使用者 API **匯集到 `/settings/ai-keys` 統一管理**。查證：本來就同一張表 `user_api_keys`＋同一支 `/api/user/ai-keys`，分身島貼的 Brave/Tavily 早已存進同處、也會列在該頁。缺口＝`brave/tavily` 不是註冊 provider（顯示原始名、無法從該頁新增）。
  - `ai-key-test.ts`：`BYOK_PROVIDERS` 加 `brave`/`tavily`（標 `kind:"search"`，附申請連結/格式提示），既有 6 家標 `kind:"llm"`；`testProviderKey` 加 Brave/Tavily 測 key。
  - `AIKeysClient.tsx`：搜尋類 key 顯示「供分身島 Agent 上網搜尋」而非「解鎖模型」。→ 現在該頁可**新增/測試/開關/刪除**搜尋 key，與 AI 模型 key 並列。
- **技能商店 v2**（`agent_skills_catalog_v2_migration.sql`，已上 prod、內建 45→62）：
  - 新增 11 支「會自己搜尋」技能：找店找地方🍜、主題深研員🔬、市場調查員📊、比價找優惠🏷️、旅遊行程規劃🧳、每日簡報員📰、競賽獵人🏆(接機會島)、我的學習教練🧭(接 island.myProfile)、站內找課🔖、計算小幫手🧮、動態頁擷取員🕸️(browser.render)。
  - 升級 12 支舊研究技能（rival-scan/fact-check/news-brief/trend-watch/interview-prep/pkg-scout/doc-finder/tech-compare/study-planner/term-tutor/career-coach/web-digest）：從「只吃使用者貼的網址」→ 加 web.search+web.research 自己找來源。
- 驗證：tsc 0、vitest 122 綠、next build 0、migration ✅。

### 🧬 L4 技能合成（任務 → 存成可重用技能）✅
- 完成的任務結果卡新增「存成技能」鈕 → `POST /api/agent/skills/synthesize`：讀該任務 goal/plan/實際用過的工具/結果摘要，用 AI 蒸餾成**一般化**的技能草稿（把「找台北車站美食」抽象成「找某地點附近美食並整理地址/價格/來源」），allowed_tools = 實際用過的工具。
- 回草稿 → 開「建 AI 員工」視窗**預填**、使用者確認/微調後存下（沿用既有 POST /api/agent/skills 建立流程）。Agent 越用越強、把好用的做法留下來。
- 驗證：tsc 0、next build 0。

### 🤖 L5 平行多代理（子任務並行 → 彙整）✅
- `orchestrator.ts`：夠大的純研究任務（decompose 出 ≥3 個可獨立子任務、非技能限定、無外掛工具）→ 派多個 `runSubAgent` **同時**去查（唯讀工具白名單、無審批、無裝置、各自 ≤4 web 呼叫），再 `mergeSubResults` 用強模型合併成完整、去重的最終答案。比一步步序列跑快很多。
- 安全：子代理只給 READONLY_TOOLS（risk=read 且非裝置）；彙整失敗會清掉平行 step、落回原序列流程。
- 驗證：tsc 0、vitest 122 綠、next build 0。

### 🧭 L2 伺服器瀏覽器 Docker（選配、預設關、零風險）✅（程式面）
- `browser.render` 加 `ENABLE_SERVER_BROWSER` 開關：沒設就明講「未啟用、改用 web.research/web.fetch 或桌面助手」，不讓 agent 卡住。
- `Dockerfile` 加**選配** build arg `INSTALL_SERVER_BROWSER`：**預設不設＝整段跳過、image 與部署跟以前一模一樣、零風險**。要開才裝 Chromium（playwright@1.58.2 對齊本機 + `--with-deps` + `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`，root 裝好 chown 給 nextjs 唯讀取用）。
- **啟用步驟（要盯部署）**：Zeabur 服務設 build arg `INSTALL_SERVER_BROWSER=1` + runtime env `ENABLE_SERVER_BROWSER=1` → 重新 build 觀察 log 成功再用。要關就移除兩者。
- 誠實提醒：企業級反爬（tripadvisor/yelp）連真 headless 都擋；桌面助手 browser.* 已能在使用者電腦上開瀏覽器，server 版屬補充。
- 驗證：tsc 0、next build 0（預設路徑）。
