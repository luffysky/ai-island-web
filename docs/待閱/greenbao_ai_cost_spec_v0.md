# 綠寶 AI 導師 · 成本優化 — 開發規格書 v0（SnowRealm 協作版）

**發行單位：** SnowRealm 董事長辦公室
**適用專案：** AI 島（ai-island-web）
**對接體系：** SnowRealm 八人雙軌制（依 `SNOWREALM_TEAM_MASTER.md`）
**本任務實作角色：** 嶼築（Claude 體系．AI 島專案實作工程師）
**文件性質：** 綠寶 AI 成本優化 — 給實作角色執行、Gate 線審核用

---

## 角色編組（本任務）

### 啟用角色（1 位）

**嶼築｜AI 島專案實作工程師**（Claude 體系）
- 本任務職責：依本規格，為綠寶 AI 導師加上「回應快取層」，降低 token 成本。
- 行為準則：守 v0 範圍、一次一批、最小變更、不確定選小的做、回交 Gate 線。
- 回交格式：批次編號、file scope、diff 摘要、驗證方式與結果、已知風險、待釐清項目。

### 待命角色（7 位，YukiBoard 編制）

玄樞（gate 裁定）、衡鑑（code review）、驗衡（QA）、矩衡（架構審計）、雪鑰、鍵律、曉綱、煙汐 — 本任務不啟用，董事長指派才上線。涉及成本/架構的批次，建議經玄樞 gate 裁定。

---

## 0. 背景與問題

### 現況（已查證程式碼）

綠寶 AI 導師的 `src/app/api/ai/chat/route.ts` 目前流程：
取模型 → 取 key → 扣額度 → 建對話 → 取歷史 → **直接呼叫 `streamAI`**。

**問題**：每一句使用者訊息，都直接送 AI 模型燒 token。教學型 AI 導師的提問**重複率極高**（「HTML 是什麼」「Python 要先學嗎」「div 是什麼」這類問題，1000 人會問 1000 次），目前每次都全額燒 token。

### 現況中「已經做對」的部分（不要動）

- `consume_ai_quota` 免費額度限制 — 保留
- `ai_api_keys.monthly_budget_usd` 月預算上限 — 保留（這是成本天花板）
- BYOK 自帶 key、`ai_unlimited` 特權、多 `ai_models` 可選 — 全部保留

→ 現況有「成本天花板」，缺的是「省成本機制」。本任務只補後者，不動前者。

### 本任務的目標

加一層 **精確問題快取（exact-match response cache）**：
相同問題第二次被問到時，直接回快取的答案，**不燒 token**。

---

## 1. 鐵則（嶼築必須遵守）

1. **只加一層快取，不做別的。** 不做 embedding、不做 vector DB、不做語意搜尋、不做 RAG、不做 reranker、不做 AI 分類器、不做模型分級。這些全部明確排除。違反即為越界。
2. **不改現有計費 / 額度 / 預算邏輯。** `consume_ai_quota`、`monthly_budget_usd`、BYOK、`ai_unlimited` 全部不動。
3. **不改前端。** 快取命中時，後端要以「與正常回應相同的串流格式」回放，前端 `AITutorWidget` 無需任何修改。
4. **快取錯了也不能比現在差。** 任何快取相關的失敗（查不到、寫入失敗、表不存在），一律 fallback 到「正常呼叫 AI」，絕不讓使用者收到錯誤。快取是「錦上添花」，不是「單點故障」。
5. **最小變更。** 主要改動集中在 `chat/route.ts` 的「呼叫 streamAI 之前」插入一段快取查詢、「streamAI 完成之後」插入一段快取寫入。其餘邏輯不動。
6. **分批交付**，每批 `tsc --noEmit` 通過、可執行。

---

## 2. 設計：精確問題快取

### 2.1 為什麼是「精確比對」而不是「語意比對」

- 精確比對：把問題正規化後當 key，一模一樣才命中。實作只需一張表 + hash，**十幾行程式碼**。
- 語意比對（embedding / vector）：要 embedding 模型、向量資料庫、相似度門檻調校 —— 那是一個獨立工程，是「核彈炸蚊子」。**本任務明確不做。**

精確比對雖然「換句話問就不命中」，但教學場景有大量**逐字重複**的問題（使用者常直接複製貼上、或問法高度固定），先攔截這批就有顯著效果。語意快取是未來的事，不是現在。

### 2.2 快取會「自己長大」

不需要預先寫 `knowledge.json`、不需要預先想「哪些是固定問題」。機制是：
- 問題第一次被問 → 正常呼叫 AI → **把答案寫進快取**
- 同樣問題第二次被問 → **命中快取、直接回、0 token**

