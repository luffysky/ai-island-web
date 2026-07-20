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
- Batch 2（59.14-59.25，12 課）：Solo stack/創作者/多元收入/槓桿(自動化+AI+外包)/要不要團隊/Exit/台灣開業稅務/案例可複製原則/2026-30趨勢/SaaS指標(MRR/Churn/LTV/CAC)/獲客通路/風險底線。DecisionQuiz 掛 59.18「要不要組團隊」。章 outcomes/summary/faq 更新。tsc/vitest137/build 綠、import。**ch59 全 25 課完成。**

## 📊 內容重寫進度（本 session）
- 已完成全深度重寫：**ch51~60 全部 10 章**（創作/AI/商業叢集完成！寫作/設計/影音/音樂/行銷/虛擬IP/法律/職涯/一人公司(25課)/心法）。
- 互動教具 11 種（全按章量身）。
## 🎨 ch03（UI/UX 25 課）除罐頭 + 加互動（0721）
- 實讀發現 ch03 **內容其實紮實、miniQuiz 也好**（早先 audit 過度概化為「表面」）——真正問題只有：25 課練習題全罐頭、尾巴 3.22-3.25 與 3.4/3.5/3.6/3.16 重複、沒互動。
- 處理：**保留好內容/miniQuiz**，只①換掉 25 個罐頭練習成真設計題（觀察/檢視/重設計/實作，每課不同）②讓重複尾(3.22-3.25)變「動手實戰版」。
- **新互動教具 `ColorContrast`**（調色即時算 WCAG 對比、過不過 AA/AAA）掛 3.4/3.22；複用 BoxModel(3.6)/RwdRuler(3.15)/LayoutGallery(3.24)。
- tsc/vitest137/build 綠、已 import。**教訓：技術/概念章多半內容有料，主要工作是除罐頭+加互動，不需整章改寫。**

## 🎵 創作者島「碎片編織歌曲」改善（0721）
- **①歌更完整（不再才 2 分鐘）**：`compose()` song system prompt 重寫——完整段落([Intro]→Verse1→Pre→Chorus→Verse2→Chorus→Bridge→Chorus→Outro)、≥2 段主歌、副歌重複 3 次、段落用英文方括號(Suno 才讀懂結構生完整編曲)；maxTokens 3000→4200。
- **②綠寶搜碎片寫歌**：新 `searchFragmentsByQuery`(embed 查詢→ci_related_fragments, exclude dummy uuid) + `POST /api/creator-island/fragments/search`(語意搜、無 key fallback 純文字)；CreatorIslandClient 加「🎵 綠寶找碎片寫歌」面板：打主題→找碎片→點 chip 選取→「讓綠寶編織成歌」(一鍵選+compose song) / 「全部選起來手動編織」。
- **③版權/防人名**：compose song 與 suno mode 皆已含硬規則(禁真實人名/樂團/指名模仿/引用受版權歌詞)，搜尋→編織走同一路徑守到。
- API(複用既有 embedding RPC·無新表)/UI(接真API)/RWD(flex-wrap+min-w-0)/tsc/vitest137/build 皆綠。

## ✍️ ch13（SEO+GEO 25 課大章）Batch 1：13.1-13.13（0721）
- ch13 內容偏薄+重複兇(關鍵字/GEO/Local/接案/心法/連結各兩課)+罐頭 → 當 ch59 規模全重寫。
- Batch 1（13 課·去重去保證加深）：SEO+GEO 總圖 / 引擎原理(爬取索引排名) / 關鍵字研究 / 搜尋意圖 / On-page / Technical SEO / 速度CWV / Schema結構化 / Content E-E-A-T / Pillar-Cluster / 內部連結 / 外部連結(賺不買) / Outreach客座。
- 互動：`ScenarioJudge`掛 13.9「SEO 好壞習慣判斷」(關鍵字堆砌/買連結/重複內容=雷)。tsc/vitest137/build 綠、已 import。
- Batch 2（13.14-13.25，12 課）：Local SEO/多語hreflang/GEO概念/GEO實作/GSC看數據+漏斗/內容更新/SEO+UX/AI時代變化/工具全景/內容SOP/接案(不保證排名)/心法。FunnelSim 掛 13.18 SEO 漏斗。章 outcomes/summary/faq 更新。**ch13 全 25 課完成。**

## 🗂️ ch43（專案管理 25 課）除罐頭 + 加互動（0721）
- 同 ch03：內容/miniQuiz 紮實保留，只換 25 個罐頭練習成真 PM 題(選型/實作/風險矩陣/情境判斷/實戰)、尾巴 43.21-25 重複課改實戰版。
- 互動：`DecisionQuiz`(43.2 方法論選型 瀑布/敏捷/Lean) + `PriorityMatrix`(43.10 風險矩陣 機率×衝擊) + `ScenarioJudge`(43.12 變更該不該接/scope creep)。tsc/vitest137/build 綠、已 import。

## 🗂️ ch44（產品經理 PdM 25 課）除罐頭 + 加互動（0721）
- 同 ch03/ch43：內容/miniQuiz 保留，換 25 罐頭練習成真 PdM 題(JTBD/PRD/優先序/A/B/GTM/onboarding/retention/競品/協作/growth loop…實作題)。
- 互動：`PriorityMatrix`(44.6 影響×成本 quick wins) + `FunnelSim`(44.8 AARRR 漏斗) + `ScenarioJudge`(44.9 A/B測試別被假數據騙)。tsc/vitest137/build 綠、已 import。

## 🗂️ ch45（跨職能協作 25 課）除罐頭 + 加互動（0721）
- 同治法:內容/miniQuiz 保留,換 25 罐頭練習成真協作情境題(工程×設計/PM/業務/行銷/客服/法務/財會/HR/Data/高層/客戶、翻譯技術、衝突、影響力、困難對話、code review、async、post-mortem、on-call、1-on-1)。
- 互動:`PriorityMatrix`(45.15 利害關係人 權力×關心) + `ScenarioJudge`(45.17 困難對話怎麼回應)。tsc/vitest137/build 綠、已 import。**PM 三兄弟 ch43/44/45 全部完成。**

## 📊 內容重寫進度（本 session）
- 創作叢集 ch51~60 全部 10 章完成；**ch03 UI/UX 除罐頭+加互動完成**。
- 互動教具 12 種（+ColorContrast）。
- 下一階段：ch13 SEO、ch43-45 PM、ch47-50 AI工程（同樣先判斷內容是否有料，再決定除罐頭 or 改寫）；技術章依需要建剩餘 B 元件（RegexTester/JsonTree/HttpInspector/CronBuilder/Tokenizer/SortingViz/GitGraph/NeuralForward/AuthFlow/MLBoundary）。
- 互動教具 11 種（全按章量身）：LayoutGallery/Flex/Grid/BoxModel/RwdRuler/PromptLab/PromptBuilder/FunnelSim/DecisionQuiz/ScenarioJudge/PriorityMatrix。
- 待續：**ch59（25 課大章，獨立處理）**；之後 ch03/13/43-45 及技術章除罐頭（技術章時建 RegexTester/JsonTree/HttpInspector 等剩餘 B 元件）。

## ⏭ 待續
- 林董線上驗收版面圖鑑手感（Claude 端 Chrome 擴充沒連、沒法目視截圖）。
- 下一批：`prompt-lab`（餵 AI 全系列/創作章）、ch51 六課全深度內容重寫、`box-model`/`flex-playground` 補滿 ch02/03。
