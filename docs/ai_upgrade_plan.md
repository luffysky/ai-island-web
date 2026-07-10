# AI 全面升級規劃書（所有 AI 導師 / 綠寶 / 學伴 / 後台 Nami）

> 產出日期：2026-07-10。依兩份原始碼盤點（學員端 AI × 後台 Nami/共用基建）整理。
> 現況一句話：**旗艦「AI 導師」`api/ai/chat` 是唯一全配的**（串流＋RAG＋記憶＋語意快取＋視覺＋分層/Z幣＋成本記帳）；其餘 AI 大多只用到工具箱一半，且 `streamAI` 出口成本記帳有真實破洞。

---

## 0. 共用工具箱（每個 AI 其實都「可以」用、但多半沒用）

| 工具 | 檔案 | 提供什麼 |
| --- | --- | --- |
| 多供應商 + 自動 fallback + 自動記帳 | `src/lib/ai-providers.ts` `callAI` (:352) | 跨供應商重試、`logAiUsage` 自動記 |
| 串流 SSE（**不自動記帳**） | `ai-providers.ts` `streamAI` (:393) | 回傳 token/cache 數，呼叫端要自己記 |
| 使用鍵智慧路由 | `src/lib/resolve-usage-ai.ts` `completeForUsage` (:182) | 候選鏈＋熔斷＋低信心升級（非串流） |
| 語意回應快取 | `src/lib/ai-cache.ts` `lookupSemanticCache` (:85) | pgvector `match_ai_cache` 0.93、只快取首則 |
| RAG 教材檢索 | `src/lib/ai-embeddings.ts` `vectorSearchLessons` | `match_lessons` 向量搜尋 |
| 跨頻道長期記憶 | `src/lib/user-ai-memory.ts` | `loadUserMemory` + summarize-memories cron |
| 分層授權 | `src/lib/ai-tier-gate.ts` `gateHighTierModel` (:15) | 高階模型只給 Pro/特權/BYOK |
| 配額 + Z幣 | `ai-quota-config.ts` + RPC `consume_ai_quota_v2` | 免費100/日、超額扣 Z幣 |
| 瀏覽器免費推論 | `src/lib/webllm.ts` | WebGPU 本地跑、server $0 |
| 成本記帳唯一寫入點 | `src/lib/ai-usage-log.ts` `logAiUsage` (:26) | 算成本、`inc_model_usage` + `inc_system_key_usage` |

---

## 1. 現況能力矩陣（學員端）

| Surface | 串流 | RAG | 記憶 | 快取 | 視覺 | 工具 | 分層 | 成本記帳 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AI 導師 `api/ai/chat` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ v2+Z幣 | ✅ 但缺 inc_model_usage |
| 創作者綠寶 `creator-island/ai/chat` | ❌ | ❌ | 半(長期) | ❌ | ✅ | ❌ | ❌ | 半 |
| 寵物 `pet/chat` | ✅ | ❌ | ✅ 滾動+共用 | ❌ | ❌ | ❌ | ✅ 舊quota | 半 |
| AI 助教/學伴 `ai/assistant` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 舊quota | 半 |
| 模擬面試 `me/mock-interview` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 半(只擋start) | 半 |
| Pop-quiz `chapter/pop-quiz` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌(只rate) | 半 |
| 學習計畫 `me/learning-plan/generate` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ resume池 | 半 |
| 履歷 `me/resume/generate` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ token cap |
| 每週挑戰評分 `me/challenge` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 半 |
| 部落格助手 `blog/ai-write` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌(只budget) | 半 |
| LINE/TG/Discord 雪鑰 | ✅/❌ | ✅工具 | ✅ | — | — | ✅ | 視情況 | ✅ |
| 導師/學伴媒合 `me/mentor` | — 非 AI，真人依主題重疊媒合 — | | | | | | | |

**後台 Nami**：`admin/playground/ai-help`（vision, callAI, 有記帳）、`admin/assistant`（completeForUsage, 有記帳）、一堆生成器（callAI, 有記帳）——但 **`admin/quiz/generate` 用 streamAI、完全沒記帳**。全部只 `requireAdmin()`、不吃配額。

---

## 2. 成本記帳破洞（最高優先，對應林董「成本沒真正抓到」）

`streamAI` 不會自動記帳 → 以下出口有洞：
- **`src/app/api/admin/quiz/generate/route.ts:92`** — streamAI、**零記帳**（maxTokens 8000，最大單筆黑洞）。
- **`src/app/api/pet/tick/route.ts:121`** — streamAI、**零記帳**（背景寵物 tick，量可能大）。
- **`src/app/api/ai/chat/route.ts:384`** — streamAI；有記 `ai_messages.cost_usd`、`upsert_ai_usage`、`inc_system_key_usage`，**但沒呼叫 `logAiUsage`/`inc_model_usage`** → **per-model 儀表板漏掉全站最大宗**。
- 正確示範對照：`pet/chat/route.ts:290-293` 串流收尾有手動 `logAiUsage`。

