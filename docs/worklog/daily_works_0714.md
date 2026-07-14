# 工作日誌 2026-07-14 — 辭典續批 + 機會核對 + 首頁改版啟動

> 待辦統一 `docs/todo/todo_list_0713.md`；首頁主視覺生成清單 `index-img.md`。

## 今日完成（已上線 / 已 push）
1. **程式辭典續寫**：第 34 批（資料科學/產品分析/AI 安全，42 條）+ 第 35 批（Go/Rust/JVM/C#/C++ 語言專屬 + 底層連結，46 條）→ **1557 → 1645 條**（DB 實測 count）。
2. **DIGITAL+ 數位服務創新補助**：查證官網——115 年度（2026）已於 5/18 截止、尚未開下一梯；整理文件清單 + 時程 + 現在該做 3 件事回覆林董（無對外動作）。
3. **機會島資料核對**：`2026 臺灣數創大賞` 官網原本錯指新聞頁 → 更正為官方站 `iec2026.thu.edu.tw`，並補主辦/報名期程(5/20–7/22)/資格(在學學生)/`source_confidence=verified`。

## 首頁改版（Hybrid 方向，進行中）
- 林董回饋：首頁**太俗太亂、圖不符 AI 島風格、hover/active 呆板、要參賽級**。確認方向＝**Hybrid**（俐落高級 Hero + 下方精簡品牌樂趣）。
- ✅ **`index-img.md`**：13 張 text-free 主視覺生成清單（共用風格區塊 + 負面提示 + 角色設定表 + 尺寸/去背/落點），林董用 GPT 生、Claude 接。核心：**不燒文字進圖**（現有圖燒字＝顯俗主因）。
- ✅ **Hero.tsx 重做**：拿掉 6 張彩虹漸層卡 + emoji 圖示 → 統一品牌三色、Lucide 圖示晶片、中性 surface 卡、大字排版 + 留白、主/次 CTA、模式卡一致化、平順 hover（浮起 + 圖示微轉 + CTA 位移）+ framer-motion 進場。全用 CSS token → **亮暗自動切**。
- ✅ **主視覺換實景**：林董生成的無字 16:9 漂浮 AI 島 → Hero 背景（暗色遮罩 + 白字疊層、亮暗都維持電影感暗帶）；`public/home/hero-island.png`。
- ✅ **連續世界 2.5D 骨架**（`components/home/parallax.tsx` + `world.tsx`）：
  - `Reveal`（滾動淡入）/`ParallaxLayer`（錯速位移景深）/`StarField`（遠白星+近品牌色光塵），全尊重 reduced-motion。
  - `WorldZone`：日→夜固定色背景（黃昏紫→深夜黑）+ 星空景深 + 底部無縫銜接回主題頁；包住 Hero+StageMap。
  - `ParallaxScene`：可重用多圖層視差場景（新圖層 push 進 `layers` 即接入，#6 抽換介面）。
  - `WorldMap`：互動關卡地圖，**節點＝純資料、與圖片解耦**（島名/進度/鎖定/目前章節/點擊全 HTML 驅動）；沒底圖時 SVG 地形降級；底圖可之後抽換 GPT 生的 text-free 地圖。
