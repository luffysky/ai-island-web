# AI 島待辦總表（2026-07-15 · 現行主檔）

> 本檔＝目前**未完成**待辦主檔。0714 及更早的完成劃線見 `todo_list_0714.md` / `todo_list_0713.md`（不刪、當歷史）。
> 圖例：⬜ 未做 · 🚧 進行中（部分完成）· 🔴 需林董本人操作 · 🆕 新想法/參考 · ＊ 原則/約束。
> **完成的用刪除線標記、不要刪。** 狀態依實際程式碼核對（文件常落後）。

---

## 🅰 需要林董本人操作 🔴（卡在這、做完就能解鎖一票功能）
- 🔴 **首頁沉浸式滾動——目視驗收**：桌機＋手機各掃一眼首頁捲動（Hero 鏡頭飛入），順不順、有沒有破版。（Claude 這邊 Chrome 擴充沒連上、只驗到 SSR/build 綠，沒法截圖）
- 🔴 **cron-job.org 加 job #10「daily-brief」**（每天早上一次，如 08:30）：`GET https://ai-island-web.snowrealm.pet/api/cron/daily-brief?secret=<CRON_SECRET>` → 每天推「3 件事」到有綁 LINE 的人。
- 🔴 **Zeabur 設 `ENABLE_SERVER_BROWSER=1`**：L2 伺服器瀏覽器啟用（image 已裝 Chromium，沒這 env=不啟用）；設完 Restart，盯 RAM。
- 🔴 **機會雷達來源審核**：`/admin/opportunities/sources` 定期審待審佇列（核准才上線）＋ 加你信任的官方 RSS/Atom。
- 🔴 **機會資料覆核**：unverified → 人工核實截止/獎金改 verified（已示範核對臺灣數創大賞）。
- 🔴 **通路帳號/審核**（社群發布 & bot 的前置）：TG BotFather token、Discord bot token、Meta App(FB/IG/Threads 審核)、X 開發者(多付費)、YT/抖音 開發者帳號+App 審核（需本人身分/商業帳號）。LINE Messaging API 已可用。
- 🔴 **搜尋金鑰加量**：Brave/Tavily 要更多量 → 各官網申請 key 貼 `/settings/ai-keys`（教學已內建）。
- 🔴 **生圖素材**（首頁要更精緻就靠這個，見 `index-img.md`）：① **五層 stage-layer 對齊版**（sky 不透明、02–05 透明、全部同畫布尺寸如 1672×941）← 最優先、一交立刻接 ② 三隻角色去背卡 ③（可選）`scroll-scene-01~03` 沉浸穿越段落錨點 ④ 夜景 CTA、五個模式小圖。
- 🔴 **可選：`AGENT_DAILY_TASK_CAP` 調值**（每人每日分身任務上限，預設 80、admin 免、排程不計）；覺得太鬆/太緊再改 env。

---

## 〇、首頁改版 / 全站 UI
- ⬜ **完整 5 層視差場景**：等 GPT 交**同尺寸對齊**的五層（`stage-layer-01~05`，現 sky 16:9 vs 層 3:2 會歪）→ `ParallaxScene` 疊成真 2.5D。規格見 `index-img.md`。**這套五層同時餵 StageMap 互動地圖＋首頁沉浸滾動穿越（一套素材兩用）。**
- ⬜ **沉浸式滾動穿越升級**：Hero 已做免費圖層 transform 版（釘住鏡頭飛入、reduced-motion 安全）；等五層對齊素材到位可再加景深，或加 `scroll-scene` 段落錨點做「外景→飛近→進核心」段落感。
- ⬜ **各區塊重做**：吉祥物介紹（三張去背角色卡，等 char 圖）、副本＋魔王整併一區、精選章節、生涯路徑 — 逐區美化、去燒字舊圖。
- ⬜ **WorldMap 接真實進度**：使用者完成度餵進 `stateFor()` → 自動算 done/current/locked。
- ⬜ **玻璃/動效外溢**：把同套卡片/玻璃/動效/間距鋪到章節/分身島/機會島/辭典（一區一區換、每次驗亮暗+不破版）。
- 🆕 **手機 nav 展開透明度微調**：`TopNav.tsx` 手機展開選單那行目前 `bg-bg-card/80`(blur 65%)，感覺偏透；慢慢找合適數值(可試 /85~/92 或加深底+降 blur)，亮暗都要順。
- 🆕 **網頁風格參考**（林董 0715 貼，不一定要一樣）：https://github.com/VoltAgent/awesome-design-md — 各種網頁/設計風格 md 集。當「玻璃/動效外溢」「各區塊重做」時挑合口味的視覺語言參考；仍守我們品牌三色 + 亮暗 token + RWD。也見 `index-img.md`（沉浸滾動、scroll-world）、po-once（社群發布）。
- ＊ 參賽級門檻：破版/對比/RWD/動效都要過。

---

