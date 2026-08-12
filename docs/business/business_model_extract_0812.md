# AI 島 · 現有商業模式摘取（跨全站 md 整併）

> 2026-08-12。把散落各處（grant / product / ideas_os / island / setup / todo / worklog / 待閱）的**商業模式、定價、虛擬貨幣、變現、KPI**內容，一次摘取整併到這裡，作為重新規劃閉環的基準線。
> 新的閉環設計 → [`ai_island_business_loop_0812.md`](./ai_island_business_loop_0812.md)。
> ⚠️ 這份是「現況盤點」：內含**多處互相矛盾的版本**，已在 §9 逐一標記，重新規劃時以此為準決定收斂方向。

---

## 0. 一眼看懂現況

- **真正在跑的幣只有一種：Z幣（`profiles.z_coin` + `coin_transactions`）。** 其餘都是它的包裝或衍生。
- **「AI dot」＝「AI 能源中心」**：不是獨立幣，是「每日 AI 額度 + Z幣 overflow + BYOK + 點數代管」的 UX 包裝（🔋 能源條）。
- **「Coco幣」目前不存在**（全站 grep 僅測資），是要新增的幣。
- **「Dust 碎片塵」**：Ideas OS / 創作島的創作資源，**被鎖定為「永遠不是錢、不可與 Z幣互換」**（ADR-004）——與未來 Coco 是不同東西，別混。
- **矛盾很多**：至少 3 套定價、2 套 Z幣匯率、市集抽成 3 個數字（0%/10%/15%）——見 §9。
- **真實營運基線很小**：累積註冊 17、真人 MAU ≈4、營收 0、付費 0（grant `ch0-baseline-honesty.md`）。重新規劃的 KPI 要以此為起點，別自我感覺良好。

---

## 1. 虛擬貨幣 / 代幣經濟

### 1.1 Z幣（Z Coin / `z_coin`）— 唯一真幣
- **定義**：`docs/ideas_os/00_LOCKED_DECISIONS.md` D7 + `ADR/ADR-003`：Ideas OS 的 Z Coin **就是**既有平台 Z幣，餘額 `profiles.z_coin`、帳本 `coin_transactions`，**不另開第二餘額、不做匯兌**。Workspace Wallet 是「同一個 Z幣單位」的共享額度（新表）。
- **賺取費率**（`docs/product/PRICING_STRATEGY.md §2`）：註冊 100z、完 1 lesson 80z、完 1 quiz 50z、AI 對話 1 次 40z、採集 60z、走 100 步 10z。**每天全活躍 ≈ 240z/天 ≈ 7,200z/月**。
- **推薦**（`ch5-business-model.md §5.5`）：邀請碼註冊雙方各 **50 Z幣**（已實作、冪等帳本）。
- **消耗 sink（規劃）**（`PRICING_STRATEGY.md §2`）：寵物換裝 500–2000z、盲盒 1500z、升級蛋 5000z、主題/頭像框 800–3000z、自訂 emoji 300–1000z、解鎖隱藏章節 2000z、AI +5 次/月 500z、履歷模板 1000z、**折抵訂閱 10000z=月訂折 NT$100 / 30000z=年訂折 NT$500**。
- **實作事實**（code）：`src/lib/zcoin.ts` `grantZcoin/spendZcoin/grantZcoinOnce`（冪等靠 `meta.order_no`）；每日「持續型」賺幣上限＝島嶼 500z/日（`src/lib/island-economy.ts`）。

### 1.2 AI 能源中心（＝使用者口中的「AI dot」）
- **不是獨立幣**，是 AI 每日額度的包裝：`docs/island/agent_island_plan.md`、`分身島.md`、`待閱/Agent2.md`——「🔋 AI 能源中心」＝ BYOK（綁自己 key、成本≈0）＋ Z幣 overflow ＋ 免費每日額度 ＋ **點數代管**（不懂 API 的人直接買「AI 島點數」）。
- **實作**（`daily_works_0710.md §四` + `src/lib/ai-quota-config.ts`）：免費 100 次/日；高階每日限額（免費 3 / Plus 20 / Pro 100）；超額續用**免費模型 2 Z幣、高階 20 Z幣**（RPC `consume_ai_quota_v2` 原子扣）；前端 `/me/energy`（EnergyCenter）。

### 1.3 Dust（碎片塵）— 創作資源，明定不是錢
- `ADR-004-dust-separate-resource.md` + `00_LOCKED_DECISIONS.md` D8：**Dust 是創作資源、永遠不是錢、不可與 Z幣互換、無提領**。賺自重複碎片/創作/回收/活動；花在額外碎片蛋、進化加速、特殊創作模式、品質升級、融合 reroll。理由＝避免賭博/代幣陷阱。

