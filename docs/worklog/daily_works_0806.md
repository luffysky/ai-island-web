# 工作日誌 2026-08-06

> 主題：**/daily Phase 2 主題系統大工程完整落地**——Theme Studio（任意自訂主題）＋字體系統（含 Space 全字體目錄＋後台上傳器）＋背景系統（335 個 canvas 場景＋獨立頁）＋選單玻璃可調＋手機外觀收下拉。收尾補 widget 首頁移植計畫 doc。
> 承接 0805「I段：Phase 2 待續」的清單（2c 字體／2b 背景／2d widget），今天把字體＝Phase 5、背景＝Phase 4、Theme Studio＝Phase 1/3 全做完。
> DB 權限已給、規則：**刪除前先問**（今天所有 migration 全純新增、無刪除）。

---

## A段：Theme Studio 引擎 + DB + 編輯器（Phase 1 / 2 / 3）

- **Phase 1 引擎移植** `7dd7b571`：把 Space `packages/theme-engine` 移植進 `src/lib/theme/engine/`（14 檔，純 TS、僅依賴 zod）。`ThemeDefinition`（13 色 token + typography/surfaces/effects/motion）→ compile 成 CSS var map；**emit key `--sr-*` 重映成 AI 島的 `--color-*`**（背景→bg、surface→bg-card、primary→accent…）。`effectiveTheme(def, mode)` 執行期推導亮/暗變體（保 accent 色相、中和背景）。匯出 `compileThemeToCssVars/CssText`、`effectiveTheme`、`PRESET_THEMES`(~103)、`analyzeTheme`(a11y)、`themeDefinitionSchema`。
- **Phase 2 DB** `64c5b6a0`：`themes` 表（user 自訂主題、jsonb definition、a11y_report、軟刪、RLS owner-only）+ `profiles.active_theme_id`。migration 已跑並驗證。
- **Phase 3a Theme Studio** `6c158dfe`：`/theme-studio` 全功能編輯器（13 色 + 字級/表面/效果/動態、live 預覽走 `applyThemeToPreview`、preset 畫廊、a11y 面板、儲存並套用/只預覽/已存清單）。API：GET/POST `/api/themes`、PATCH/DELETE `/api/themes/[id]`、POST `/api/themes/[id]/apply`（翻 `active_theme_id` + 設 `ai_theme` cookie）。
- **Phase 3b 套用後保留** `ddd70bc1`：SSR inline 注入——`layout.tsx` 讀 `ai_mode`+`ai_theme` cookie → `compileThemeToCssVars(effectiveTheme())` 塞 `<html style>` → 首屏無 FOUC、重整主題不掉。curl 驗證（無瀏覽器）：粉霧亮→`--color-bg:#fff7fb`+粉、暗→推導深底保粉、無 cookie→乾淨預設。

## B段：導覽 / 入口

- **header 色盤改具名下拉** `f81b3952`：森/海/櫻/薰衣草/珊瑚/薄荷，pill 顯示當前色點+名稱、listbox 打勾、點外面/Esc 關。
- **/me 側邊欄分類子項** `844d4d46`：34 連結重整成 5 個可收合分類（學習/內容/AI/帳戶/個人化）、`sticky + overflow` 與右側內容獨立滾動、子項縮排；個人化組加「主題（Theme Studio）／背景」入口；開合狀態存 localStorage。
- **頭像下拉加主題/背景** `d9f0e4b6`：使用者下拉選單「設定」下加「主題／背景」入口（四語 i18n）。

## C段：字體系統（Phase 5a–5e）

- **5a DB 地基** `2438d5d2`：`fonts` + `font_pairs` 表（全域、非 user-scoped，照 Space ADR-016）+ `fonts` storage bucket（public）。RLS 公開讀 enabled、寫入僅 service_role。
- **5b 渲染 + 5c 後台上傳器** `0f285b5b`：
  - GET `/api/fonts`（公開，file_manifest→storage 公開 URL）+ `font-loader.ts`（解析主題 heading/body/ui 三角色→注入 @font-face/`<link>`→設 `--font-*`）+ `<ThemeFontLoader>`（layout 掛一次、讀 ai_theme 套字體）+ Theme Studio 字體面板三個 `<select>`。
  - POST/GET/PATCH/DELETE `/api/admin/fonts`（requireAdmin）+ `/admin/fonts` 頁：上傳 .ttf/.otf/.woff/.woff2（≤15MB）→ Storage → 寫表；同 slug 合併字重；nav-items 內容區加「🔤 字體管理」。
