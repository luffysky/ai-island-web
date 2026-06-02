# Daily Works — 2026-06-02

雪鑰處理、董事長林董（Luffy Lin）。

## 工作主軸

從 0 到上線打造後台新功能 **「給我一個點子」**（靈感碎片收集與重組系統），三階段一路加到「靈感引擎」等級；中途 Zeabur 部署一直 `ImagePullBackOff`，排查確認是**他們 registry 故障**，順手做了 standalone 化 + 多階段 Dockerfile + GitHub Actions → GHCR 的部署管線當永久 fallback。

主要 3 條線：

1. **「給我一個點子」三階段**（功能主線）— 碎片 CRUD + AI 分析 → 視覺化 + 每日推薦 + 轉換 → 資料夾分類(拖曳) + 手選組合 + AI 關聯理由
2. **Zeabur 部署搶救**（中途插入）— 524 / EOF 拉取失敗排查 → standalone + Dockerfile → GHCR 管線繞開
3. **AI 升級成「靈感引擎」**（收尾）— prompt 改寫，強制產出「為什麼這些碎片值得組合」的具體關聯線

---

## Commit 列表（時間倒序、本日 7 個）

```
fedca03  feat(idea): 資料夾分類(拖曳) + 手選碎片組合 + AI 關聯理由 + 關聯圖美化
52a7671  fix(build): SSG 需要 SUPABASE_SERVICE_ROLE_KEY，build 階段補上
0d58971  fix(build): 空字串 NEXT_PUBLIC_SITE_URL 不再炸 build + workflow vars/secrets fallback
3b1daa8  ci: GitHub Actions build image → push GHCR（繞開 Zeabur registry）
2dd2f38  build: Next.js standalone 輸出 + 多階段 Dockerfile（縮小 image、修 Zeabur 524 拉取逾時）
b58c3a6  feat(admin): 「給我一個點子」第二階段 — 視覺化 + 每日推薦 + 產品企劃
d7443ec  feat(admin): 「給我一個點子」靈感碎片收集與重組系統
```

4 個 SQL migration（idea_fragments / idea_daily / idea_folders 三批）已套到線上 DB。

---

## 1️⃣ 「給我一個點子」第一階段 — MVP（commit d7443ec）

依林董丟的概念文件（`docs/待閱/待/AI島給我一個點子概念.md`）實作。側邊欄**單獨置頂、不歸類**：💡 給我一個點子。

- **碎片 CRUD**：新增 / 列表 / 編輯 / 刪除 / 搜尋 / 標籤篩選
- **「分析碎片」**：AI 回 summary / tags / mood / category / 潛在用途，寫回碎片
- **「給我一個點子」**：AI 從碎片群重組 3 個新點子並存檔
- **點子轉換**：儲存 / 刪除 / 轉成任務（`todos`）/ 轉成文章草稿（`user_blog_articles` 設非公開）
- 新表 `idea_fragments` + `generated_ideas`（RLS admin/owner 限定、GIN 標籤索引、updated_at trigger）
- 沿用既有 `callAI` 多 provider / 加密 key / rate-limit / PageHero

檔案：`src/app/admin/idea-fragments/*` + `src/app/api/admin/idea-fragments/*` + `generated-ideas/*` + `src/lib/idea-ai.ts`

---

## 2️⃣ 「給我一個點子」第二階段 — 視覺化 + 每日推薦（commit b58c3a6）

- **碎片關聯圖**：node = 碎片、edge = 共同標籤（線越粗共用越多），純 SVG 無依賴
- **時間軸**：依建立日期分組
- **標籤雲**：字級隨次數、點擊篩選
- **每日自動推薦一個點子**：`generated_ideas.daily_date` 標記、台北時區算日，當天第一次開自動生成、idempotent 每天只燒一次 token
- **轉成產品企劃**：AI 把點子展開成完整企劃書（概述/問題/目標用戶/MVP/商業模式/競爭/里程碑/風險/KPI），存 blog 草稿
- 左側「列表 / 時間軸 / 標籤雲 / 關聯圖」四檢視切換
- 抽出 `generateIdeaRows()` 共用 helper（手動生成 + 每日推薦共用同一套 prompt）

migration：`idea_daily_migration.sql`（加 daily_date + 唯一索引）

---

## 3️⃣ Zeabur 部署搶救（中途插入）