---

## 2. 定價 / 訂閱 / 方案（⚠️ 三套並存）

**方案 A — `docs/product/PRICING_STRATEGY.md`（v1.0，2026-05-29「中庸版」）**
| 項目 | 價 | 內容 |
|---|---|---|
| 單章買斷 | NT$149（永久） | 單章 |
| 月訂 | **NT$399** | 全 75 章 + AI 無限 + Discord VIP（AI 成本 ~90/月、毛利 77%） |
| 年訂 | **NT$3,499** | 27% off |
| 早鳥半年 | NT$999 | 限前 100 名 |
- 保守變體：單章99/月訂249/年訂2499；高端變體：單章199/月訂599/年訂4999 + 1對1 導師 NT$1999/月。

**方案 B — `docs/grant/ch5-business-model.md §5.4`（Plus/Pro 兩層，grant 版）**
| 層 | 價 | 定位 |
|---|---|---|
| 免費 | NT$0 | 全教材 + AI 導師(限次) + 筆記基礎 + 社群 + 遊戲化 |
| 學習 Plus | **NT$149/月（年 1,490）** | AI 更多次 + 中階模型、筆記全功能、離線、無廣告 |
| 求職 Pro | **NT$349/月（年 2,990）** | 高階模型、模擬面試、履歷/作品、證書優先、優先客服 |
| BYOK | 免費 | 自帶 key、無限用 |
| Z幣（一次性） | NT$100–2,000 | 額外測驗、市集（越儲越送） |
- 海外 MoR：NT$149≈US$4.7、NT$349≈US$10.9。

**方案 C — 實際上線的 `src/lib/payments/config.ts`（=`setup/payments_setup.md §五`）**
- `PRO_PLANS`：Plus 149/月・1490/年；Pro 349/月・2990/年（**這是 code 現值，最新**）。
- ⚠️ 但後端 gating 多數只是布林 `isPro`，plus/pro 分層 gate 大多未落地（`ch5 §5.4` 自承技術債；唯一分層＝高階模型要 pro）。

**機會島自己的分層**（`opportunity_island_spec.md §9`）：免費 → Pro(月費) → Team → Enterprise（V2 起開 Pro、Team/Enterprise 在 V5）。

---

## 3. 變現 / 營收模型

- **`ch5-business-model.md §5.2` 營收表**：Freemium + 多元變現。來源＝Pro 訂閱(✅)、Z幣儲值(✅ 5 檔)、筆記市集抽成(✅)、Creator Island 創作經濟(交易✅/提領🟡)、B2B 機構(未來)。**誠實註記：商業登記完成前無法真收款、營收＝0。**
- **`MASTER_TODO.md`**：paywall / 單章購買 / 訂閱（`chapter_purchases`/`subscriptions`）已實作；referral 分潤（`referral_codes`/`referral_commissions`）；完整 Marketplace（Z幣 phase1）。
- **`AI_ISLAND_新功能建議_2026-05-30.md`**：主題＝優先深化既有閉環 + 補變現缺口。變現點子：B1 自動評測+AI code review、B4 可驗證證書+課程市集、B5 職缺媒合板（雇主付費刊登/抽成）、B6 1對1 導師預約市集、C1 學習社群/cohort。
- **市集抽成**：`10_MARKETPLACE.md` 規格寫「例如 15%」；`MASTER_TODO` 說 as-built 0%；**但實際 code `notes_market_commission_migration.sql` 已是抽 10%**（買家付全額、作者收 90%、10% 為平台收入）——**code 為準＝10%**。
- **定位一句話**（`full-plan.md`）：「學習 → AI 陪練 → 產出 → 社群 → 求職/變現」串成閉環。

---

## 4. 金流 / 付款 / 儲值

- **權威文件 `docs/setup/payments_setup.md`**：課程免費；金流只用於 **Z幣儲值 + Pro 訂閱**。
  - 台灣一次性 → 綠界 ECPay + 藍新 NewebPay；海外 → Lemon Squeezy + Paddle（MoR/USD）；Pro 訂閱 → Stripe（`/api/me/checkout`，但台灣多半用不到）。
  - 冪等：Z幣 靠 `coin_transactions.meta.order_no`；Pro 延長 `subscriptions.expires_at`。帳本：`coin_transactions`/`orders`/`subscriptions`。
  - `MOR_USD_RATE=32`；`PAYMENTS_LIVE=1` 切正式。
  - 手續費：綠界/藍新 ~2.75%；Stripe 2.9%+NT$10（國際卡+1.5%）。
  - **正式收款前需商業登記（統編）。**
