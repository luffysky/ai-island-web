# 交接：下一個 context 待辦 + 待修（by 上一個超長 session）

> 這個 session 做了 30+ 功能（三島 / 5 種遊戲 / PixiJS / 知識市集金流 / 論壇 / 筆記 Notion 化 / AI 夥伴…）。因為對話極長、以及**這環境無法開瀏覽器跑 WebGL+Pyodide**，有些東西「做了但沒法親自驗」或「刻意留給乾淨 context 做」。以下是接手清單。

---

## 🔴 A. 最該先做：實測我測不到的東西（最高風險）
我在這 CLI 環境**不能開瀏覽器**，所以下面這些「build 過、邏輯驗過、但沒真的跑過」的，請先人工開來點：

1. **程式副本島 5 種遊戲**（`/quest`）— PixiJS(WebGL) + Pyodide(瀏覽器跑 Python)。逐一開來確認：畫面出得來、機器人/圖會動、**能過關**、**過關 XP/Z 幣有真的進帳**。
   - 迷宮 `/quest/01-move`、畫圖 `/quest/paint/paint-01`、Turtle `/quest/turtle/turtle-01`、數字 `/quest/number/num-01`、抓蟲 `/quest/debug/bug-01`。
   - **Turtle 的過關判定**最可能要調：比對「你畫的線」和「參考解的線」的邊集合（endpoints snap 到 12px）。若正解畫出來卻判失敗 → 調 `edgeKey` 的 snap 粒度（`src/app/quest/turtle/[id]/TurtlePlay.tsx` 的 `Q`）。
   - Paint / Number / Debug 邏輯較穩（有 JS 模擬/計算驗證過）。
2. **通關獎勵**：這輪修了一個 bug（發獎 RPC 沒 await → serverless 回應後被取消）。已改 `await Promise.all`。**請實測「第一次通關某關」→ 個人頁 XP / Z 幣有沒有真的加**（`src/app/api/quest/complete/route.ts`）。
3. **綠寶新增的 4 位 AI 夥伴**（Debug老爹/前端精靈/Python哥布林/多聞）：開 AI 導師 widget → 「夥伴」選單切換 → 各問一題相關問題，確認人格 + 專長有出來、會互相轉介。picker 是 `grid-cols-3`（7 個變 3 行），看看版面要不要調成可捲動或分兩排。

---

## 🟠 B. 使用者交辦、但還沒做（context 太長沒做完）

1. **筆記真正「Notion 化」的視覺**（使用者反映：功能有但「看不出來」）
   - 現況：L1 知識樹只是一排膠囊（`NotesManager.tsx` 的 `FolderBar`，用「父/子」路徑做兩層）；L2 區塊引用（`note_refs`）藏在編輯器的「🔗 引用筆記」+ 卡片「🔗 引用 N 則」。
   - 要做：**左側固定的樹狀側欄**（資料夾 → 子資料夾 → 筆記，可摺疊）＋ **內文可點的區塊引用**（像 Notion 的 page mention）。這是一次筆記 UI 改造（`src/app/me/notes/NotesManager.tsx` 1000+ 行，小心改）。
   - 資料層都好了：`notes.chapter_id` 可空（自由筆記）、`notes.note_refs uuid[]`（引用）都已 migrate。只差 UI。

2. **UI 美化**（使用者點名）
   - **討論區** `/forum`（`ForumClient.tsx` / `ThreadList.tsx` / 主題頁 / `ThreadReplies.tsx`）。
   - **內容區塊**（章節/lesson 內容呈現）。
   - **筆記區** `/me/notes`。
   - 參考：這輪把 `/quest` 做成「遊戲風」（`src/app/quest/QuestShell.tsx` 的暗色格線 + 玻璃面板）——可抽類似的視覺語言。

3. **更多遊戲類型**（新引擎，`docs/quest_games_spec.md` 有原始 brief）
   - **清單排序視覺化**：畫 bar 陣列，寫 code 排序、逐步動畫（bubble/選擇排序）。
   - **前端 UI 遊戲**：寫 CSS/HTML 讓元素排到目標位置 → 這是**不同引擎**（要 render HTML/CSS live + 比對 DOM/畫面）。風險較高。
   - 已完成的 5 種在 `src/lib/quest/*-levels.ts` + `src/app/quest/*/[id]/*Play.tsx`，共用 `src/lib/quest/engine.ts`（sfx/星等/preamble/發獎）。新遊戲照這個模式加。

4. **章節 ↔ 關卡對應 + AI 批量生成器 →「50 關跨章節」**
   - 現在每關 `chapterHref` 都指通用 `/chapters`，沒對到具體章節。
   - 要做：關卡加 `chapterId`（對到真實章節）＋ 後台「AI 生成關卡」工具（照 `/admin/forum-seed` 那種 draft→審核→存的模式，用 `pickModelForUsage`+`callAI` 產關卡 JSON）。關卡已全資料化（`*-levels.ts`），加關卡=加資料。
   - 目標：每個程式章節配 1–3 關，湊到 50+。

---

## 🟡 C. 跨 session 的維運待辦（多在 `docs/OWNER_SETUP.md`）
- **真金流未接**：可販售筆記/商店的 Z 幣**站內**購買已通（`buy_note_product` RPC 實測 OK），但**真錢**（ECPay/藍新/Stripe）env 還沒填 → 見 OWNER_SETUP「一、必做」。
- **新 cron 要排程**（GitHub Actions）：`/api/cron/forum-ai-residents`（AI 住民自動回文）、`/api/cron/creator-daily-pairing`（今日配對推播）。見 OWNER_SETUP cron 表。
- **migration 追蹤**：這輪新增且已 db:apply、但要納入 `scripts/run-migrations.mjs` 的（重建 DB 補跑）：`notes_market_migration.sql`、`quest_completions_migration.sql`、`notes_refs_migration.sql`、`creator_island_universe_migration.sql`、`leaderboard_lessons_migration.sql`（OWNER_SETUP 三、已列大部分）。

---

## 🟢 D. 這輪已完成（別重做，直接沿用）
碎片迴圈 / 碎片宇宙 / 影片碎片 / 漂流瓶動畫 / 今日配對(卡+cron) / 排行榜多榜別 / 論壇(種子+虛擬AI住民+種子生成器+查重+解答沉澱+AI自動回文) / 筆記(一鍵公開部落格+Notion L1知識樹+L2區塊引用+知識市集金流) / 新手區塊導覽 / 手機長按泡泡 / **程式副本島 5 種遊戲(PixiJS+像素+音效+遊戲風UI)** / **綠寶 7 位 AI 夥伴**。

---

## 🧭 建議優先序
1. **A.1 + A.2**：先開 `/quest` 實測遊戲 + 獎勵（我測不到、最高風險）。
2. **B.1**：筆記 Notion 視覺改造（使用者最在意）。
3. **B.2**：討論區 / 筆記 / 內容 UI 美化。
4. **B.4**：章節對應 + AI 關卡生成器（衝 50 關）。
5. **B.3**：排序視覺化 / 前端 UI 遊戲（新引擎，最後做）。

## 開場白建議（貼給下一個 context）
> 讀 `docs/handoff_next_context.md`。先幫我確認 A（實測 /quest 遊戲 + 獎勵、AI 夥伴），再做 B.1（筆記真正 Notion 化的左側樹狀側欄 + 內文區塊引用）。每步 tsc/build 綠、動 DB 就 db:apply+probe、改 UI 注意 RWD。