**修法**：抽一個 `streamAndLog()`／在既有 stream 收尾統一補 `logAiUsage`，讓「每個 streamAI 出口都記帳」，並讓主聊天用量也進 `inc_model_usage`（或把 `logAiUsage` 收斂成唯一 sink，避免重複計）。

---

## 3. 分階段計畫（P0–P4）

### P0 — 成本記帳補完（低風險、純加記帳不改行為）✅ 已做
- [x] `admin/quiz/generate`、`pet/tick` 串流收尾補 `logAiUsage`（capture done chunk usage → logAiUsage）。
- [x] 主聊天 `ai/chat` 補 `inc_model_usage`（放在既有 `!useBYOK` 區塊內、用實際回答模型 `usedProvider/usedModel`、不重複計 `inc_system_key_usage`）。
- [ ] （選配）抽共用 `streamAndLog` helper；目前三個出口已直接補齊、暫不重構。
- [ ] 驗收：後台 `ai-cost` / `admin/ai/usage` 能看到這幾個來源的 token/成本（需上線後觀察）。

### P1 — 創作者綠寶補漏（省錢/防爆）　【決策：只擋高階、保持免費，軟上限預埋預設關】
- [x] `creator-island/ai/chat` 套 `gateHighTierModel`（高階模型免費/Plus 自動降 mid/low、防禦式：失敗保持原模型；money-leak 已堵）。
- [ ] 改 `callAI` → `streamAI`（＋前端 IslandChat 接串流）。← 較大、需同步改前端
- [ ] 接語意快取 `lookupSemanticCache`/`writeCache`。
- [ ] 加「每日軟上限」config（`ai-quota-config.ts` 新增 `CREATOR_DAILY_SOFT_CAP`，**預設關/很大**；濫用再開，可選接 `consume_ai_quota_v2`）。
- [x] 成本記帳：creator chat 走 `callAI`（已自動 `logAiUsage`）→ 本來就有記，無需補。

### P2 — 語意快取推廣（省 token）
- [ ] `chapter/pop-quiz`（同課同題最明顯）、`learning-plan/generate`、`blog/ai-write`、`ai/assistant` 接 `lookupSemanticCache`/`writeCache`。
- [ ] 驗收：後台快取命中率（`admin/ai/cache`）上升。

### P3 — 路由統一 + 補洞
- [ ] 裸 `callAI` 的 `mock-interview`/`challenge`/`resume`/多數 admin 生成器 → 改 `completeForUsage`（候選鏈＋熔斷＋升級＋記帳一次到位）。
- [ ] **模擬面試補洞**：目前只 `requireAiAction("interview")` 擋 `start`，`answer`/`finish` 免費無限 → 每回合都計。
- [ ] 移除重複的本地 `providerFromModel`（`mock-interview/route.ts:11`）。
- [ ] `rewrite-lessons`/`embeddings/backfill` 的 raw fetch 評估是否收回 `ai-providers`（拿 fallback）。

### P4 — 能力擴充
- [ ] RAG：`ai/assistant`（hint/recommend）、`mock-interview`、創作者綠寶 加 `vectorSearchLessons` 接地。
- [ ] 視覺：`mock-interview`（白板/設計截圖）、`ai/assistant` `grade_draft`（手寫作業拍照）。
- [ ] 配額統一：舊 `consume_ai_quota`（pet/assistant）→ `consume_ai_quota_v2`，讓它們也有 Z幣 overflow UX。
- [ ] 評估後台重複生成器（blog/forum/notes/quest seed）接快取。

---

## 4. 決策紀錄
- **創作者綠寶配額**：採「**只擋高階模型、聊天保持免費**」+ 預埋每日軟上限（預設關）。理由：Creator Island 是成長型第二產品線，早收費會嚇跑創作者；真正燒錢的是「免費用戶無限跑高階模型」，`gateHighTierModel` 即可堵。出現濫用再開軟上限/接 Z幣。

## 5. 風險 / 注意
- 記帳收斂要小心**重複計**：`ai/chat` 已有 `upsert_ai_usage`/`inc_system_key_usage`，補 `inc_model_usage` 時確認語意不重疊。
- 串流化創作者聊天需同步改前端 `IslandChat.tsx` 的接收邏輯（目前吃 `{reply}`）。
- 語意快取只快取「首則」——多輪對話後段不快取是刻意設計，勿誤加。