- **5d Space 全字體目錄（免上傳即裝）** `fa11d977`：`scripts/seed-fonts-catalog.mjs` 種 24（後→25）支 Space 字體。**Google Fonts 有的 19 支存 CSS2 API URL（`css_url` 欄）→ Google 做 CJK 動態子集＋CDN 供檔、`enabled=true` 零上傳**（Noto TC/JP/KR、Huninn=jf粉圓、Iansui=芫荽、Inter…）；Google 沒有的 CJK（台北黑體/昭源黑/昭源宋/霞鶩文楷/朱雀仿宋）佔位 `enabled=false` 待上傳。font-loader 加 css_url 分支（受管 `<link data-sr-theme-font>`、冪等加缺移多）。CSP 加 fonts.gstatic/googleapis。後台字體表加「來源」欄。
- **5e 字體中文名 + 清松手寫** `397b24b6`：`fonts` 加 `display_name`（中文名），25 支都給中文（思源黑體/jf open 粉圓/清松手寫體…）。後台字體表 + 上傳表單 + **主題工作室選字下拉**都顯示「中文名（family）」。新增「清松手寫體」(jf-tsingsung, OFL) 佔位待上傳。

## D段：背景系統（Phase 4a + 補滿）

- **Phase 4a** `76301594`：照 Space 移植 v1（procedural 動態粒子 + gradient）。`src/lib/background/scenes.ts`（SceneDef + SCENES）、`ProceduralScene.tsx`（Canvas-2D 粒子引擎、單一 rAF、上限 600、隱藏分頁暫停、prefers-reduced-motion/saveData 只畫底漸層）、`BackgroundLayer.tsx`（全站最底 fixed z-index:-10、`window 'ai-bg-change'` 即時更新、切 `html[data-bg-active]`）。**獨立 `/background` 頁** + BackgroundPicker（6 類 tab + 漸層預設 + 無背景 + 大預覽 + 套用）。POST `/api/background/apply`（寫 `profiles.active_background` + `ai_bg` cookie）。DB：`profiles.active_background jsonb` + `backgrounds` bucket。修入口：TopNav/MeSidebar「背景」/settings→`/background`。
- **補滿 335 場景** `4d5b27f2`：Phase 4a 只搬 93 個，這批把 Space 全部 335 個搬齊（天氣53/星空53/自然57/慶祝56/簡約58/城市夜景58），去重、SceneDef 不變。

## E段：選單玻璃可調（保留玻璃、讓使用者選在哪用）

- `d245ff59`：使用者回報「選玻璃主題後下拉/色盤選單半透明、底下背景銳利透出來糊在一起看不清」（243.jpg 色盤選單根本沒 backdrop-blur）。**保留玻璃、改可調**：
  - 新增 `.menu-surface`（globals）：底色用不透明 `--color-bg-card-opaque`（custom 玻璃主題也不透到底）+ backdrop-blur、透明度由 `--menu-opacity`（0.5 全玻璃→1 實色、預設 0.82）控制。
  - 套到**所有浮動選單**：Popover（下拉共用底＝使用者/通知/待辦/語言全一次修好）、色盤下拉、手機 mobileMenu、桌機 navDrawer。
  - 選單透明度做成使用者可調（localStorage `ai_menu_opacity`、mount 套 :root）。
  - **手機外觀收進頭像下拉**：新增「外觀」區塊（ThemeToggle `menu` 變體）＝模式(暗/系統/亮)+色盤 6 色+透明度滑桿。
  - 內容卡片玻璃不動 → 選單與內容各自決定玻璃程度。

## F段：可編輯 Widget 首頁——移植計畫（先計畫不動工）

