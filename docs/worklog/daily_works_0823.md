# 工作日誌 · 2026-08-23

延續 0820 session 收尾後、林董指定「下一步候選」裡的**零風險/後台限定**兩軌繼續推進（需林董在線驗/授權的 §7.0.1 SEO 轉址、§7.6 作業批改、§2.3 social adapter、Coco v1、§6.8 gating 都**沒動**）。

---

## A. 辭典續寫 → 2508（+34）

基礎詞條漸稀，改攻「進階但常用」的兩個主題，續寫前先掃全部既有 slug 去重（2474 條零碰撞）：

- **seed 75 · React Hooks 深入 + TypeScript 進階型別（16 條 → 2490）**
  - Hooks：`useContext`/`useReducer`/`useLayoutEffect`/`useTransition`/`useDeferredValue`/`useImperativeHandle`/`useSyncExternalStore`（每條含「什麼時候用/什麼時候別用」）
  - TS 型別：`Record`/`Omit`/`Readonly`/`ReturnType`/`Parameters`/`Awaited`/`keyof`/`typeof`(型別層)/`infer`
- **seed 76 · 雲端服務 AWS/GCP（18 條 → 2508）**
  - AWS：S3/EC2/Lambda/RDS/DynamoDB/CloudFront/Route53/SQS/SNS/CloudWatch/ECS/EKS/Fargate/Secrets Manager
  - 概念：block storage（對比 object storage）
  - GCP：BigQuery/Cloud Run/Cloud Functions
  - 每條都點出「什麼時候用、代價/雷」（如 S3 公開設定=外洩經典事故、Lambda 冷啟動、DynamoDB 要先想好怎麼查）

`node scripts/import-dictionary.mjs` → **upsert 2508、失敗 0**。下一批從 `dictionary-seed-77.json` 接。

---

## B. 機會島雷達 §3.3.1 + §3.3.2（後台限定，動 radar cron）

原雷達只吃 curated 的 **RSS/Atom**；本次補齊 API/sitemap 來源與變動偵測，安全原則不變（只搬原文不生成、抓進來一律 pending 待人工核准、per-source 上限）。

### §3.3.1 API / sitemap 來源
- 新純函式模組 **`src/lib/opportunity-radar.ts`**（好測、零副作用）：
  - `parseSitemap(xml)`：抽 `<url><loc>`，也認 sitemap index（回傳子 sitemap 連結）；`sitemapEntryToItem` 把 URL slug 人可讀化當標題
  - `parseJsonApi(json, mapping)`：靠來源 `config` 的欄位對應（`itemsPath`/`titleField`/`urlField`/`summaryField`/`publishedField`）抽 items，對不到就跳過該筆、不猜
  - `parseSourceBody(kind, body, {apiMapping})`：依 kind 分派 rss/atom/sitemap/api
  - `normalizeUrl`：去 utm_/fbclid 等追蹤參數 + 結尾斜線 → 去重更準
- cron `opportunity-radar/route.ts`：`.in("kind", …)` 由 `["rss","atom"]` 擴到 `["rss","atom","api","sitemap"]`；api 會把 `config.headers` 併入請求（認證用）；sitemap 可用 `config.recentDays` 只收近 N 天更新的 URL 免灌爆佇列
- 後台 `RadarClient.tsx` 新增來源表單：解禁 api/sitemap 選項 + 動態 config JSON 欄位（api 前端驗 titleField/urlField 必填、附範例 placeholder）；`sources/route.ts` POST/PATCH 收 `config`（`sanitizeConfig`：只收純物件、限 4KB）

### §3.3.2 三層 hash 變動偵測（省頻寬、省人工審重複）
- **tier1 HTTP 條件式**：存來源上次 `http_etag`/`http_last_modified`，下次帶 `If-None-Match`/`If-Modified-Since`；來源回 **304 → 整支跳過**（連 body 都不下載），`last_status="unchanged (304)"`
- **tier2 body 雜湊**：下載 body 算 `sha256`，跟上次 `content_hash` 一樣 → **跳過解析**，`last_status="unchanged (hash)"`
- **tier3 逐項雜湊**：每筆算 `content_hash`(標題+摘要正規化)；同 URL 已在佇列且 hash 變了 → 更新原文 + 記 `content_changed_at`（不新增重複筆），後台待審卡顯示 **「內容變動」黃標**（hover 看變動時間）→ 為 §3.3.4 規則版本比較鋪基礎欄位
- migration **`supabase/opportunity_radar_v2_migration.sql`**（純加法 ADD COLUMN IF NOT EXISTS）：sources 加 `http_etag`/`http_last_modified`/`content_hash`/`config`；candidates 加 `content_hash`/`content_changed_at`。已跑 prod。
- 單元測試 **`opportunity-radar.test.ts` 17 支**（normalizeForHash/normalizeUrl/itemContentHash/parseSitemap〔含 index〕/parseJsonApi/parseSourceBody 各情境 + 壞輸入不炸）。

