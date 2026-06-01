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

_最後更新：2026-06-02 by 雪鑰_
_「給我一個點子」已上線、三階段完成，只剩「人生星圖」整合未做。_