林董報 Zeabur 一直 `ImagePullBackOff`，log：

```
failed to pull and unpack image ...: 524 <none>          ← 第一次
failed to read expected number of bytes: unexpected EOF  ← 後來
```

**Root cause**：兩種錯都發生在 Zeabur 自己的 registry（`registry-oci.zeabur.cloud`）吐 image blob 時，且換多個不同 image 都失敗 → **Zeabur 平台端 registry 故障**，不是 build / 程式問題（build 成功、image 有 push，只是拉不下來）。多次 redeploy 無效。

**處置（commit 2dd2f38 / 3b1daa8）**：

- `next.config.mjs` 加 `output: 'standalone'`
- 多階段 `Dockerfile`（node:22 debian slim，非 alpine 避免 sharp 在 musl 出包）：只把 `.next/standalone` + `public` + `.next/static` + `src/data` 塞進最終 image → 從幾 GB 縮到幾百 MB
- `.dockerignore` 縮小 build context
- `.github/workflows/docker.yml`：push main 自動 build 並推 `ghcr.io/luffysky/ai-island-web:latest`，繞開 Zeabur registry

**build 連環雷（commit 0d58971 / 52a7671）**：

1. `NEXT_PUBLIC_*` build args 為空 → `layout.tsx` metadataBase `new URL("")` 崩潰 → 改 `??` 為 `||`（空字串也 fallback）
2. 舊 workflow 只讀 `vars.`，林董把值設在 **Secrets** → 全空 → 改成 `vars.X || secrets.X` 兩邊都讀
3. SSG 預渲染 `/forum` 等公開頁要 `SUPABASE_SERVICE_ROLE_KEY`（admin client 撈資料）→ builder 階段補 build arg（只在 builder、不進最終 image）

結果：Actions 綠勾、image 推上 GHCR。**最後 Zeabur registry 自行恢復**，最新 image 直接 running。GHCR 管線留著當永久 fallback。

---

## 4️⃣ 「給我一個點子」第三階段 — 資料夾 + 手選 + 靈感引擎（commit fedca03）

林董要求：①AI 不只生點子、要說「為什麼這些碎片值得組合」 ②資料夾分類（我的碎片 / Nami 的碎片）③拖曳分類 ④點子可手選要哪些碎片組合 ⑤關聯圖美化 + 字太小。

### AI 升級成「靈感引擎」⭐
- prompt 改寫：核心價值是「看見別人看不到的連結」
- 鐵則：每個點子**必須產出 `connections`**——指名「碎片A 的某元素」和「碎片B 的某元素」之間那條線（共享情緒/主題/結構/對比/因果），**禁止「都跟創作有關」這種空泛廢話**
- 今日點子卡 + 點子卡都新增 🔗「為什麼這些碎片值得組合」區塊
- 新欄位 `generated_ideas.connections TEXT[]`

### 資料夾分類 + 拖曳
- 新表 `idea_folders` + `idea_fragments.folder_id`
- **拖曳碎片到資料夾 chip 即分類**（@dnd-kit，已在 deps）、chip hover 高亮放大
- 新增/編輯碎片可選資料夾、點 chip 篩選、雙擊改名、可刪（碎片不刪、變未分類）

### 手選碎片組合
- 「手選碎片來組合點子」模式 → 勾選 → 主按鈕變「✨ 組合這 N 個」
- generate API 支援 `fragmentIds`（手選）/ `folderId`（資料夾範圍）/ 預設最近 40

### 關聯圖美化
- 字 11 → **16 / hover 20**，加深色描邊 halo 在線上也看得清
- label 移到圓環外、依左右自動對齊不再擠成一團
- edge 改微彎曲線、節點 hover 發光、中心光暈背景、圖例放大

migration：`idea_folders_migration.sql`

---

## 📈 累計（功能完成度）

「給我一個點子」概念文件的 MVP + 後續延伸清單：

| 項目 | 狀態 |
|---|---|
| 碎片 CRUD / 搜尋 / 標籤 | ✅ |
| AI 分析碎片 | ✅ |
| AI 重組點子（3~5 個） | ✅ |
| 儲存 / 轉任務 / 轉文章 / 轉產品企劃 | ✅ |
| 碎片關聯圖 | ✅（已美化） |
| 時間軸 | ✅ |
| 標籤雲 | ✅ |
| 每日自動推薦一個點子 | ✅ |
| 資料夾分類（拖曳） | ✅ |
| 手選碎片組合 | ✅ |
| AI 關聯理由（connections） | ✅ |
| 與「足跡流光」整合成人生星圖 | ⏳ 未做 |

