# 工作日誌 2026-07-07

> 本輪：一批手機截圖回報的 bug / 體驗改善（bugpic 130–138）＋ 讀 `docs/note.md`（這幾天跟 GPT 討論碎片創作引擎/知識生態系）。全程 tsc 0、lint 0 error、build exit 0、vitest 117 passed、DB probe 綠。

## 修的東西（對應截圖）

### 推理台（FIE）— 兩隻真 bug（130 系列最關鍵）
- **134「開始推理」回 `Unexpected token '<'`**：推理鏈是**序列** AI 往返（`buildRepresentation` 每個種子各一次 embed → `retrieveEvidence` 再一次 → 記憶注入再一次 → LLM），種子一多就超過上游 gateway timeout、回 HTML 錯誤頁、前端 `res.json()` 爆掉。
  - 修：`representation.ts` 每碎片 embedding 改 `Promise.all` 並行；`reason.ts` 先撈種子、再 `Promise.all([representation, evidence])` 併行；route 加 **55s 自帶逾時**、逾時回乾淨 JSON 504（不再讓前端吃到 HTML）；`ReasonClient` 的 `api()` 改「先讀 text 再 parse」、非 JSON 給友善訊息。
- **133 碎片清單沒撈全部**：`reason/page.tsx` 原本 `listFragments(limit:60)` → 改 `listAllFragments`（分頁撈滿，331 全給），Client 加搜尋框 + 捲動區（已選置頂）。
- **133 推理完沒後續動作**：每個推理方向加「用這個方向編織成作品」→ `POST /works` 建草稿帶入選到的碎片、跳作品編輯器。

### 131 碎片卡依稀有度配色
- rarity 存在 tags（N/R/SR/SSR/UR）。卡片底色/邊框 + 稀有度徽章按級上色（R 天藍 / SR 紫 / SSR 琥珀金 / UR 洋紅漸層），一眼分辨。

### 132 意外配對可多選
- 原本「點一對＝取代選取」→ 改成點配對 **累加/toggle** 碎片（勾選態 + 清空鈕），可一次挑多對一起凝聚/編織。

### 135 預置工作流
- 「我的工作流」空的 → 內建 4 個範例工作流（凝聚→短文 / 演化→編織 / 凝聚→一首歌 / 編織→英文轉譯），一鍵加入即可對選到的碎片重播（真 agent pipeline、沿用既有 POST）。

### 136 排行榜多榜別
- 新增 `leaderboard_lessons` RPC（跨使用者聚合 `lesson_progress` 完課數，SECURITY DEFINER 繞 RLS、REVOKE public + GRANT anon/auth/service）。頁面加三榜切換：🏆 XP / 🔥 連勝 / 📚 完課（`?tab=`、server 端 SEO 友善），podium/列/我的排名皆顯示當前榜別數值。probe：hotnami111=6 課、Luffy=5 課、anon 可執行 ✓。

### 137 創作島綠寶對話 = 課程綠寶等級
- 每則綠寶回覆加 **複製 / 分享（Web Share，退回複製）/ 接入創作**（把該段直接開成作品草稿、跳編輯器）。

### 130 章節導覽 hover 泡泡過邊界
- lesson 預覽泡泡原本固定 `r.right + 12`，手機滿版 drawer 會被切掉 → 右邊放不下就翻左邊 + 箭頭反向 + `max-w` clamp 進視口。

### 138 iOS 首頁 Cookie 橫幅 × PWA 更新橫幅重疊
- Cookie 橫幅把自身高度發成 CSS 變數 `--cookie-banner-h`（ResizeObserver 動態），PWA 更新橫幅 `bottom: calc(var + 0.5rem)` 疊在其上、不再重疊。

## 維運
- PWA SW cache `v13-2026-07-05 → v14-2026-07-07`。
- `OWNER_SETUP.md` 補列 `leaderboard_lessons_migration.sql`（重建 DB 補跑）。**無新 env、無需手動操作。**

## 驗證
- `tsc --noEmit` 0 error；`next lint` 我改的檔 0 **error**（僅既有風格 warning）；`npm run build` exit 0；`vitest` 117 passed（14 檔）；`leaderboard_lessons` RPC 已 db:apply + probe。
- API/DB/UI 連接：reason→works、pairs→選取、preset→workflows POST、weave→works POST、完課榜 RPC 皆實接。RWD：新 UI 皆 flex/grid + clamp、無破版固定寬。

## note.md 想法
另於對話回覆整理（碎片敘事引擎 ≈ 已落地的 FIE；知識生態系四條線；論壇種子/知識流；付費點在「陪伴累積後的洞察」而非單次生成）。