- `88a13bc3`：探勘 Space「首頁自由拖拉編輯 widget」整套（自製引擎無外部拖拉套件、只 zod；`WIDGET_REGISTRY` 27 widget + DB `layouts`/`widget_instances` + 手寫格線拖拉/鍵盤 + zod 自動生成設定表單）。使用者選「先只寫計畫」→ 完整藍圖寫成 `docs/widget_homepage_port_plan.md`（DB schema per-user / 照抄清單 grid.ts·config-fields.ts·WidgetGrid·WidgetBoundary / widget 分批 A(免後端)+B(串資料) / 編輯器 / 6 條 API / 分 5 Phase）。

---

## 收尾健檢（鐵規則）

- **建置三連**：`tsc` 0 錯、`vitest` 225 passed（33 檔）、`next build` 綠。
- **DB 欄位審計**（`audit-db-columns.mjs`）：新增 fonts/background/themes API **無錯接**；既有 `✗` 全是動態欄位插值（`${POST_COLS}` 等）假陽性、非本次。466 route 都有 HTTP method。
- **DB↔API↔前端**：themes/fonts/background 三系統 migration 全跑過並驗證（欄位齊、bucket public）；API select 欄位與前端型別對齊。
- **UI 入口**：Theme Studio（me 側欄+頭像下拉）、背景（me 側欄+頭像下拉、獨立 `/background`）、字體管理（admin nav 內容區）、手機外觀（頭像下拉）——全部有入口、非空殼。
- **RWD**：新頁（theme-studio/background/admin fonts）卡片式、grid 響應；選單改 `.menu-surface` 不破版；手機外觀收下拉解決 header 沒位置。
- **PWA**：未動 manifest/service worker；新頁皆 dynamic/client，不影響安裝/離線。
- **DB 權限**：今天所有 migration 純新增（fonts/font_pairs/css_url/display_name、profiles.active_theme_id/active_background、themes 表、bucket）——**無任何刪除**，符合「刪除前先問」。

## G段：筆記環形選單「item 被壓扁成細條」根因修復（回饋 245/247）

- 症狀：環形（旋鈕扇出）選單展開後 item **看不到、點了也沒反應、只會展開/收合**（244/245/247.jpg）。
- 誤判與釐清：一開始以為是「透明」（245）→ 實測 computed `opacity:1`、bg 實心、祖先無 filter/opacity → 非透明。再看 247 放大 = item 被渲染成 **~2px 寬的細直條**。
- **真根因**：每顆 item 圓圈外包「零尺寸 spoke（width:0/height:0）」＋圓圈用 `translate(-50%,-50%) rotate(-angle)` 抵消 spoke 旋轉 ＋ `will-change:transform`（＋我一度加的 `backdrop-filter`）。這串**巢狀 transform + will-change + backdrop-filter** 觸發瀏覽器 GPU 合成 bug，把 32×32 圓「投影壓扁成細條」→ 圓/圖示都沒畫出來，且真正可點區域跟著偏掉 → 點擊穿透到卡片 `toggleExpand`（＝只會展開收合）。程式化 `editBtn.click()` 能開編輯器 → 證明 handler 正常、純渲染/命中問題。
- **修法**（`NoteCard.tsx`）：拿掉 spoke 雙重 transform 與 will-change，改成每顆 item **直接 `translate(x,y)` 定位、不旋轉**（圖示自然正立）→ 圓圈正常、點得到。保留原本**整圈 360° 均分環繞**。
- 同時依回饋改互動：**點旋鈕才展開、再點收合**（移除 hover 展開 + 3.2s 自動收合的競態）、展開時**全域遮罩點外面即收**（桌機手機一致、z 低於項目不擋點）。item 沿用玻璃底＋1px 白邊＋偏移黑線立體感（白 0.86 在淺卡也看得到）。
- 加 `console.debug`（旋鈕開關 / item 點擊 / 點擊落到卡片）只進 console、方便日後在裝置上快速定位。
- tsc 0 錯、vitest 225 passed、next build 綠。

## H段：筆記工具列「背景」選單改懸浮視窗（回饋 246）

- 症狀：工具列「背景」下拉的色票排成一直條、疊在卡片上破版（246.jpg）。
- 修法（`NotesBackgroundPicker.tsx`）：從 `absolute` inline 下拉改成**置中懸浮視窗**（`createPortal` 到 body、半透明遮罩、Esc/點外面關、開啟鎖背景捲動）；色票改 `grid grid-cols-6 sm:grid-cols-8` 整齊格線、`aspect-square`；加標題列＋關閉鈕。tsc/vitest/build 綠。

