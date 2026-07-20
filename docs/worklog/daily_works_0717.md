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

## ✍️ ch53（AI 導演/短影音）全深度重寫（0718）
- 修六課截斷 + 除罐頭 + 軟化變現數字（不掛保證）+ 拆重複（53.2/53.5 都 SOP、53.3/53.6 都虛擬人 → 重新分工）。
- 六課：53.1 image-to-video 工作流（先出圖再讓圖動·含 keyframe 走查）/ 53.2 Hook/Body/CTA 腳本（完整 30 秒範例）/ 53.3 虛擬人 SOP+誠實限制(恐怖谷) / 53.4 Runway/Pika/Luma 選型 / 53.5 6公式+月企劃+batching 量產 / 53.6 虛擬主播接案三階報價。
- 題型差異化：規劃/實作/規劃/選型決策/企劃/情境報價。
- 教具：PromptBuilder(53.1 keyframe) + PromptLab 影片版 config(53.4 text-vs-image 生片對照)。
- tsc/vitest137/build 綠、已 import DB。

## ✍️ ch54（AI 音樂）全深度重寫（0718）
- 舊病：重複最嚴重（54.1/54.3 都工具、54.2/54.5 都接案）+ 滿滿收入掛保證 + 截斷。
- 重構成 5 個不重複主題：54.1 生歌+寫描述 / 54.2 製作(後製去AI味) / 54.3 版權授權(誠實·自保) / 54.4 ElevenLabs配音+voice clone倫理 / 54.5 接案六問+三階報價。
- 全面移除收入保證（改「現實面/不掛保證」）；題型：對照實作/實作/判斷/實作/情境報價。
- 教具：PromptLab 音樂版 config（54.1 模糊 vs 具體風格描述）。
- tsc/vitest137/build 綠、已 import DB。

## ✍️ ch55（AI 行銷）全深度重寫 + 漏斗模擬器（0718）
- 舊病：六課截斷、罐頭、重複（55.2/55.6 都 email）。重寫去重：55.1 工具地圖 / 55.2 漏斗+名單 / 55.3 SEO Pillar-Cluster / 55.4 一稿多用+A/B / 55.5 LINE OA / 55.6 Email 自有名單。
- **量身互動教具**（非 prompt/CSS 類）：`FunnelSim` 行銷漏斗模擬器（拉各關轉換率、看複利、找破口）掛 55.2。
- 題型：規劃/漏斗診斷計算/SEO規劃/一稿多用實作/LINE規劃/Email序列實作；全移除業績保證。
- tsc/vitest137/build 綠、已 import DB。

## ✍️ ch56（虛擬 IP）全深度重寫 + DecisionQuiz（0718）
- 舊病：重複最嚴重（56.1/56.4 都五類型、56.2/56.5 都 VTuber 技術、56.3/56.6 都變現）+ 大量收入保證。
- 重構 6 個不重複：56.1 五類型+選路線 / 56.2 角色設定+一致性 / 56.3 Live2D vs VRM 技術 / 56.4 LINE貼圖上架 / 56.5 純AI主播能與不能+倫理 / 56.6 鐵粉多元變現。
- **量身互動教具** `DecisionQuiz`（config 驅動、可複用）：56.1「我適合哪種虛擬 IP」3 題測驗。
- 題型：自我定位/實作/選型規劃/實作規劃/判斷/變現規劃；全移除收入保證。
- tsc/vitest137/build 綠、已 import DB。

## 🎨 互動教具總規劃定案（0718）
- 四原型：A 即時Playground / B 概念模擬器 / C 比一比Lab / D 決策測驗。定案：12 新元件全做、跟每章一起做、每章都認真配互動（留白是少數例外）。詳 `docs/content/interactive_widgets_masterplan.md`。

