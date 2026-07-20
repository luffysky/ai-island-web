# 工作日誌 2026-07-17

## 📓 NotebookLM 創業計劃書指南 + 來源包
- `docs/bizplan/notebooklm_bizplan_guide.md`：怎麼餵、系統設定提示詞（防膨風護欄，守 repositioning 誠實口徑）、11 章逐章提示詞、內建功能運用、組裝順序。
- `docs/bizplan/notebooklm_sources/`：把 grant 既有素材打包成 6 個 txt（00 說明+市場數據狀態 / 01 定位誠實口徑 / 02 完整計畫書底稿 / 03 產品介紹 / 04 pitch骨架QA / 05 進度規劃），去機密掃描過（只 `<CRON_SECRET>` 佔位符、安全）。市場數字已在 02 第二章附原始官方出處+URL。

## 🔍 全 80 章內容體檢（重大發現）
- `docs/content/content_audit_0717.md`：起因林董指出 Ch46~60 表面。實讀確認後掃全 80 章 / 1258 節。
- **74%（931/1258 節）練習題是罐頭**；單一模板「把本節 code copy 進去跑」被貼 **615 次**、不管有沒有 code 都貼（SEO/寫作/心法課叫你跑不存在的程式碼）。
- 範圍＝ch01~60（生成器跑過）；ch00,33,61~79 = 0% 罐頭（後期手寫）。
- 病灶分兩種：① 罐頭練習（全站客觀）② 內容表面（ch51~58 導覽式、實讀確認）。
- 林董定案：**全章重寫、深度＝完整走查+成品、練習題對得上主題**；ch51 當範本先行。

## 🎮 互動教學體驗（L3 教具層）— 旗艦 POC 上線
- **背景**：發現平台已有 `PlaygroundCard`（Monaco+即時預覽+20語言沙盒）＝L2 可編輯層。林董要再疊 L3「引導式無碼教具」（點/拉即體驗），且參考 IG「12 種版型」靜態圖、要做成互動版更強。
- **`docs/content/interactive_experiences_plan.md`**：全站教具規劃（css-layout / rwd-ruler / prompt-lab / box-model / http-inspector / json-tree…依複用度排序，哪章配哪個）。
- **實作**：
  - `src/components/chapter/demos/LayoutGallery.tsx`：**版面圖鑑互動版**。8 種真版型（單欄/側欄/卡片格/聖杯/對半/Hero/雜誌/全螢幕）點按即用真 flex/grid 排出；**拖右緣或按手機/平板/桌機看 RWD 重排**（顯示現在 px+裝置）；「看 CSS」揭曉關鍵 code。亮暗安全、窄屏用預設鈕不破版。
  - `LessonDemos.tsx` 派發器（依 `demo.type` 選元件、未知型別略過）。
  - `types.ts`：新增 `LessonDemo` + `Lesson.demos`。
  - `LessonCard.tsx`：渲染「✨ 互動體驗」區（playground 之上）。
  - **DB**：`supabase/lessons_demos_column.sql`（lessons 加 `demos` jsonb，冪等）已跑；`import_chapters_to_db.mjs` + `content.ts` 加 `demos` 映射。
  - **ch02** 掛載：`2.5 display`（css-layout 版型切換）、`2.12 RWD`（rwd-ruler 拖寬度）。已 import、DB 驗證有值。

## 🚨 收尾檢查（鐵規則）
- **API/DB/資料表**：lessons 加 `demos` 欄（migration 已跑）；import+content.ts 雙向映射；DB 查詢確認 2.5/2.12 有 demos 值。無假功能。
- **UI 接對**：demos → LessonDemos → LayoutGallery 真渲染、非空殼。
- **RWD**：LayoutGallery preview `maxWidth:100%`、按鈕列 `flex-wrap`、CSS 區 `overflow-x-auto`、拖曳把手手機隱藏改用預設鈕；不破版（亮暗都檢查）。
- **建置**：`tsc --noEmit` ✓ · `vitest run 137` ✓ · `next build` exit 0 ✓。
- **機密/PWA**：未動 `.env.local` / manifest / sw；無新前端依賴（LayoutGallery 純 div+lucide）。