熱門問題問第二次就自動進快取。冷門問題不佔便宜也不吃虧。

### 2.3 命中條件（須全部滿足才算命中）

為了安全，快取命中條件刻意保守：

| 條件 | 原因 |
|---|---|
| 問題正規化後完全相同 | 精確比對的本質 |
| **這是對話的第一則訊息**（無歷史） | 有上下文的問題，答案依賴前文，不能共用快取 |
| `tone` 相同 | 語氣不同、答案風格不同 |
| `contextChapterId` / `contextLessonId` 相同（含都為空） | 章節情境不同、答案不同 |
| `personaId` 相同 | 不同人設（綠寶 / 招財）答案不同 |

→ 只有「乾淨的、無上下文的、情境一致的單句提問」才會命中。這確保快取的答案永遠是合適的。多輪對話中的訊息一律不查快取、不走快取。

### 2.4 正規化規則（normalize）

把問題轉成快取 key 前，先正規化，吸收無意義差異：
- 去頭尾空白
- 全形空白 → 半形、連續空白 → 單一空白
- 轉小寫（英文部分）
- 移除結尾的標點（？?。!～~ 等）

正規化後的字串，用 SHA-256 算 hash 當 key（避免超長字串當 key、也方便索引）。
正規化是「保守的」——只吸收明顯無意義的差異，不做同義詞、不做語意處理。

---

## 3. 分批開發計畫

### 第 1 批 — 快取資料表 + 寫入

**目標**：AI 正常回應完成後，把「問題 → 答案」寫進快取表。此批還不啟用「讀取命中」，先確保寫入正確、不影響現有流程。

**內容**：

1. **Migration** `supabase/ai_cache_migration.sql`：
   ```sql
   CREATE TABLE IF NOT EXISTS public.ai_response_cache (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     question_hash TEXT NOT NULL,          -- 正規化問題的 SHA-256
     question_text TEXT NOT NULL,          -- 原始問題（除錯 / 後台檢視用）
     answer        TEXT NOT NULL,          -- AI 的完整回答
     tone          TEXT,
     persona_id    TEXT,
     context_chapter_id INT,
     context_lesson_id  TEXT,
     model_used    TEXT,                   -- 產生此答案的模型
     hit_count     INT NOT NULL DEFAULT 0, -- 被命中幾次（觀察用）
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     last_hit_at   TIMESTAMPTZ,
     -- 命中條件的完整組合需唯一
     UNIQUE(question_hash, tone, persona_id, context_chapter_id, context_lesson_id)
   );
   CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup
     ON public.ai_response_cache(question_hash);
   ```
   - RLS：此表只由 server（service role）讀寫，不開放前端。可不設 RLS policy 或設為僅 service role。

2. **工具函式** `src/lib/ai-cache.ts`：
   - `normalizeQuestion(text: string): string` — 正規化
   - `hashQuestion(normalized: string): string` — SHA-256（用 Node `crypto`）
   - `writeCache(params)` — 寫入快取（upsert，撞 UNIQUE 就忽略）
   - 所有函式內部 try/catch，失敗只 console.warn、不 throw

3. **接入 `chat/route.ts`**：
   - 在「存 assistant message」成功之後，**追加一段**：若這是對話第一則訊息（無歷史）且 `fullText` 非空，呼叫 `writeCache`
   - 包在 try/catch，寫入失敗不影響回應

**驗收**：問綠寶一個全新問題 → 正常回答 → `ai_response_cache` 表出現一筆。問有上下文的後續問題 → 不應寫入。現有聊天功能完全正常。

---

### 第 2 批 — 快取讀取與命中回放

**目標**：問到「已快取的問題」時，直接回快取答案、不呼叫 AI。

**內容**：

1. **`src/lib/ai-cache.ts` 增加**：
   - `lookupCache(params): Promise<{ answer: string } | null>` — 依 2.3 命中條件查詢；查不到或出錯回 `null`

2. **接入 `chat/route.ts`**：
   - 位置：在「組 messages」之後、「呼叫 streamAI」之前
   - 條件：僅當「無歷史（第一則訊息）」時才查快取
   - 命中時：
     - **仍要存 user message 與 assistant message**（對話紀錄完整、使用者體驗一致）
     - assistant message 標記 `model_used` 為 `cache`、`tokens_input/output` 為 0、`cost_usd` 為 0
     - **以串流格式回放**：`init` 事件 → 把 `answer` 切成小段 enqueue（模擬打字效果，或一次送出亦可）→ `done` 事件
     - 更新該快取列的 `hit_count + 1`、`last_hit_at`
     - **不扣 `consume_ai_quota`**（沒燒 token，不應扣使用者額度）—— 待釐清項，見第 5 節
   - 未命中時：走原本的 `streamAI` 流程，完全不變