- ✅ **StageMap 重做**：6 關卡→資料驅動互動節點（可點進該關、狀態化）＋保留文字詳情玻璃卡（SEO/a11y）；`page.tsx` 重排成 Hero→StageMap 相鄰、共處 WorldZone。
- ✅ **元件霧面玻璃**：模式卡/詳情卡改 `.surface-glass`。
- ✅ **StageMap 真實數據**：章數改由 DB 真實資料算（全站 80 章：六大關卡 69 + 速查附錄 11），不再寫死。
- ✅ **接 GPT 路徑層**：`hero-layer-04-path`(alpha) → `stage-path.png` 當地圖底圖，6 節點對齊路點；`WorldMap` 支援底圖/aspect/contain、有路徑不畫 HTML 連線。
- ✅ **淺色模式修正**：世界背景 `.world-zone-bg`/`.hero-bottom-seam` 改隨主題日/夜切（暗=黃昏→深夜、亮=白天天空），星空只夜晚顯示；StageMap/WorldMap 文字改主題 token（淺色不再看不到字）。
- ✅ **Hero 日/夜雙圖**：接 GPT `hero-island-dark`(夜)/`hero-island-light`(日) 同構圖 → `.img-night`/`.img-day` 隨 `[data-theme]` 切；淺色 Hero 是白天島嶼、不再黑。
- ✅ **nav 霧面玻璃**：TopNav＋抽屜改半透明 backdrop-blur。
- ✅ **圖層規格文件**：`index-img.md` 正式化 Stage Map 五層 2.5D 素材規格（`stage-layer-*`、除天空全透明 PNG、五層需同尺寸對齊）、封印舊單張地圖。
- ⬜ 續做：**同尺寸五層** → ParallaxScene 完整 2.5D 場景；副本+魔王；夜景 CTA；吉祥物三角色卡；WorldMap 接真實進度；玻璃外溢其他頁。
- ✅ **手機底部 nav 擋住法律連結修正**：footer 加 `pb-[calc(2rem+3.5rem+env(safe-area-inset-bottom))] md:pb-8` → 隱私權/使用條款/Cookie 在手機不再被 `MobileBottomNav`(h-14 fixed) 蓋住；桌面不變。法律路由 /privacy /terms /cookies build 通過。
- ✅ **全站深/淺色切換稽核 + 修**：subagent 掃全站，實際 offender 6 處（其餘 text-white/black 多在 accent 按鈕/暗圖上＝刻意）。已修：`/quest`(補 root 暗底、arcade 固定暗)、`EloProgress`(萌新/熟手段位字改 `text-gray/slate-500 dark:300`)、`SkillRadar`(PolarGrid 改 `var(--color-border)`)、`LearningDashboard`(Recharts tooltip/grid/axis 硬色改 token)、`ResourceCard`(github chip)、`leaderboard`(銀牌 icon)。MeHero/MeSidebar 本來就 token 化＝OK。
- ✅ **`/agent` 輸入框重排**：textarea 改整整一欄、語音＋執行移到輸入框下面（手機不再擠）。
- ✅ **淺色模式「整片背景黑掉」真因（林董 203.jpg）**：`/me/layout.tsx` 用 `backgroundCss(profile.background)` inline style 套「學員自訂背景」，`BG_PRESETS` **全深色漸層且無視主題** → 淺色整頁黑、側欄深字看不到。修：`.me-page-bg` + `html[data-theme=light] .me-page-bg{background:transparent!important}` → 深色自訂背景**只在深色主題套**。**這是 runtime inline style、非靜態 class → 前一次掃描漏抓**（教訓：別只掃 class）。
- ✅ **MeHero 加實心底**（半透明 `from-accent/10` → `bg-bg-card` + 裝飾疊層）。
- ✅ **第二輪嚴格稽核修**：`bg-accent text-white`→`text-black`(store×3/store result/connections/chapters 解鎖鈕)、leaderboard 兩處 `bg-clip-text` 加淺色 fallback、`world.tsx` 星座連線 stroke 改 token、DictHero 加實心底。
- ⬜ latent 待續：~14 張半透明漸層卡缺實心 base（NextLesson/ResumeCTA/career/PaywallOverlay…）逐一補 `bg-bg-card`（目前可讀、非破版）。
- ✅ **Agent 任務 cloudflare 401 失敗修**：`resolve-usage-ai.ts` 的 `isQuotaOrTransient` 補 **401/authentication/invalid key** → 某免費 provider(如 Cloudflare Workers AI)金鑰失效時**自動換下一家**、不再一個壞金鑰弄死整個任務。（林董另需去 `/admin/ai/models` 修/停用壞掉的 Cloudflare 金鑰）
- 🚨 收尾檢查：本批多次 `tsc --noEmit`✓ / `vitest` 137✓ / `next build` exit0✓；純前端無 migration；未動 .env.local。