## I段：LINE 晨報天氣「全端接好但缺一段線」修復 + 兩套定位系統整合（回饋 248）

- 症狀：LINE「今日晨報」Flex 沒有天氣（248.jpg）。
- 追根：`daily-brief` cron **有**接天氣（`weatherFor` → `getCityWeather` → 塞卡片），但只有在 `profiles.geo_city` + `geo_consent_at` 有值時才帶。追下去發現**兩套定位系統、掛錯邊**：
  - 有掛在設定頁的 `PreciseLocationToggle` 走 `geo-precise.ts`：只在瀏覽器取座標→Nominatim 轉區、存 **sessionStorage、完全沒寫回 DB** → 不會設 `geo_city`。
  - 會寫 `geo_city`/`geo_consent_at` 的 `/api/me/geolocation` **只被孤兒元件 `GeolocationConsent` 呼叫**，而它**沒被任何頁面 import** → 無入口。
  - 結果 `geo_city` 對所有人永遠空 → 晨報天氣永遠不出現（有 UI/有 API 但沒真接的典型）。
- **整合（單一入口餵兩邊）**：`PreciseLocationToggle` 啟用時，除了原本的 client 端 geo-precise，**再把座標 POST 到 `/api/me/geolocation` 持久化**（server 反查縣市寫 `geo_city`+`geo_consent_at`）；停用時 DELETE 撤回。刪掉重複的孤兒 `GeolocationConsent.tsx`。設定頁說明加「啟用後晨報會帶天氣」＋好處清單補「🌦️ 晨報天氣」。
- 連帶修：`geo_city` 存的是「縣市 區」帶空格（例：新北市 板橋區），Open-Meteo 單一地名比對兩個詞會查 0 筆 → `geocodeCity` 改成拆空格、由細(區)到粗(縣市)逐一試變體（台化/去尾綴），命中即用。
- 生效：使用者到 **設定 → 精準位置** 啟用後，**下一次晨報**（cron 08:30）就會帶天氣。tsc 0 錯、vitest 225 passed、build 綠。

## J段：孤兒盤點 + LINE 登入/下拉修復 + 死碼清理（回饋 249-252）

- **孤兒功能盤點**（子代理掃 418 元件）：零引用 10 個。真功能缺入口＝`PaywallOverlay`（付費章節遮罩·ChapterView 沒接）、`GeolocationConsent`（已於 I 段整合刪除）、`EmojiButton`（部落格表情鈕沒接工具列）；重構殘留死碼＝`AppSettingsClient`/`DashboardView`/`NextLesson`（舊頁已 redirect）；無害 primitive＝`CodeArea`/`SectionHeader`/`StaggerList`/`MotionCard`。
- **死碼刪除**：`AppSettingsClient`/`DashboardView`/`NextLesson`（三者對應舊頁都 `redirect` 到新頁、零引用）。
- **LINE 登入**（251）：診斷＝**不是壞、是設定沒到位**——`NEXT_PUBLIC_LINE_CHANNEL_ID` 有生效（能發起），卡在 token 交換（`line_token`）。程式端修：①callback `listUsers()` 只撈前 50 → **分頁掃到底**（破 50 人不壞）②token 失敗把 **LINE 真實錯誤**（invalid_client/redirect_uri…）帶到登入頁顯示 ③redirect_uri 前後端**都改用正規 `NEXT_PUBLIC_SITE_URL`**（消除網域不一致）。設定面（GitHub env / Zeabur secret / Console callback URL）需林董操作，寫進 🅰。
- **下拉被裁**（252）：頭像下拉太長、底部項目被裁沒 scroll。根因＝`PopoverPanel` 的 `size` middleware 有給 `maxHeight`、但 class 是 `overflow-hidden` → 超出被裁。改 `overflow-y-auto overflow-x-hidden overscroll-contain`（共用元件、全站下拉一起修好，圓角保留）。
- **待辦主檔改名** `todo_list_0801.md` → `todo_list_0806.md`（沿用內容）；CLAUDE.md 現行主檔引用同步更新；新增〈🆕 0806 收尾批〉整理孤兒 A/B/C、天氣時有時無、FeatureGuide、農民曆 widget、§5 未完。
- tsc 0 錯、vitest 225 passed、build 綠。

