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

---
---

# 本日後續（同一天、後面的 context）— 共 69 commit / build 綠 / 117 測試過 / DB 都在

## 1. 全站 UI / 設計系統
- 醜對話框全站換 in-app modal（30+ 檔）`40b73efc`；導覽收成左上/右上角落抽屜+加遊戲/筆記 `e7c205f1`；SideNav 泡泡改上方夾視口 `8e92b7d5`
- **設計系統打底**：next/font(Inter/Outfit/JB Mono)、標題排版、surface/hover-lift/glow/gradient primitives、氛圍光暈、頁面轉場 `2f3d1385`；鋪到首頁/章節/討論區/lesson prose `60da4fde`；空狀態徽章+骨架 shimmer `ea68de8f`
- **「感覺長一樣」真因**：中文用系統字→改載 **Noto Sans TC 網頁字體** + 光氛加濃 + 卡片陰影加重 `f56e8a40`

## 2. 遊戲（Code Quest 第三島）
- 5 種遊戲(迷宮/畫圖/Turtle/數字/抓蟲)+PixiJS+像素+音效+遊戲風UI+修通關獎勵沒真發 `c1d54c42`…`f9a87cbf`
- **2 新遊戲**：排序視覺化(Pyodide+長條)、前端CSS關(iframe) `5e5e33e8`；**AI 關卡生成器**(後台生→存DB→自動上線) `2380c0d5`

## 3. AI 導師：3→**11 位**夥伴 `3259356e`,`f2ead6cf`；**人格被導師框架蓋掉的 bug 修好**(多聞改純陪聊、人格最高優先) `6aec4687`；頭像跟著夥伴 `7aca6355`

## 4. 內容/種子/人氣
- 討論區 36 主題、部落格 **86 篇**(含哥布林 **75 篇 Python 系列生成器**)、社群 10 貼文、筆記市集 3 免費官方包18則
- **種子工作室 `/admin/seed-studio`**(討論區/部落格/筆記 一頁分頁、AI+手動) `408a01f8`,`99087d8a`,`df6eefba`,`e5d79395`,`436b6e15`

## 5. 部落格：系列可展開收合 `dfc92edf`；owner/admin/客服 官方身份發文 `7fdc700f`；一鍵公開 `4068e2ea`

## 6. 創作者島嶼：碎片宇宙/影片/漂流瓶/今日配對 `60467229`…；**公開展示頁**(作品庫發佈) `77fac3f9`；**果實提現 A 版**(申請+後台對帳) `13021e14`

## 7. 筆記：Notion L1 樹/L2 區塊引用(page-mention) `287e4af8`,`d7b90bb0`,`e0a95b4c`；知識市集金流 `492614a9`；市集按鈕改 toast `4a089788`

## 8. 金流（`docs/payments_setup.md`）
- 綠界/藍新/Stripe + **Lemon Squeezy + Paddle(海外 MoR)** `ce1a592b`；Stripe 台灣開不了→MoR/綠界；**金流狀態面板 `/admin/payments`** `390dda14`；雙 webhook secret `108de7de`；設定文件補齊 `dda4f6ad`

## 9. i18n
- **地基(#157)**：next-intl cookie 切語言(不動 591 路由)+EN/中+chrome `1e1f4799`
- **內容 AI 翻譯層(#159)**：翻一次快取、來源變(hash)才重翻、`/api/admin/translate-content` 批次、部落格頁接上 `4f663a2b`
- **本次追加：EN/中 → +日文/韓文**（見下方「i18n 現況」）

## 10. Bug/維運：簽到後今日任務即時更新 `e19379a9`；麵包屑不 404 `1f0e9c0e`；2 支新 cron `0f29aadf`；migration 全納入 run-migrations；PWA SW **v16** `408a01f8`

## ✅ 收尾檢查
- build 綠 / tsc 0 / **test 117 passed** / 383 route 全有 HTTP method
- DB 新物件都在：content_translations、ci_payouts、quest_ai_levels、note_products、ci_works.is_showcased/showcased_at、user_blog_articles.author_identity（`ci_payout_accounts` 沒建=正確，A 版把銀行欄位放 ci_payouts）
- 內容量：公開部落格 86 / 上架商品 3 / 討論串 36 / 社群貼文 10
- RWD：CSS 遊戲 iframe 改 `w-full max-w`；後台表格 overflow-x-auto；新頁面 grid sm:/md:
- PWA：SW `v16-2026-07-07`

## ⏳ 未完成 / 交接（重要）
- **#158 i18n 全站抽字串（尚未完成、大工程）**：地基+內容層+chrome 好了；**剩「除了後台 admin 以外，所有頁面(~800 檔)的硬字串逐頁抽進 messages」**，語言＝**中/英/日/韓** 四語。做法：一頁 `useTranslations()` + 加 key 到 `messages/{zh,en,ja,ko}.json`；內容(章節/lesson/部落格)用 #159 翻譯層批次預翻各語。**這是多輪持續工程、建議用平行 subagent 一區一區掃。**
- **需瀏覽器 QA**：/quest 7 遊戲+發獎、11 夥伴人格、英文/日/韓切換、金流測試機各過一筆。
- **金流上線**：填 live env(owner)；台灣訂閱→綠界定期定額、海外訂閱→MoR(目前一次性)。
- **果實提現 B/C**：Stripe Connect(海外)/綠界藍新分潤(台灣)，需先申請服務(沿用 ci_payouts.method)。