## ✍️ ch57（AI 法律/倫理）全深度重寫 + ScenarioJudge（0718）
- 舊病：重複（57.1/57.3 著作權、57.2/57.4 倫理）+ 截斷 + 罐頭。重構 5 個不重複：57.1 著作權基礎 / 57.2 商用授權 / 57.3 偏見與幻覺 / 57.4 倫理自律 / 57.5 個資GDPR。
- **量身互動** `ScenarioJudge`（情境判斷·config 可複用）：57.2 商用情境、57.5 個資情境各一組（判可以/風險/不行→揭曉）。RWD 嚴謹（按鈕 flex-wrap、文字 break-words）。
- 題型：分析/情境判斷/案例分析/自律守則/合規檢核。非法律意見免責已註明。

## ✍️ ch58（AI 時代職涯）全深度重寫 + PriorityMatrix（0718）
- 舊病：重複（58.1/58.3 都「誰被取代」）+ 截斷 + 罐頭 + 收入數字。重構 5 個不重複：58.1 職涯核心+誰被取代 / 58.2 學習路徑 / 58.3 怎麼學>學什麼(學習金字塔) / 58.4 副業→Indie SOP / 58.5 自我品牌build in public。
- **量身互動**：`PriorityMatrix`（2×2象限·點選放置·config可複用）掛 58.1「技能象限盤點(AI取代性×優勢)」；`DecisionQuiz` 掛 58.2「路線自測」。
- 題型：象限盤點/路徑自測/金字塔應用/轉型規劃/自我品牌行動；移除收入保證。RWD 嚴謹(點選非拖曳、flex-wrap、break-words)。

## ✍️ ch60（創業心法/心理）全深度重寫（0718）
- 舊病：跟 ch59 重疊 + 內部重複(60.1/60.3、60.2/60.5) + 收入保證。聚焦「心態/心理」重構 6 個不重複：60.1 選對遊戲(Indie≠矽谷) / 60.2 孤獨 / 60.3 焦慮自我懷疑 / 60.4 burnout健康 / 60.5 長跑機制 / 60.6 定義自由。
- 複用互動：`DecisionQuiz`(60.2 你最卡哪個心理關卡) + `PriorityMatrix`(60.5 重要vs緊急艾森豪矩陣)。題型：反思/自我檢測/焦慮日記/健康稽核/時間象限/願景寫作；移除收入保證。

## ✍️ ch59（一人公司/Indie · 25 課大章）Batch 1：59.1-59.13（0718）
- 定位「商業實作」（心理面歸 ch60）；去重(Build in Public/MRR/用戶各重複)、去收入保證。
- Batch 1（13 課）：一人公司時代 / 三模式(接案·SaaS·創作) / 接案找客戶·報價合約·溝通交付·接案→產品 / 找SaaS idea·MVP·定價·Build in Public·前100用戶·100→1000·MRR階段論。
- 互動：`DecisionQuiz` 掛 59.2「哪種模式適合你」。import 已 upsert（14-25 暫留舊、Batch 2 補）。tsc/vitest137/build 綠。
- Batch 2 待做：59.14-59.25（Solo stack/創作者/多元收入/槓桿/團隊/Exit/台灣實務/案例/趨勢/指標/通路/財務）。

## 📊 內容重寫進度（本 session）
- 已完成全深度重寫：**ch51~58 + ch60**（創作章 9 章）+ **ch59 Batch1（13/25 課）**。
- 互動教具 11 種（全按章量身）：LayoutGallery/Flex/Grid/BoxModel/RwdRuler/PromptLab/PromptBuilder/FunnelSim/DecisionQuiz/ScenarioJudge/PriorityMatrix。
- 待續：**ch59（25 課大章，獨立處理）**；之後 ch03/13/43-45 及技術章除罐頭（技術章時建 RegexTester/JsonTree/HttpInspector 等剩餘 B 元件）。

## ⏭ 待續
- 林董線上驗收版面圖鑑手感（Claude 端 Chrome 擴充沒連、沒法目視截圖）。
- 下一批：`prompt-lab`（餵 AI 全系列/創作章）、ch51 六課全深度內容重寫、`box-model`/`flex-playground` 補滿 ch02/03。