部署工程：standalone Dockerfile ✅ / GHCR 自動 build 管線 ✅（fallback 永久備著）

---

## 🎯 林董要驗收 / 體感的點

1. **拖曳分類**順不順手（碎片往資料夾 chip 拖）
2. **關聯圖**字夠大、好看了嗎
3. **AI 的 connections 有沒有真的講出「非顯而易見」的連結** ← 最關鍵，偏空泛的話再把 prompt 調更兇
4. 「今日點子」每天開有沒有自動冒出來

---

## 📝 文件

新增：
- `docs/daily_works_0602.md` — 本日工作日誌
- `Dockerfile` / `.dockerignore` / `.github/workflows/docker.yml` — 部署管線

備忘（已記進 memory）：
- Zeabur registry 偶發 524/EOF → 切 GHCR image 的 SOP + build 時必備 env

---

# 下半場 — 程式碼品質 + GA4 數據打通

上半場做完功能後，下半場處理三件事：**ESLint 全面除錯（被一個編輯器假象坑了快兩小時）、GA4 同步從掛掉修到正常、再把 GA4 能給的數據全接進後台。**

## Commit 列表（下半場 3 個）

```
cde088f  feat(ga4): 同步補齊更多 GA4 維度與指標（城市/管道/瀏覽器/OS/語言/到達頁/新回訪 + sessions/互動率/新訪客）
61644fd  fix(ga4): sync 5 支報表並行化 + 逾時保護，修手動同步收到 HTML(504)
098a2ed  fix(lint): 清掉全部 41 個真 ESLint error + 根治 .tsx 被當純 ts 的假錯
```

2 個 SQL migration（先前的城市欄、後併入完整 `ga4_more_dimensions_migration.sql`）已套到線上 DB。

---

## 5️⃣ ESLint 大掃除 + 「.tsx 被當純 ts」假錯解謎（commit 098a2ed）⭐ 教訓最深

林董看到編輯器 `page.tsx` 顯示 **541 個錯誤**，以為程式碼爛掉了。實際排查順序與真相：

1. **先打掉真 ESLint error 41 個**（這些是真的、該修）：
   - `rules-of-hooks` ×2：`useCanned` 不是 hook 卻用 `use` 前綴觸發誤判 → 改名 `applyCanned`
   - `jsx-no-comment-textnodes` ×16：nami-playground / IDE 的 `// 提示文字` 直接當 JSX 文字節點（會原樣印在畫面）→ 包成 `{"// ..."}`
   - `prefer-const` ×9：`let`→`const`（含 3 個 Supabase `let {data,error}` 拆成 `const error` + `let data`，因 data 有 fallback 重賦值）
   - `no-children-prop` ×1：`TodoItem` 的 `children` 是資料 prop 不是 React children → 改名 `subTodos`
   - `no-unescaped-entities` ×13：`<code>` 內的引號改 template literal
   - 附帶修回 `InteractionPanels` 被手滑改壞的 `min-w-[760px]`

2. **但 41 個修完，編輯器還是 541 → 反而變 1000+**。一度懷疑 ESLint、tsconfig、甚至刪了 40MB 的 `.codex_zip_extract_*` 殘骸（含第二個 tsconfig）、重啟 TS server、重開 VS Code，**全都沒用**。關鍵自證：`tsc --noEmit` 和 `npm run lint` 始終 **0 error**。

3. **真兇（林董一句「tsx 一直被當成 ts」點破）**：那些 `找不到名稱 'div'`、`className` 不存在、`PageHero 作為類型使用` —— 是 **VS Code 把 `.tsx` 用「TypeScript」語言模式打開、而非「TypeScript React」**。`<div>` 被當成型別斷言而非 JSX。`<div>` 要不要當 JSX **是看副檔名/語言模式，不是 tsconfig 的 `jsx: preserve`**（那個只管 emit）。元兇多半是**全域** `files.associations` 把 `*.tsx` 綁成 `typescript`，壓過 workspace 改不動。