## 🟢 分身島×機會島「快速 5 件」一次清（0714 深夜）
1. ~~**適合度規則引擎接前台**：`opportunity-radar` cron 尾段用 `scoreOpportunity` 重算所有 open/upcoming → 寫 `ai_island_fit_score`（每日跑保新鮮）。下次 cron 觸發就填值。~~
2. ~~**每日主動推播 3 件事**：新 `/api/cron/daily-brief`（CRON_SECRET 保護、maxDuration 120）→ 掃綁 LINE+未關偏好者 → `buildDailyBrief` → `notifyUserLine(category:agent)`。**需林董加 cron job #10（每天早上一次）**。~~
3. ~~**從歷史學習**：確認 `launch.ts` 已用 pgvector RAG 撈相似**成功**任務（`match_agent_tasks` status=succeeded）當 priorContext = 已完成。~~
4. ~~**AI 能源中心 UI**：`/me/energy` 頁 + `EnergyCenter` 元件 + `/api/me/energy`（今日免費額度進度條/Z 幣/今日+本月分身任務/成功率/最常用技能）；MeSidebar 加 🔋 入口。全 read-only、用既有表（ai_daily_quota/agent_tasks/profiles）。~~
5. ~~**#209 Agent 記憶收尾**：`priorContext=[memoryBlock,turnsBlock,ragBlock]` 全接進 planner + orchestrator 回合寫記憶 → 記憶功能具備、關閉。~~
- **DB 欄位核對**（`node` 實跑）：`ai_daily_quota`/`agent_tasks(skill_id)`/`profiles(line_*, z_coin)`/`opportunities(ai_island_fit_score)` 全部存在 ✅。
- 收尾：`tsc`✓ `vitest 137`✓ `next build`✓；新路由 `/me/energy`、`/api/me/energy`、`/api/cron/daily-brief` 都 build 出來。無 migration。