## K段：佇列連續清（孤兒/天氣/農民曆·「一個接一個做」）

使用者授權自訂順序連續做完，逐項 commit/push：
- **PaywallOverlay 查明**：全站**無「付費章節」概念**（chapters 無 is_premium、ChapterView 無判斷、server 無 gating；訂閱系統只 gate AI 額度/導師/assistant）→ 非漏擋、是從沒建的功能殘留 UI，所有章節目前免費。留模板；建不建付費章節＝變現決策待定。
- **孤兒清理**：`EmojiButton`（BlogEditor 已用 `AnimatedEmojiPicker` 取代 → 刪）、C 純樣式 `SectionHeader`/`StaggerList`/`MotionCard`（零引用 → 刪）；`CodeArea` 留（之後接程式練習）。
- **天氣「時有時無」修穩**（`DailyDashboard` /daily + `WeatherCard` /fortune）：快取上次成功天氣（localStorage `ai_island_weather_last`）→ 進頁即時顯示、背景刷新；刷新失敗（定位拒/timeout/API 失敗）以 `wRef`+`softFail` **保留上次天氣不清空**。
- **農民曆 widget**（跨 repo）：AI 島新 `CalendarWidget`（國曆月曆格＋每格農曆〔Intl chinese、農曆初一顯月名〕＋今天高亮＋**西元＋民國年**＋今日農曆＋月相）掛進 /daily；**Space `MiniCalendarWidget` 同步升級**（民國年＋每格農曆），push 到 snowrealmspace repo（pre-commit secrets/lint/typecheck 全過）。節氣待補。
- /daily top nav 入口確認**已存在**（`TopNav.tsx`，Sunrise），舊 todo 已完成。

## 收尾健檢 2（0806 晚·鐵規則）

- **DB/API**：`audit-db-columns.mjs` exit 0（`✅ 每支 route 都有 export HTTP method`；`✗` 全是動態路徑插值假陽性、非欄位錯接）。本日**無新 migration**（geo 用既有 `geo_consent` 欄位）。
- **建置三連**：`tsc` 0 錯、`vitest` 225 passed（33 檔）、`next build` 綠（92/92）。Space 端 `typecheck` 綠。
- **UI 入口**：農民曆（/daily）、天氣（/daily·/fortune）、精準位置（設定，補寫 geo_city）、下拉 scroll（全站 Popover）——皆有入口、非空殼。
- **RWD**：農民曆 `grid-cols-7` 響應、天氣卡 flex-wrap；`PopoverPanel` 改 `overflow-y-auto` 手機下拉不再被裁；筆記環形改 translate 定位手機也點得到。桌機同檢無破版。
- **PWA**：未動 manifest/service worker。
- **機密**：無新增金鑰；`.env.local` 未 commit。

## 待續（下次）

- **PaywallOverlay / 付費章節**：變現決策——要建就上 `chapters.is_premium` 欄 + 後台開關 + server gating + 遮罩。
- **FeatureGuide「掉一條」**：需壞掉當下截圖才能重現（目前程式只會收合不會消失）。
- **LINE 登入設定**（🅰）：GitHub 補 `NEXT_PUBLIC_LINE_CHANNEL_ID` + 確認 Zeabur `LINE_CHANNEL_SECRET`/Console callback；重按看 LINE 真實錯誤。
- §5.4 `/settings` 每日晨報開關、§5.7 拖拉 widget 引擎、農民曆節氣。
- 背景 **Phase 4b**：lottie 動態場景（dotlottie-wc）+ 自訂圖片上傳（`backgrounds` bucket 已備）。
- 字體：5 支 CJK 佔位（台北黑體/昭源/霞鶩/朱雀/清松手寫）需去後台上傳字體檔啟用。
- **Widget 首頁**：計畫 doc 已備（`docs/widget_homepage_port_plan.md`），待點頭開工。
