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

## 驗證（鐵規則）
- `npx tsc --noEmit` ✅ 0 錯
- `npx vitest run` ✅ **34 檔 242 測試全綠**（新增 radar 17 + 既有）
- `npx next build` ✅（見 commit）
- migration 已跑 prod、辭典已 import DB。

> 待林董在線才好驗/授權：§7.0.1 SEO 轉址(動 middleware)、§7.6 作業自動批改、§2.3 social adapter、Coco v1、§6.8 付費 gating——本 session 未動。