## 🎮 互動教具第二批（差異化 ch02 各節）
- 林董回饋：2.5/2.12 都用同一個 LayoutGallery、看起來一樣。→ 依每節主題做不同教具：
  - `FlexPlayground`（2.6 Flexbox）：改 flex-direction/justify/align/wrap + 方塊數量，即時重排 + 秀 CSS。
  - `GridPlayground`（2.7 Grid）：切換 **豆腐排版**／三欄／auto-fit／側欄／主打跨格，拉 gap，秀 CSS。
  - `RwdRuler`（2.12 RWD，獨立元件）：真響應式頁面（導覽列窄屏收成 ☰ 漢堡 + 卡片 4→2→1），拖寬度看斷點重排。
  - 2.5 保持 LayoutGallery（版型圖鑑）。→ ch02 四節四種不同教具。
- 派發器 LessonDemos 加 SUPPORTED 白名單；types 加 `grid-playground`。tsc/vitest137/next build 綠、ch02 已 import。

## ✍️ ch51 六課全深度內容重寫（範本章·L1 內容加深）
- 舊病：內容「長但表面」（只講方法不走完一次）+ 三課寫到一半被截斷 + 練習題壞掉（小說課叫你跑不存在的 code）。
- 新標準（每課）：①「這課你會做出什麼」成品開場 ②真 prompt（🧑）→ AI 實際輸出（🤖）→ 用尺規批改 → 成品 的完整走查 ③☕用人話講 ④對得上主題的真練習（產出可驗證作品）⑤判斷力 miniQuiz。
- 六課：51.1 同題實測選工具（bake-off + 3 把尺）/ 51.2 一頁故事聖經（世界觀+角色卡+三幕，含 AI 對白一致性走查）/ 51.3 部落格 E-E-A-T（AI直出 vs 加經驗對照）/ 51.4 小說 SOP（Phase3 改稿：Tell→Show 實例）/ 51.5 變現誠實版（一稿多用+五路徑現實面，不掛保證收入）/ 51.6 CRISP（爛 prompt→好 prompt 實際輸出對照）。
- 章節 outcomes/summary/faq 同步改寫；創作章移除 playground。已 import DB、tsc/build 綠。
- 字數比舊版精實（密度換長度）；若要更長可每課再加第二個 worked 走查。**待林董線上驗收深度標準**。

## ✍️ ch52（AI 設計）全深度重寫 + 專屬教具（0718）
- 舊病：五課全截斷 + 練習題全罐頭（設計課叫你跑 code/重構舊專案）。
- 新版六課：52.1 看需求選工具（選型決策表+真接案三活走查）/ 52.2 六格 prompt 公式（爛 vs 公式對照）/ 52.3 v0 出殼 vs 接腦界線 / 52.4 進階：除錯壞 prompt + --sref 系列一致 / 52.5 v0+Cursor 流程 SOP / 52.6 三階報價+賣過程差異化（不掛保證收入）。
- **練習題每課不同題型**（依林董要求）：選型題/對照實作/實作/除錯改進/流程設計/情境報價。
- 專屬教具 **PromptBuilder**（圖像 prompt 積木、點 chip 依六格公式即時組 prompt，複用給生圖章）掛 52.2 / 52.4。
- outcomes/summary/faq 同步；tsc/vitest137/build 綠、已 import DB。

## ⏭ 待續
- 林董線上驗收版面圖鑑手感（Claude 端 Chrome 擴充沒連、沒法目視截圖）。
- 下一批：`prompt-lab`（餵 AI 全系列/創作章）、ch51 六課全深度內容重寫、`box-model`/`flex-playground` 補滿 ch02/03。
