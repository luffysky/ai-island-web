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

## 待續（下次）

- 背景 **Phase 4b**：lottie 動態場景（dotlottie-wc）+ 自訂圖片上傳（`backgrounds` bucket 已備）。
- 字體：5 支 CJK 佔位（台北黑體/昭源/霞鶩/朱雀/清松手寫）需去後台上傳字體檔啟用。
- **Widget 首頁**：計畫 doc 已備（`docs/widget_homepage_port_plan.md`），待點頭開工。
