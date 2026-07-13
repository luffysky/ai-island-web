# AI 島待辦總表（2026-07-14 · 現行主檔）

> 本檔＝目前**未完成**待辦主檔。完整歷史與已完成劃線見 `todo_list_0713.md`（不刪、當歷史）。
> 圖例：⬜ 未做 · 🚧 進行中 · 🔴 需林董本人操作 · ＊ 原則/約束 · ~~劃線~~＝已完成。
> **完成的用刪除線標記、不要刪。** 狀態依實際程式碼核對（文件常落後）。

---

## 〇、首頁改版 / 全站 UI（0714 大推進中）

### 今日已完成（已上線）
- ~~Hero 重做：品牌三色、去彩虹漸層/emoji、大字＋留白、模式卡一致化、平順 hover。~~
- ~~主視覺換 GPT 實景漂浮 AI 島，**日/夜隨主題自動切**（`hero-island-dark/light`）。~~
- ~~連續世界 2.5D 骨架：`WorldZone`(日→夜背景)＋`ParallaxLayer/ParallaxScene`(可抽換圖層)＋`Reveal`(滾動淡入)＋星空景深；Hero→StageMap 同世界無縫。全尊重 reduced-motion。~~
- ~~StageMap 互動活地圖：GPT 路徑層當底圖＋HTML 資料節點(可點/狀態化)；章數用真實資料(80 章)。~~
- ~~霧面玻璃：模式卡/關卡卡/nav＋抽屜。~~
- ~~淺色模式修正：世界背景/文字改隨主題日/夜、走 CSS token。~~

### 未完成
- ⬜ **完整 5 層視差場景**：等 GPT 交**同尺寸對齊**的五層（`stage-layer-01~05`，現 sky 16:9 vs 層 3:2 會歪）→ `ParallaxScene` 疊成真 2.5D（Hero 或關卡地圖擇一當展示）。規格見 `index-img.md`。
- ⬜ **各區塊重做**：吉祥物介紹（三張去背角色卡，等 char 圖）、副本＋魔王整併一區、精選章節、生涯路徑 — 逐區美化、去燒字舊圖。
- ⬜ **WorldMap 接真實進度**：使用者完成度餵進 `stateFor()` → 自動算 done/current/locked。
- ⬜ **玻璃/動效外溢**：把同套卡片/玻璃/動效/間距鋪到章節/分身島/機會島/辭典（一區一區換、每次驗亮暗+不破版）。
- ⬜ **其餘主視覺**：夜景 CTA、五個模式小圖、char 去背（`index-img.md` 清單）陸續生 → 接入。
- ＊ 參賽級門檻：破版/對比/RWD/動效都要過。

---

## 一、分身島（AI 員工 / 行動代理）
- ⬜ **L2 程式沙盒**：跑 Agent 產的程式碼（isolated-vm/容器、限時間/記憶體/網路）。
- ⬜ **從歷史學習**：成功的計畫/工具序列存起來、相似任務直接套（pgvector 記憶已有基礎）。
- ⬜ **每日主動推播**「今天值得做的 3 件事」（規則引擎已做，opt-in 免打擾推播待接）。
- ⬜ **桌面助手升級**：Electron 自動更新、更多本機 Skills、Windows UIA、macOS、Tauri 正式版、端到端 Demo。
- ⬜ **TG bot 入口**（BotFather token、inline keyboard）。
- ⬜ **Discord bot**（slash commands `/agent` `/opportunity`、DM、頻道貼每日機會）。
- ⬜ **統一 Bridge**：LINE/TG/Discord 共用「訊息→建 task→回填」轉接層（LINE 已做）。
- ⬜ **Outbound 社群發文**：YT/IG/Threads/抖音/FB/X（AI 起草→你批准→發、排程發布）。＊守紅線：對外一律先批准。
- ⬜ **外部工具**：Gmail/Calendar/GitHub/Notion/Drive 當 Agent 工具（連結中心已做基礎，待各平台 OAuth 一鍵授權）。
- ⬜ **Credential Broker**（本機管密碼、Agent 只知有無）＋ L4 憑證/銀行/系統操作流程。
- ⬜ **省 token**：Rule-filter 完整層、Agent 任務 Embedding RAG、每 Agent 每日 Budget 上限、成本/ROI Dashboard、省錢模式三檔。
- ⬜ **AI 能源中心 UI**（剩餘額度/今日消耗/最耗能員工/本月成本）。
- 🐛 #209 Agent 記憶：已由 thread+memory 解，待實測確認關閉。

