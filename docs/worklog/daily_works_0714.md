# 工作日誌 2026-07-14 — 辭典續批 + 機會核對 + 首頁改版啟動

> 待辦統一 `docs/todo/todo_list_0713.md`；首頁主視覺生成清單 `index-img.md`。

## 今日完成（已上線 / 已 push）
1. **程式辭典續寫**：第 34 批（資料科學/產品分析/AI 安全，42 條）+ 第 35 批（Go/Rust/JVM/C#/C++ 語言專屬 + 底層連結，46 條）→ **1557 → 1645 條**（DB 實測 count）。
2. **DIGITAL+ 數位服務創新補助**：查證官網——115 年度（2026）已於 5/18 截止、尚未開下一梯；整理文件清單 + 時程 + 現在該做 3 件事回覆林董（無對外動作）。
3. **機會島資料核對**：`2026 臺灣數創大賞` 官網原本錯指新聞頁 → 更正為官方站 `iec2026.thu.edu.tw`，並補主辦/報名期程(5/20–7/22)/資格(在學學生)/`source_confidence=verified`。

## 首頁改版（Hybrid 方向，進行中）
- 林董回饋：首頁**太俗太亂、圖不符 AI 島風格、hover/active 呆板、要參賽級**。確認方向＝**Hybrid**（俐落高級 Hero + 下方精簡品牌樂趣）。
- ✅ **`index-img.md`**：13 張 text-free 主視覺生成清單（共用風格區塊 + 負面提示 + 角色設定表 + 尺寸/去背/落點），林董用 GPT 生、Claude 接。核心：**不燒文字進圖**（現有圖燒字＝顯俗主因）。
- ✅ **Hero.tsx 重做**：拿掉 6 張彩虹漸層卡 + emoji 圖示 → 統一品牌三色、Lucide 圖示晶片、中性 surface 卡、大字排版 + 留白、主/次 CTA、模式卡一致化、平順 hover（浮起 + 圖示微轉 + CTA 位移）+ framer-motion 進場。全用 CSS token → **亮暗自動切**。
- ✅ **主視覺換實景**：林董生成的無字 16:9 漂浮 AI 島 → Hero 背景（暗色遮罩 + 白字疊層、亮暗都維持電影感暗帶）；`public/home/hero-island.png`。
- ✅ **連續世界 2.5D 骨架**（`components/home/parallax.tsx` + `world.tsx`）：
  - `Reveal`（滾動淡入）/`ParallaxLayer`（錯速位移景深）/`StarField`（遠白星+近品牌色光塵），全尊重 reduced-motion。
  - `WorldZone`：日→夜固定色背景（黃昏紫→深夜黑）+ 星空景深 + 底部無縫銜接回主題頁；包住 Hero+StageMap。
  - `ParallaxScene`：可重用多圖層視差場景（新圖層 push 進 `layers` 即接入，#6 抽換介面）。
  - `WorldMap`：互動關卡地圖，**節點＝純資料、與圖片解耦**（島名/進度/鎖定/目前章節/點擊全 HTML 驅動）；沒底圖時 SVG 地形降級；底圖可之後抽換 GPT 生的 text-free 地圖。
- ✅ **StageMap 重做**：6 關卡→資料驅動互動節點（可點進該關、狀態化）＋保留文字詳情玻璃卡（SEO/a11y）；`page.tsx` 重排成 Hero→StageMap 相鄰、共處 WorldZone。
- ✅ **元件霧面玻璃**：模式卡/詳情卡改 `.surface-glass`。
- ✅ **StageMap 真實數據**：章數改由 DB 真實資料算（全站 80 章：六大關卡 69 + 速查附錄 11），不再寫死。
- ✅ **接 GPT 路徑層**：`hero-layer-04-path`(alpha) → `stage-path.png` 當地圖底圖，6 節點對齊路點；`WorldMap` 支援底圖/aspect/contain、有路徑不畫 HTML 連線。
- ✅ **淺色模式修正**：世界背景 `.world-zone-bg`/`.hero-bottom-seam` 改隨主題日/夜切（暗=黃昏→深夜、亮=白天天空），星空只夜晚顯示；StageMap/WorldMap 文字改主題 token（淺色不再看不到字）。
- ✅ **Hero 日/夜雙圖**：接 GPT `hero-island-dark`(夜)/`hero-island-light`(日) 同構圖 → `.img-night`/`.img-day` 隨 `[data-theme]` 切；淺色 Hero 是白天島嶼、不再黑。
- ✅ **nav 霧面玻璃**：TopNav＋抽屜改半透明 backdrop-blur。
- ✅ **圖層規格文件**：`index-img.md` 正式化 Stage Map 五層 2.5D 素材規格（`stage-layer-*`、除天空全透明 PNG、五層需同尺寸對齊）、封印舊單張地圖。
- ⬜ 續做：**同尺寸五層** → ParallaxScene 完整 2.5D 場景；副本+魔王；夜景 CTA；吉祥物三角色卡；WorldMap 接真實進度；玻璃外溢其他頁。
- ✅ **手機底部 nav 擋住法律連結修正**：footer 加 `pb-[calc(2rem+3.5rem+env(safe-area-inset-bottom))] md:pb-8` → 隱私權/使用條款/Cookie 在手機不再被 `MobileBottomNav`(h-14 fixed) 蓋住；桌面不變。法律路由 /privacy /terms /cookies build 通過。
- ✅ **全站深/淺色切換稽核 + 修**：subagent 掃全站，實際 offender 6 處（其餘 text-white/black 多在 accent 按鈕/暗圖上＝刻意）。已修：`/quest`(補 root 暗底、arcade 固定暗)、`EloProgress`(萌新/熟手段位字改 `text-gray/slate-500 dark:300`)、`SkillRadar`(PolarGrid 改 `var(--color-border)`)、`LearningDashboard`(Recharts tooltip/grid/axis 硬色改 token)、`ResourceCard`(github chip)、`leaderboard`(銀牌 icon)。MeHero/MeSidebar 本來就 token 化＝OK。
- ✅ **`/agent` 輸入框重排**：textarea 改整整一欄、語音＋執行移到輸入框下面（手機不再擠）。
- ✅ **Agent 任務 cloudflare 401 失敗修**：`resolve-usage-ai.ts` 的 `isQuotaOrTransient` 補 **401/authentication/invalid key** → 某免費 provider(如 Cloudflare Workers AI)金鑰失效時**自動換下一家**、不再一個壞金鑰弄死整個任務。（林董另需去 `/admin/ai/models` 修/停用壞掉的 Cloudflare 金鑰）
- 🚨 收尾檢查：本批多次 `tsc --noEmit`✓ / `vitest` 137✓ / `next build` exit0✓；純前端無 migration；未動 .env.local。

## 🚨 收尾檢查清單（鐵規則）
1. **API / DB / 資料表**：辭典 import 冪等 upsert（DB count 1645 已驗）；機會島更新用 service role update 已回傳確認；本次首頁純前端、無 migration。
2. **UI 接對**：Hero 模式連結指向既有路由（/chapters /quest /agent /opportunities /creator-island /island），沿用既有 i18n key。
3. **RWD**：Hero grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`、文案 `text-center lg:text-left`、圖 `max-w-md lg:max-w-none`；窄屏不溢出。
4. **桌面版**：`max-w-6xl` 置中、留白加大。
5. **PWA**：未動 manifest/sw。
6. **建置**：`tsc --noEmit` ✓、`vitest run` 137 passed ✓、`next build` exit 0 ✓。
7. 先更新本日誌 → 再 commit/push。
8. **機密**：未動 .env.local。