- **`STRIPE_SETUP.md`**：env `STRIPE_PRICE_ID_MONTHLY/YEARLY/SINGLE`、webhook，價格對齊 `config.ts`。
- **Store UI**：`/store`（儲值/Pro）、`POST /api/payments/checkout`、各 provider webhook；只顯示有設 key 的 provider。

---

## 5. KPI / 轉換 / ARPU / churn / 留存（現有目標）

- **`PRICING_STRATEGY.md §5` 上線 KPI**：月訂轉換 ≥3%；年訂佔比 ≥35%；**Churn ≤8%/月**；**ARPU ≥ NT$250**；AI 成本比 ≤30%。三個月決策表：轉換<2%→降 299；活躍>70%→升 499；churn>15%→補功能；AI 成本>40%→收緊 token。
- **`ch9-kpi.md` grant 模型**：
  - 商業化：付費轉換 0%→Y1≥3%→Y2≥5%；病毒係數 K→Y1≥0.3、Y2≥0.5。
  - 用戶：累積註冊 **17**→Y1≈4,000→Y2≈14,000；真人 MAU ≈4→Y1≈1,000→Y2≈4,000；次月留存 Y1≥25%/Y2≥35%。
  - 學習：完課率 Y1≥30%（vs MOOC 3.13%）、Y2≥40%。
  - **§9.8 反推**：Y1 行銷 60萬、CPR NT$150、註冊→啟用 50%、免費→付費 3%、**付費 ARPU NT$1,500/年**（Plus1490 + Pro2990 + Z幣混合）→ Y1≈4,000 註冊/≈120 付費/**年營收≈18萬**；Y2≈14,000 註冊/≈700 付費/**年營收≈105萬**。誠實註記：補助兩年營收尚不足自立。
- **現況誠實基線**（`ch0-baseline-honesty.md`）：註冊 17、真人回訪 ~4、營收 0、付費 0、證書 0。

> 換算：既有模型 ARPU NT$1,500/年 ≈ **NT$125/月**（偏保守）。新閉環模型（`ai_island_business_loop_0812.md §8`）用 base ARPPU NT$250/月＝把「訂閱 + 儲值 + 加購」混合拉高後的目標值；兩者以「保守/目標」並列看。

---

## 6. 功能 × 免費/付費/Z幣 對照（重建，無單一原始檔）

| 功能 | 免費 / 付費 / Z幣 | 來源 |
|---|---|---|
| 全教材(80章/1258節) | 免費 | ch5 §5.4 |
| AI 導師/助教 | 免費(auto/限次)→Plus(中階)→Pro(高階) | ch5；daily_0710 |
| AI 續用超額 | Z幣：免費 2/次、高階 20/次 | daily_0710 §四 |
| 模型選擇 | 免費不能選；Plus 中階；Pro 高階 | daily_0710 §二 |
| 模擬面試/履歷/作品/證書優先 | Pro | ch5 §5.4 |
| 筆記全功能(知識樹/SRS/協作)/離線/無廣告 | Plus | ch5 §5.4 |
| 隱藏章節 | Z幣 2000z 或 單章 NT$149 買斷 | PRICING；MASTER_TODO |
| 寵物換裝/盲盒/升級 | Z幣 500–5000z | PRICING §2 |
| 主題/頭像框/emoji | Z幣 300–3000z | PRICING §2 |
| 履歷專業模板 | Z幣 1000z | PRICING §2 |
| AI 對話 +5次/月 | Z幣 500z | PRICING §2 |
| 筆記市集販售 | 平台抽 10%（code） | 市集 migration |
| 運勢/塔羅 | 免費 1/日・付費無限 | mass-market |
| 訊息軍師 | 免費 3/日・付費無限 | mass-market |
| AI 求職包(自傳/求職信) | 免費 3/月・付費更多 | mass-market |
| 機會島進階 | Pro 月費 | opportunity §9 |
| 分身島(agent)動作 | BYOK / Z幣 overflow / 每日額度 | agent_island_plan |

---

## 7. Z幣 匯率 / 儲值包 / 每日上限（⚠️ 兩套匯率）

**版本 1 — 實作 `config.ts`（`payments_setup.md §五`）**：1:10、越多送越多——`100→1000 / 300→3300 / 500→5750(popular) / 1000→12000 / 2000→25000`。（**code 現值**）

**版本 2 — `PRICING_STRATEGY.md §2` 提案**：試水60→100z(1:1.67)、標準199→400z(1:2.0)、划算499→1200z(1:2.4)、大戶999→2800z(1:2.8)。理由＝低門檻、買多送多、毛利近 100%（Z幣無 AI cost、只有金流費）。

- **每日賺幣**：全活躍 ≈240z/天；免費 AI 100 次/日。
- **雷區**（`PRICING_STRATEGY.md §3`）：❌免費 7 天無卡試用、❌月訂<NT$200、❌單章>NT$200、❌年折<20%、❌**Z幣 1:1 等價 NT$（無消費誘因）**。

---

## 8. 可變現功能盤點（逐項）

- **運勢/fortune**：widget + `/fortune`，免費 1/日、付費無限（`mass-market`）。
- **訊息軍師**：`/message-coach`，免費 3/日、付費無限。
- **求職包/履歷/模擬面試**：Pro；求職包月配額 3/月（`requireAiAction`）。
- **章節**：免費全開；隱藏章 Z幣 2000z 或單章 NT$149。
- **辭典**：agent 知識來源；無直接變現。
- **寵物**：Z幣 sink 主力（500–5000z）+ tier-gated AI 聊天。
- **主題/背景**：Z幣 sink（800–3000z）；335 場景 widget 免費。
- **Widget 首頁 `/home`**：已建引擎（本專案 0806-0807），**尚未定義變現**。
- **Creator Island / Ideas OS**：`10_MARKETPLACE.md`（Z幣 phase1、抽成、workspace wallet、entitlement/授權/評論/DMCA）；`12_GROWTH_ENGINE.md`（Creator XP/DNA/coach＝純分析、不 gate 不收費、DNA 卡片＝自然獲客）。護欄 E10：核心創作免費 + 每日免費 Dust、Z幣只收「高階模型/大量生成/商用級輸出」，**不可每個動作都收 Z幣**（反代幣陷阱）。
- **家譜**：⚠️ `MASTER_TODO` 標 done，但 grant 誠實文件明說「不存在/勿承諾」——當 demo 紅線。

---

## 9. ⚠️ 需要收斂的矛盾（重新規劃時的決策點）

| # | 矛盾 | 各版本 | 建議收斂 |
|---|---|---|---|
| 1 | 定價 | A：月399/年3499 ‖ B：Plus149/Pro349 ‖ C(code)：Plus149・Pro349 | **以 code(C) 為準**：兩層 Plus149/Pro349，A 的 399 單層作廢 |
| 2 | Z幣匯率 | code：1:10 起 ‖ 提案：1:1.67→1:2.8 | **以 code 1:10 為準**；提案的「低門檻 60 元包」可作為新增小額檔 |
| 3 | 市集抽成 | 規格 15% ‖ TODO 0% ‖ **code 10%** | **以 code 10% 為準** |
| 4 | plus vs pro 分層 | 規格分兩層 ‖ 後端多為布林 isPro | 落地 tier-aware gating（技術債） |
| 5 | 家譜 | TODO done ‖ 誠實文件「不存在」 | 不對外承諾 |
| 6 | 幣種命名 | 使用者說 Z幣/AI dot/Coco ‖ 實際 Z幣/AI 能源/Dust | AI dot＝AI 能源；Coco＝新增；Dust 維持「非錢」不動 |

---

### 附：本摘取涵蓋的檔案索引
- **grant/**：`ch5-business-model.md`(主)、`ch9-kpi.md`(KPI)、`ch6-cost.md`、`ch8-budget.md`、`creator-island.md`、`full-plan.md`、`ch0-baseline-honesty.md`、`pitch-deck*`、`swot.md`、`business-registration-checklist.md`。
- **product/**：`PRICING_STRATEGY.md`(主)、`ai_upgrade_plan.md`、`綠寶建議.md`、`quest_games_spec.md`。
- **ideas_os/**：`00_LOCKED_DECISIONS.md`、`10_MARKETPLACE.md`、`12_GROWTH_ENGINE.md`、`02_CREATOR_ISLAND_PRD.md`、`ADR/ADR-003`、`ADR/ADR-004`。
- **island/**：`opportunity_island_spec.md`、`機會島.md`、`agent_island_plan.md`、`分身島.md`。
- **setup/**：`payments_setup.md`(主)、`STRIPE_SETUP.md`。
- **todo/**：`BACKLOG.md`、`MASTER_TODO.md`、`todo_list_0806.md`、`todo_list_0713/0714.md`。
- **worklog/**：`daily_works_0710.md`(Z幣經濟/AI 分層/定價，主)、`daily_works_0714.md`(能源中心 UI)。
- **待閱/**：`AI_ISLAND_新功能建議_2026-05-30.md`(變現缺口，主)、`Agent2.md`(點數代管)。
- **code**：`src/lib/zcoin.ts`、`src/lib/payments/config.ts`、`src/lib/ai-quota-config.ts`、`src/lib/island-economy.ts`、`supabase/notes_market_commission_migration.sql`。
