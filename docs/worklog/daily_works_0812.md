# 工作日誌 0812

## A. 商業閉環總體規劃（三幣體系 Z幣 / AI dot / Coco幣）

需求：整併全站 md 的商業模式內容 → 重新規劃適合 AI 島的完整商業閉環（把 Z幣、AI dot、Coco幣 做成閉環）→ 算月淨利 10 萬 / 50 萬 / 100 萬 的 KPI。

**產出兩份文件（`docs/business/`，純文件、無程式/DB 改動）：**

1. **`business_model_extract_0812.md`** — 現況摘取
   - 用 Explore agent 掃全站 md（grant / product / ideas_os / island / setup / todo / worklog / 待閱）+ 讀 code（`zcoin.ts`/`payments/config.ts`/`ai-quota-config.ts`/`island-economy.ts`/市集 migration）整併。
   - 關鍵發現：真幣只有 **Z幣**；「**AI dot**」＝現有「🔋 AI 能源中心」包裝（非獨立幣）；「**Coco幣**」全站不存在＝需新建；另有 **Dust 碎片塵**（創作島資源、鎖定「非錢」）與 Coco 不同。
   - 挖出 6 處矛盾（3 套定價 / 2 套 Z幣匯率 / 市集抽成 0%·10%·15%…）→ 收斂決策表，**以 code 為準**：Plus149/Pro349、1:10、抽成 **10%**（`notes_market_commission_migration.sql` 實測）。

2. **`ai_island_business_loop_0812.md`** — 全新閉環設計
   - 三幣分工：Z幣＝通用錢包幣（可買 NT$1=10Z）、AI dot＝算力能量條（會歸零）、**Coco幣＝賺得到買不到的社群榮譽幣**（新）。
   - 閉環：錢→Z幣/訂閱→AI dot 學習創作→賺 Coco+Z幣→市集(抽10%)→創作者收入回流→內容供給↑→拉新→回到錢。含 mermaid 流向圖 + 單向閥表（`Z幣→Coco` 關死、`Coco→Z幣` 限額）。
   - 統一 gating 地圖（訂閱層 × 三幣）、創作者飛輪、反通膨/反刷規則、收入結構、合規風險。
   - **KPI 獲利模型**（base：ARPPU NT$250、毛利 80%、轉付費 4%）：
     - 月淨利 10 萬 → ~625 付費 / **1.6 萬 MAU**
     - 月淨利 50 萬 → ~2,800 付費 / **7 萬 MAU**
     - 月淨利 100 萬 → ~5,600 付費 / **14 萬 MAU**
     - 附完整敏感度表（ARPPU 150/250/400 × 轉付費 2/4/6%）+ 營運節奏換算 + 對照 grant `ch9-kpi` 保守模型（ARPU 1500/年≈125/月）+ 現實基線（現真人 MAU≈4、營收 0、金流未開）誠實校準。

**待辦（落地 Coco幣）**：`profiles.coco` + `coco_transactions` + earn/spend/cap helper（比照 `zcoin.ts`）+ 社群 sink + 創作者 Coco→Z幣 限額閥；統一 `requirePaidOrCharge` 402 gate。詳見閉環文件 §9。