3. **快取命中的回放格式**：必須與 `streamAI` 的 SSE 格式完全一致（`data: {"type":"init",...}`、`data: {"type":"text",...}`、`data: {"type":"done",...}`），前端無法分辨、也不需分辨。

**驗收**：
- 問一個全新問題 → 正常燒 token 回答
- **再問一字不差的同一個問題（開新對話）** → 秒回、`ai_response_cache.hit_count` +1、該次 assistant message 的 `cost_usd = 0`
- 換句話問 → 不命中、正常回答（精確比對的預期行為）
- 多輪對話中的問題 → 不走快取
- 關掉快取表（模擬故障）→ 綠寶仍正常運作（fallback 正確）

---

### 第 3 批 — 後台檢視（可選，輕量）

**目標**：讓董事長在後台看得到快取效果。

**內容**：
- 後台 AI 區或數據區，加一個輕量區塊顯示：快取總筆數、總命中次數、命中率（命中數 / 總提問數的概估）、最常被命中的前 10 個問題
- 純讀取 `ai_response_cache`，唯讀、不可編輯
- 若時間有限，此批可延後；第 1+2 批才是核心。

**驗收**：後台看得到快取命中統計。

---

## 4. 明確不做的事（範圍護欄）

以下全部**不在本任務範圍**，嶼築不得自行加入：

- ❌ embedding / 向量資料庫 / 語意相似度比對
- ❌ RAG、reranker、knowledge graph
- ❌ AI 分類器（用模型判斷意圖）
- ❌ 模型分級路由（Haiku / Sonnet 自動切換）
- ❌ `knowledge.json` 預寫固定答案
- ❌ 「省電 / 標準 / 專家」模式切換
- ❌ Z 幣與 AI 模式連動
- ❌ 改動現有計費、額度、預算、BYOK 邏輯
- ❌ 改動前端

> 這些之中有些是好點子（模型分級、模式切換），但屬於「未來的產品決策」，不是「現在的成本優化」。本任務只做「精確快取」一件事。要做其他項，由董事長另開任務。

---

## 5. 待釐清項目（嶼築實作前回報董事長確認）

1. **快取命中時，要不要扣使用者的每日免費額度？**
   - 預設建議：**不扣**（沒燒 token、不佔系統成本，不該消耗使用者額度，對使用者也更友善）。
   - 但若希望「額度 = 提問次數上限」的語意一致，也可選擇照扣。
   - 嶼築依董事長指示實作；未指示前**預設不扣**。

2. **快取要不要過期？**
   - v0 建議：**不設過期**。教學基礎知識（HTML 是什麼）答案穩定、不太需要更新。
   - 若日後教學內容大改，可手動清快取表，或未來再加 TTL。本任務先不做過期邏輯。

3. **快取命中回放要不要模擬打字效果？**
   - 一次送出：最快、最省。
   - 切段模擬打字：體驗與真 AI 一致、使用者無感。
   - 建議切段模擬（體驗一致性），但純屬體驗選擇，嶼築可自行決定，於回交說明。

---

## 6. 預期效果

- 教學型 AI 的提問重複率高，精確快取對「逐字重複的高頻問題」可直接攔下
- 命中的提問：token 成本 = 0、回應速度 = 近乎即時
- 快取自動成長，無需人工維護
- 最壞情況（快取全失效）：退化成現在的行為，不會更差

實際命中率需上線後看 `hit_count` 數據才知道。本任務不誇大效果、以實測為準。

---

## 7. 給嶼築的執行提示

- 一次做一批，做完 `tsc --noEmit` 通過、`npm run dev` 能跑、現有綠寶聊天正常，再進下一批。
- 第 1 批（只寫入、不讀取）先上，確認不影響現有流程，再做第 2 批（讀取命中）。這個順序是安全保險——先確定「加了快取表不會弄壞綠寶」，再啟用命中。
- 所有快取相關程式碼包 try/catch，任何失敗都 fallback 到正常 AI 呼叫。
- 不確定時選小的做、回報「待釐清」，不自行擴張。
- 主要新檔案：`supabase/ai_cache_migration.sql`、`src/lib/ai-cache.ts`。主要修改：`src/app/api/ai/chat/route.ts`（插入查快取、寫快取兩段）。
- 每批回交：批次編號、file scope、diff 摘要、驗證方式與結果、已知風險、待釐清項目，交 Gate 線裁定。

---

*本規格書為綠寶 AI 成本優化 v0。完成並上線後，依實際命中率數據，再決定是否需要 v1（語意快取 / 模型分級）。v1 為獨立任務，非本規格範圍。*