4. **解法**：新增 `.vscode/settings.json` 強制 `"files.associations": { "*.tsx": "typescriptreact" }`（workspace 壓過全域）→ 重載後 541 全消。已記進 memory（`vscode-tsx-treated-as-ts`），下次秒解。

> 教訓：**`tsc`/`lint` = 0 但編輯器一片紅 = 純編輯器/語言模式問題，不要再動程式碼。**

收進 `.eslintrc.json`（`no-explicit-any` off、`no-unused-vars` warn）。最終 `lint` 0 error、205 warning（無害）。

---

## 6️⃣ GA4 手動同步修復（commit 61644fd + 設定面）

林董按後台「立即同步」報 `Failed to execute 'json'... Unexpected token '<', "<!DOCTYPE"` —— 收到 HTML 而非 JSON。

排查：直接 curl 線上 `/api/admin/ga4/sync` → GET/POST 都回乾淨 JSON 401 → **路由健康**，HTML 是平台層的逾時/錯誤頁。

**程式面處置（commit 61644fd）**：
- 5 支 GA4 Data API call 從「一支等一支」改 **`Promise.all` 並行**（原本容易拖到閘道逾時回 504 HTML）
- 每支加 `AbortSignal.timeout(20s)`：卡住會丟錯被外層 try 接成 JSON，不再變平台 HTML
- POST 登入檢查包 try/catch；按鈕改成偵測非 JSON 時直接顯示真正的 HTTP 狀態碼

**設定面（真正主因）**：林董把 `GA4_PROPERTY_ID` 填成**串流 ID `14865503888`**（資料串流頁的那個），正確的是 **資源 ID（管理 → 資源設定，純數字 9 位）**。換成正確 Property ID → **同步成功** ✅

**附帶解掉的雷 — Refresh Token 7 天死亡**：OAuth 同意畫面在「測試中」狀態時 refresh token 只活 7 天。指導林董把發布狀態切成 **「實際運作中」** → token 永久；並提醒**重新榨一次** token（舊的是測試模式時產的、仍是 7 天版）取代 Zeabur 上的。

---

## 7️⃣ GA4 數據大擴充（commit cde088f）

林董：「還有什麼 GA4 有我沒有的資訊也幫我同步加上」→「所有」。

**每日指標新增 3 個**：工作階段 `sessions`、互動率 `engagementRate`、新使用者 `newUsers`。

**維度報表 3 張 → 11 張**：

| 新增 | GA4 維度 |
|---|---|
| 🛬 到達網頁 | `landingPage` |
| 📊 流量管道 | `sessionDefaultChannelGroup` |
| 🏙️ 城市 / 地區 | `city`（台北各區） |
| 📱 裝置 | `deviceCategory`（本來有存沒顯示，補上） |
| 🌐 瀏覽器 | `browser` |
| 💻 作業系統 | `operatingSystem` |
| 🗣️ 語言 | `language` |
| 🔁 新 / 回訪 | `newVsReturning` |

- route：全部報表並行、抽 `mapRows()` 共用 helper
- page：Stat 加 3 個、TopTable 擴成 11 張、grid 改 `xl:grid-cols-4`
- DB：`ga4_more_dimensions_migration.sql`（11 個新欄位，已套線上；主 schema `ai_migration.sql` 同步）

---

## 📝 文件 / 設定（下半場）

- `.vscode/settings.json` — 釘死 `*.tsx → typescriptreact` + 後移除棄用的 tsdk 設定
- `.eslintrc.json` — 收進版控
- `supabase/ga4_more_dimensions_migration.sql` — GA4 新欄位
- 刪除 `.codex_zip_extract_20260522/`（40MB 解壓殘骸、含干擾用的第二個 tsconfig）
- memory 新增：`vscode-tsx-treated-as-ts`（.tsx 假錯 SOP）

## 🎯 林董要驗收 / 體感的點（下半場）

1. 編輯器 541 假錯重載後是否歸零（語言模式那招）
2. GA4 同步按下去出現 11 張表 + 新數字卡
3. Refresh token 記得**重新榨一次正式版的**貼回 Zeabur，才真的一勞永逸

---

_最後更新：2026-06-02 by 雪鑰_
_上半場：「給我一個點子」三階段上線。下半場：ESLint 全清 + .tsx 假錯根治 + GA4 數據完整打通。只剩「人生星圖」整合未做。_