## 🚨 收尾檢查清單（鐵規則）
1. **API / DB / 資料表**：辭典 import 冪等 upsert（DB count 1645 已驗）；機會島更新用 service role update 已回傳確認；本次首頁純前端、無 migration。
2. **UI 接對**：Hero 模式連結指向既有路由（/chapters /quest /agent /opportunities /creator-island /island），沿用既有 i18n key。
3. **RWD**：Hero grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`、文案 `text-center lg:text-left`、圖 `max-w-md lg:max-w-none`；窄屏不溢出。
4. **桌面版**：`max-w-6xl` 置中、留白加大。
5. **PWA**：未動 manifest/sw。
6. **建置**：`tsc --noEmit` ✓、`vitest run` 137 passed ✓、`next build` exit 0 ✓。
7. 先更新本日誌 → 再 commit/push。
8. **機密**：未動 .env.local。

## 🧩 分身島多模式 + 產出一鍵下載真檔（0714 續）
- ✅ **分身島多模式**（`AgentClient.tsx`）：輸入框上加模式切換列 🤖分身任務／💬問問／💻寫程式／📄文件／📊簡報／📈表格／🎨設計。做法＝`AGENT_MODES` 每個模式一段導向前綴(prefix)＋專屬 placeholder，`withMode()` 把輸入包上前綴丟同一套任務引擎；🤖 無前綴＝原行為。執行鈕文案依模式(執行/送出)。零新 API、零 migration。
- ✅ **分身產出一鍵下載真檔**：新 `POST /api/agent/export`（runtime nodejs）把 markdown 產出轉**真的 Office 檔**：
  - docx → `docx`（標題/H1-H6/項目/編號清單；自訂 numbering config）
  - pptx → `pptxgenjs`（`---` 或 H1/H2 分頁＋封面＋每頁標題+bullet+紫線；`write({outputType:'nodebuffer'})`）
  - xlsx → `exceljs`（`extractTables()` 抓 markdown 表格→每表一工作表、表頭上色+自動欄寬；無表則逐行）
  - 回傳 `Content-Disposition: attachment; filename*=UTF-8''…`、`Cache-Control: no-store`。
  - 前端：結果卡加 Word/PPT/Excel 三鈕 → `exportAs()` fetch→blob→`<a download>`；標題取自 goal（去掉模式前綴）。
  - **本機實測三格式都產出有效檔**（docx 8.6K／pptx 45K／xlsx 6.5K bytes）。依賴新增 `docx pptxgenjs exceljs`。
- ✅ **設計模式 = HTML/CSS/SVG 雛形**（可直接用）；真 AI 生圖需付費 API、標 todo「之後另評估」、本批不做。
- ✅ **確認辦公室員工詳情+上下線+放養**（林董重貼）早先 commit `921c0469` 已上線：員工卡在職/放養中/下線狀態、🦞放養＝派讀取型瀏覽任務→回來匯報；對外留言紅線保留（AI 起草→批准才發）。
- ✅ **RWD**：結果卡 header 改 `flex-wrap justify-end` → 存成技能+Word/PPT/Excel+複製 在窄屏自動換行不溢出；桌面同列。
- 🚨 收尾：`tsc --noEmit`✓ / `vitest run` 137✓ / `next build` exit0✓（`/api/agent/export` 有出現在路由表）。export 純計算+讀 auth、**無 migration**；未動 .env.local / PWA。commit `a4afa041`(export)、`ac32715b`(多模式)、`e7781353`(todo)。

## 🐛 開工修 4 隻 bug（0715 早）
- ✅ **代理回覆斷掉 / 顯示整包 raw JSON（214+216+217）**：根因＝done 的產出型 summary 很長 → `planNext` maxTokens 900 把 JSON **截斷** → 收不了尾、`JSON.parse` 掛 → 退回把整包 raw JSON 當 summary 顯示（畫面出現 `{"thought":...,"done":true,...}` 且內容斷）。修：
  - `parseDecision` JSON.parse 失敗時容錯抽 summary、**支援被截斷**（沒收尾引號/`}`）、unescape `\n`。
  - **完成守門**：summary 若仍是 raw decision JSON / 思考草稿 / 空 → 改用 `finalizeFromHistory` 乾淨重產。
  - `planNext` maxTokens 900→3000（強模型 1200→3500）讓完整答案不被截；子代理 done 也套 `looksLikeRawDecisionJson` 守門。
  - 本機測 truncated/complete/unescaped/tool 四種 parse case 全過。commit `91d9b985`。
- ✅ **討論區/部落格留言 @提及標記（215）**：新 `MentionTextarea`（純 textarea 版 @自動完成：打 @字→`/api/mentions` 搜人→↑↓/Enter 選）；`resolveMentions` 送出前把 @顯示名 換成 token `[[user:uuid|label]]`（email 等不誤傷、本機測 4 case 過）；顯示端渲染成可點 @連結（跳用戶頁）；forum + blog 兩處 POST 都解析 token→`pushUserNotif` 通知被 tag 的人（排除自己/已通知串主，上限10）。commit `0b8aa4e7` + blog 這批。
- 🚨 收尾：`tsc`✓ `vitest 137`✓ `next build` exit0✓；`/api/mentions` 既有、通知走既有 `notifications` 表(kind=comment、free TEXT 無 CHECK)、**無 migration**；未動 .env.local。
- 🆕 記錄兩個新想法到 todo：首頁沉浸式滾動(scroll-world 參考)、部落格留言 @提及（本批已一起做）。

## 📸 社群圖片：一次 20 張 + IG 風輪播（0715）
- ✅ **創作者社群留言 @提及**：SocialFeed 留言框接 MentionTextarea、renderBody 渲染 @token、POST 通知被 tag 的人。（commit 5a5f46a9）
- ✅ **社群發文一次上傳最多 20 張**：圖片 input 加 `multiple`、`attachImages` 並行上傳並 cap 20、縮圖可移除、顯示 N/20；`createPost` 也 `slice(0,20)` 保底。（其他上傳點多為單張＝頭像/背景/限動/聊天附件，20 張不適用。AI 導師/聊天的 5 張是**視覺模型上限**、刻意不動。）
- ✅ **IG 風圖片輪播 `ImageCarousel`**：手機左右滑(scroll-snap snap-center)、桌面 hover 箭頭、右上 N/N 計數、底部圓點；單張直接顯示。社群 feed + 單篇貼文頁都換上。用 `no-scrollbar`+inline overflowX 避開全站 overflow scrollbar 樣式。
- 🚨 收尾：`tsc`✓ `next build` exit0✓；`ci_posts.images` 是 jsonb 陣列、無 migration；未動 .env.local。commit 867c267b。
- ⏸ **首頁沉浸式滾動（scroll-world）**：已研究其技法＝滾動洗刷「預渲染影片」的鏡頭穿越（需付費 AI 生影片素材，我們沒有）。可行替代＝用我們現有圖層做 scroll-scrubbed transform 穿越（sticky pin + useScroll 驅動景深/縮放/淡入）。**林董中途插了社群圖片需求、這項先排回佇列**、下次接著做。

## 🚀 首頁沉浸滾動 + @提及升級 + 每日上限（0715 續，autonomous）
- ✅ **首頁沉浸式滾動穿越 Hero**（`Hero.tsx`）：高軌道(175/210vh)+`sticky` 舞台，`useScroll` 進度驅動——島圖縮放(1→1.45)/上移、遠近星層錯速景深、暗罩加深、文案淡出上移→尾段浮現「進入 AI 島」+向下捲動提示。全程尊重 `prefers-reduced-motion`(退化成靜態、transform 皆常數、`min-h` 保底)。純現有素材(hero 日/夜圖+星層)，GPT 交五層對齊素材後可再升級。commit 177c9c9b。
  - ⚠️ **待林董目視**：build+SSR 都綠(HTTP200、無 error page、mode 卡/StageMap/星層都在)，但本機 Chrome 擴充沒連上、沒能截圖實際捲動效果。桌機/手機請掃一眼捲動順不順、有無破版。
- ✅ **index-img.md 更新**：加「首頁沉浸式滾動穿越素材規格」——免費圖層 transform 做法說明 + 五層對齊列為**第一優先**(一套素材餵 StageMap+沉浸滾動兩用) + 可選 `scroll-scene-01~03` 段落錨點。commit adc94ffa。
- ✅ **@提及升級**：① 接 LINE 推播（`notifyMention` 共用助手＝in-app 鈴鐺 + LINE flex，討論區/部落格/社群統一）② 編輯留言也支援 @自動完成（討論區/部落格編輯框改 MentionTextarea）。commit c51e4a0e。
- ✅ **創作者社群留言 @提及 + 20 圖 + IG 輪播**（見上批 5a5f46a9 / 867c267b）。
- ✅ **每使用者每日任務上限**（`launchAgentTask`）：fail-open 上限(預設80、`AGENT_DAILY_TASK_CAP` 可調)，admin/owner 免、排程 `skipDailyCap` 不計；查詢出錯一律放行。省 token 第一步。commit 2caeafca。
- 🚨 收尾：全部 `tsc`✓ `vitest 137`✓ `next build` exit0✓；除社群輪播無新 migration；未動 .env.local。
- 📌 記：`po-once.com`＝社群發布中心的參考藍圖(一次發文→同步所有平台)、寫進 todo。