---

## C. 教具 §4.1.5 — 非程式大章鋪領域道具（ch13 SEO + ch59 一人公司）

### ch13 SEO + GEO 100% 覆蓋（非程式大章·領域道具首章）

林董「下一步候選」第三軌：**非程式大章鋪領域道具**。挑最大缺口的 SEO 章開刀（ch13 共 25 課、原 0 沙盒、僅 13.9/13.18 各 1 demo）。

- SEO 是純概念/判斷章、幾乎無可跑程式 → 全用 **scenario-judge / decision-quiz** 領域教具（符合「不是塞選擇題充數、要玩了就懂該章判斷」的定調）。
- 補 **23 個教具**（其餘 2 課本就有）→ 25 課 0 GAP：
  - **20 個 scenario-judge「SEO 好習慣還是雷」判官**：搜尋引擎運作(robots vs noindex)、搜尋意圖、on-page、technical(canonical/重複網址)、CWV、Schema(假評分紅線)、Pillar/Cluster(內容競食)、內外部連結、outreach、Local(NAP 一致/假據點紅線)、國際(hreflang)、GEO 認知與實作、內容更新(偽造新鮮度紅線)、SEO+UX、AI 時代變化、生產 SOP(批量 AI 文紅線)、心法——每題都標好習慣(ok)/有風險(risk)/違規(no)＋原因，黑帽手法明確標紅線。
  - **3 個 decision-quiz**：①關鍵字先攻長尾 vs 中量 vs 大詞（依站權重/目標）②工具選型 GSC→GA4→付費（免費優先）③接案月費 retainer vs 專案 vs「保證排第一」紅旗。
- `python inject_ch13.py`（冪等、依標題去重）→ added 23；node 驗證 25 課 0 GAP、所有 demo config 合法(correct 只用 ok/risk/no、quiz 有 questions+outcomes)。
- `node scripts/import_chapters_to_db.mjs ch13` → 1 章 25 課 0 error 同步 DB。

### ch59 一人公司 / Indie 100% 覆蓋（創業大章·領域道具第二章）

同軌續攻「創業」大章（ch59 共 25 課、原 0 沙盒僅 59.2/59.18 各 1 demo）：

- 補 **23 個教具** → 25 課 0 GAP，全 scenario-judge / decision-quiz 商業判斷：
  - **19 scenario-judge**：一人公司心態、接案(冷啟動/報價合約自保/交付回頭客)、MVP、定價、build-in-public、前100用戶冷啟動、100→1000放大、solo技術棧、創作者變現、多元收入、槓桿(自動化/AI/外包)、台灣開業稅務、複製他人成功、2026-2030趨勢、Indie SaaS指標、風險永續——紅線明標（沒合約沒訂金 / 定價太低 / 單一客戶或平台依賴 / 漏報稅 / churn不管只拉新 / 外包掉核心判斷 / 爆肝犧牲健康）。
  - **4 decision-quiz**：①接案→產品該不該跳(看財務緩衝+產品訊號)②這個 SaaS idea 值不值得做(有人痛/有人付/你能做)③Exit 賣掉 vs 繼續經營④獲客通路主攻內容/社群/垂直社群。
- `inject_ch59.py` + 補件 `inject_ch59b.py`(59.8 MVP、59.13 MRR 首輪漏掉) → 共 added 23；node 驗 0 GAP、demo config 全合法。
- `node scripts/import_chapters_to_db.mjs ch59` → 25 課 0 error 同步 DB。

下一步（未做）：ch43 專案管理 / ch44 PdM / ch45 跨職能協作（各 25 課僅 2-3 demo）、ch55 AI 行銷 / ch60 創業心法 / ch52 AI 設計。

---

## 驗證（鐵規則）
- `npx tsc --noEmit` ✅ 0 錯
- `npx vitest run` ✅ **34 檔 242 測試全綠**（新增 radar 17 + 既有）
- `npx next build` ✅（見 commit）
- migration 已跑 prod、辭典已 import DB、ch13 + ch59 已 import DB。

> 待林董在線才好驗/授權：§7.0.1 SEO 轉址(動 middleware)、§7.6 作業自動批改、§2.3 social adapter、Coco v1、§6.8 付費 gating——本 session 未動。
