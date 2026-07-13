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
- ⬜ 續做：吉祥物介紹（三張去背角色卡）、關卡地圖、副本+魔王整併、精選章節、生涯路徑；風格外溢其他頁。

## 🚨 收尾檢查清單（鐵規則）
1. **API / DB / 資料表**：辭典 import 冪等 upsert（DB count 1645 已驗）；機會島更新用 service role update 已回傳確認；本次首頁純前端、無 migration。
2. **UI 接對**：Hero 模式連結指向既有路由（/chapters /quest /agent /opportunities /creator-island /island），沿用既有 i18n key。
3. **RWD**：Hero grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`、文案 `text-center lg:text-left`、圖 `max-w-md lg:max-w-none`；窄屏不溢出。
4. **桌面版**：`max-w-6xl` 置中、留白加大。
5. **PWA**：未動 manifest/sw。
6. **建置**：`tsc --noEmit` ✓、`vitest run` 137 passed ✓、`next build` exit 0 ✓。
7. 先更新本日誌 → 再 commit/push。
8. **機密**：未動 .env.local。