## 一、分身島（AI 員工 / 行動代理）
- ⬜ **設計＝AI 生真圖**：目前「🎨設計」出 HTML/CSS/SVG 雛形；真生圖（Midjourney 那種）需接**付費生圖 API**，之後另評估。
- ⬜ **L2 程式沙盒**：跑 Agent 產的程式碼（isolated-vm/容器、限時間/記憶體/網路）。（需先 🔴 `ENABLE_SERVER_BROWSER`）
- ⬜ **桌面助手升級**：Electron 自動更新、更多本機 Skills、Windows UIA、macOS、Tauri 正式版、端到端 Demo。
- ⬜ **TG bot 入口**（BotFather token、inline keyboard）。（需 🔴 token）
- ⬜ **Discord bot**（slash commands `/agent` `/opportunity`、DM、頻道貼每日機會）。（需 🔴 token）
- ⬜ **統一 Bridge**：LINE/TG/Discord 共用「訊息→建 task→回填」轉接層（LINE 已做）。
- 🚧 **社群媒體發布中心**（`/agent/social` MVP 骨架已做：撰稿/多平台勾選/排程/草稿＋連結狀態；`social_posts` 表＋CRUD）。**待接**：① 各平台發送 adapter（🟢 LINE/TG/Discord 先、🟡 Meta 系需 OAuth、🔴 抖音/小紅書/Dcard 無 API 只能手動貼）② 排程發布 cron ③ **私訊/DM 統一收件匣** ④ AI 起草→你批准→發。
  - 🆕 **參考 po-once.com**：「一次發文→同步所有平台」商業工具，當 `/agent/social` 的 UX 藍圖（一處撰稿、平台勾選、各平台預覽、排程）。我們差異＝「AI 起草→批准→發」+ 綁分身島。
- ⬜ **外部工具**：Gmail/Calendar/GitHub/Notion/Drive 當 Agent 工具（連結中心已做基礎，待各平台 OAuth 一鍵授權）。
- ⬜ **Credential Broker**（本機管密碼、Agent 只知有無）＋ L4 憑證/銀行/系統操作流程。
- 🚧 **省 token**（已完成：每日任務上限、省錢模式三檔）：待做 → Rule-filter 完整層、Agent 任務 Embedding RAG、**成本/ROI Dashboard**（per-user 用量記帳）。

---

## 二、社群 / 留言
- ⬜ **@提及後續**：@提及也可接**站內私訊**；社群/貼文本文（非留言）也支援 @；被 @ 的通知聚合（避免洗版）。
  - （已完成：討論區/部落格/社群留言 @自動完成＋可點連結＋通知＋LINE 推播＋編輯框 @自動完成。）

---

## 三、機會島（Opportunity Island）
- 🚧 **PDF 規則解析 → 版本比較**：PDF/網址解析已做（`rules-summary` 加 `url`、`unpdf`）。待做 → **版本比較**（存歷次規則版本、diff 出「改了哪裡：截止/獎金/資格變動」）。
- ⬜ **AI 作品分析升級**：已做網址/文字→能力圖譜（`/opportunities/analyze`）。待加 → **PDF/PitchDeck/商業計畫**專門解析（接 `unpdf`）、能力圖譜**直接對接匹配機會**（用 opportunityKeywords 自動撈 + fit 分數）。
- ⬜ **雷達 V4 擴充**（大型 cron 重構、建議林董在場監控時做）：API/sitemap/爬蟲來源、三層 hash 變動偵測、每欄原文證據+信心分、cron 分頻、Sentry 監控。
- ⬜ **AI 排程接 Calendar**（需 🔴 Google OAuth）、練習階梯（電梯簡報→10 分）、對手/缺點/歷屆評審分析。
- ⬜ **V5 十層機會全上線**（補助/獎學金/VC/徵件/標案/工作/實習/海外/證照）＋ AI 配對組隊 ＋ AI 代報名（授權+守條款）。

---

## 四、內容 / 辭典 / 其他
- 🆕 **更新法律頁**：`/privacy`、`/terms`、`/cookies` 內容重新檢視更新（對齊現況：AI/BYOK 金鑰、分身島對外動作、連結外部帳號、LINE 推播、機會島資料來源、@提及通知、個資保存等）。
- 🚧 **程式辭典續寫到 5000**：現 **~1645 條**，從 `dictionary-seed-36.json` 接（一批約 40–48 條、author→`node scripts/import-dictionary.mjs`→commit）；新批次跑 `node scripts/translate-sync-all.mjs` 補 i18n。
- ⬜ **語言島**（英/日辭典，沿用 dictionary `domain='english'|'japanese'`）。
- 🚧 **AI 成本記帳 P2–P4**（P0 ✅、P1 創作者綠寶軟上限 ✅）：P2 語意快取推廣、P3 路由統一、P4 RAG/vision 擴充。詳 `docs/product/ai_upgrade_plan.md`。
- ⬜ 計畫書 ch2/ch6/ch7 + pitch-deck 對齊 `repositioning.md`；`PortfoliosClient.tsx` emoji picker；Z 幣 402 前端提示；島嶼刷幣 phase 2；E2E + Smoke tests；3D 島嶼降耗。

---

## 五、已完成大區塊（歷史索引）
見 `todo_list_0714.md`（0714–0715 大量完成：分身島多模式/一鍵下載真檔/辦公室員工詳情/放養/記憶 CRUD、@提及三處+LINE+編輯框、社群 20 圖 IG 輪播、首頁沉浸滾動、每日任務上限、省錢模式三檔、機會島 AI 作品分析、PDF 規則解析、agent 回覆截斷/raw JSON 修復…）與 `todo_list_0713.md`（引擎 L1–L5、搜尋、記憶、遙控、Approval、MCP/技能商店、機會島 V1–V4、LINE bot、辭典 21–35 批…）。