---

## 二、機會島（Opportunity Island）
- ⬜ **AI 作品分析**（網站/GitHub/PDF/PitchDeck/商業計畫/履歷 → 能力圖譜）。
- ⬜ **PDF 規則解析** + 版本比較（詳情頁長 PDF 摘要）。
- ⬜ **適合度規則引擎接前台**（`ai_island_fit_score` 欄位已建、算分未接）。
- ⬜ **雷達 V4 擴充**：API/sitemap/爬蟲來源、三層 hash 變動偵測、每欄原文證據+信心分、cron 分頻、Sentry 監控。
- ⬜ **AI 排程接 Calendar**、練習階梯（電梯簡報→10 分）、對手/缺點/歷屆評審分析。
- ⬜ **V5 十層機會全上線**（補助/獎學金/VC/徵件/標案/工作/實習/海外/證照）＋ AI 配對組隊 ＋ AI 代報名（授權+守條款）。
- ⬜ **更多真實資料人工覆核**（見 §四 🔴）。

---

## 三、需要林董本人操作 🔴
- 🔴 **Zeabur 設 `ENABLE_SERVER_BROWSER=1`**：L2 伺服器瀏覽器啟用（image 已裝 Chromium，沒這 env=不啟用）；設完 Restart，盯 RAM。
- 🔴 **機會雷達**：`/admin/opportunities/sources` 定期審待審佇列（核准才上線）＋ 加你信任的官方 RSS/Atom。
- 🔴 **機會資料覆核**：unverified → 人工核實截止/獎金改 verified（今天已示範核對臺灣數創大賞）。
- 🔴 **通路帳號/審核**：TG BotFather token、Discord bot token、YT/IG/Threads/抖音 開發者帳號+App 審核（需本人身分/商業帳號）。（LINE Messaging API 已可用）
- 🔴 **搜尋金鑰**：Brave/Tavily 要更多量 → 各官網申請 key 貼 `/settings/ai-keys`（教學已內建）。

---

## 四、內容 / 辭典 / 其他
- 🚧 **程式辭典續寫到 5000**：現 **1645 條**，從 `dictionary-seed-36.json` 接（一批約 40–48 條、author→`node scripts/import-dictionary.mjs`→commit）；新批次跑 `node scripts/translate-sync-all.mjs` 補 i18n。
- ⬜ **語言島**（英/日辭典，沿用 dictionary `domain='english'|'japanese'`）。
- ⬜ **AI 成本記帳 P1–P4**（P0 已完成）：P1 創作者綠寶軟上限、P2 語意快取推廣、P3 路由統一、P4 RAG/vision 擴充。詳 `docs/product/ai_upgrade_plan.md`。
- ⬜ 計畫書 ch2/ch6/ch7 + pitch-deck 對齊 `repositioning.md`；`PortfoliosClient.tsx` emoji picker；Z 幣 402 前端提示；島嶼刷幣 phase 2；E2E + Smoke tests；3D 島嶼降耗。

---

## 五、已完成大區塊（歷史索引，詳見 todo_list_0713.md）
分身島引擎 L1–L5、搜尋大修、記憶(thread/memory/pgvector)、桌面/手機遙控、Approval Engine、MCP/技能商店、AI 員工辦公室+cron 排程、機會島 V1–V4 基礎、LINE bot inbound+批准+推播、通知中心、連結帳號中心、後台機會雷達、AI 成本 P0、程式辭典 21–35 批（+623 條）。
