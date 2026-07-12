# Agent 大工程：對話延續 + 跨對話記憶 + 差異化護城河

> 目標：把 `/agent` 從「單次無狀態任務」升級成「會延續、有記憶、越用越懂你」的行動代理，
> 並做到 **OpenClaw / NemoClaw 這種通用 claw agent 做不到的事**。
> 現況病因見記憶 `agent-platform`：`agent_tasks` 無 thread 欄位、`planNext` 只看當前任務步驟、POST 不帶延續訊號。

---

## A. 對標與定位

| 能力 | OpenClaw / NemoClaw | 我們現況 | 目標 |
|---|---|---|---|
| 持久對話 session | ✅ | ❌ 每任務歸零 | ✅ thread |
| 長期記憶（跨 session） | ✅ | ❌ | ✅ 記憶表 + 能力圖譜 |
| 跨對話互相拉取 | 部分 | ❌ | ✅ 語意檢索舊對話 |
| AgentSkills | ✅ 100+ | ✅ 45 內建 + 自建 | 保持 |
| 本機執行 sandbox | ✅ OpenShell | ✅ 桌面 Bridge + 白名單/逐步確認 | 保持 |

**通用 claw agent 做不到、只有我們能做的（護城河）= 這是重點：**
它們是「裝在你電腦上的通用助理」；我們是「長在一個學習 + 創作 + 競賽生態裡的代理」，
握有它們拿不到的第一方資料與經濟系統：

1. **教育原生（懂你的程度）**：agent 讀得到你的章節/課完成度、測驗歷史、掌握度 → 用你的程度做事、邊做邊教（每一步用你學過的語彙解釋）。通用 agent 不知道「你」會什麼。
2. **能力圖譜（越用越懂你）**：跨對話累積你的技能/作品/目標/資源 → 每次任務自動帶入，不必重問（正是文案小編每次重問的解法）。
3. **生態閉環**：學習島 → 作品 → **機會島**（找競賽/補助）→ agent 幫你用「你真實的作品/GitHub/簡報」準備參賽 → 得獎回饋。通用 agent 沒有你的作品檔案與競賽資料庫。
4. **Z幣 / 遊戲化經濟**：agent 動作可扣/賺 Z幣、綁任務與成就 → 有動機系統，通用 agent 沒有。
5. **社群知識**：agent 可檢索論壇/筆記/辭典（第一方繁中知識），必要時（經批准）代你發問/回覆。
6. **繁中原生 + 在地**：LINE 綁定、繁中語感、台灣競賽/補助脈絡。

> 一句話定位：**「一個懂你會什麼、記得你做過什麼、還能把你一路送上舞台的中文行動代理」** — 這是 claw agent 給不了的。

---

## B. 資料模型（migration：`supabase/agent_memory_migration.sql`）

```sql
-- 1) 對話串（把多個任務串成一段連續對話）
CREATE TABLE agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,                       -- 首則自動摘要
  skill_id uuid REFERENCES agent_skills(id),  -- 這串綁的技能（可換）
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);
-- agent_tasks 加欄位：一個 task = 一個 user turn
ALTER TABLE agent_tasks ADD COLUMN thread_id uuid REFERENCES agent_threads(id) ON DELETE CASCADE;
ALTER TABLE agent_tasks ADD COLUMN turn_summary text;   -- 該回合結果的精煉摘要（給後續回合當前文）

-- 2) 長期記憶（跨對話事實）
CREATE TABLE agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,               -- 'fact' | 'preference' | 'skill' | 'project' | 'goal'
  key text NOT NULL,                -- 例 '受眾'、'常用平台'、'語氣偏好'
  value text NOT NULL,
  source_thread_id uuid REFERENCES agent_threads(id) ON DELETE SET NULL,
  confidence real DEFAULT 0.7,
  embedding vector(768),            -- pgvector：語意檢索（選配、可後補）
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, kind, key)
);
-- RLS：全部 user_id = auth.uid()
```

**跨對話記憶 & 跨對話拉取（回答林董的問題：可以）**
- **記憶注入**：每個新 turn，planNext 先讀 `agent_memory`（該 user 的 fact/preference/skill/project/goal）注入 prompt。→ 這就是「跨對話記得你」。
- **跨對話語意檢索**：用 `embedding` 對「舊 thread 的 turn_summary + agent_memory」做相似度搜尋，把最相關的 3~5 條舊對話摘要拉進當前 prompt。→ 這就是「從別的對話拉相關內容」。沒上 pgvector 前，先用關鍵字/最近 N 串 fallback。

---

## C. 執行流程改動（`src/lib/agent/orchestrator.ts` + API + UI）

1. **POST `/api/agent/tasks`** 收 `threadId`（沒有就建新 thread）；建 task 時寫 `thread_id`。
2. **`runAgentTaskDetached` / `runAgentTask`** 多收 `priorContext`：
   - 同 thread 前幾回合的 `goal + turn_summary`（短期對話記憶）。
   - `agent_memory` 命中項（長期記憶）。
   - （選配）跨 thread 語意檢索命中的舊摘要。
3. **`planNext`** prompt 新增區塊：`【關於使用者的長期記憶】` + `【本串先前對話】` + `【相關的其他對話】`，放在現有 `目前進度` 之前。
4. **回合收尾**：任務結束時，用一次便宜 LLM 呼叫產 `turn_summary`，並抽取新事實 upsert 進 `agent_memory`（去重、更新 confidence）。
5. **UI（`AgentClient.tsx`）**：左側「對話串列表」+「新對話」；`run()` 帶當前 `threadId`；歷史改成可續聊（不再是唯讀 replay）。新增「記憶」面板可看/刪 agent 記住的事。

---

## D. 分階段（每階段可獨立上線、可驗證）

- **Phase A｜對話延續**：`agent_threads` + `thread_id` + priorContext(短期) + UI 聊天串。→ 多輪追問可用、不再重問。
- **Phase B｜長期記憶**：`agent_memory` + 回合抽取事實 + 注入 + 記憶面板。→ 跨對話記得你。
- **Phase C｜跨對話檢索**：pgvector embedding + 語意拉取舊對話。→ 從別的對話拉相關內容。
- **Phase D｜差異化護城河**：接第一方資料（章節掌握度/作品檔案/機會島/Z幣/論壇），做「教育原生 + 能力圖譜 + 生態閉環」。→ claw agent 做不到的事。

---

## E. 驗收
- 同一串問「幫我寫貼文」→ agent 記得上一輪講過的受眾/平台，不再重問。
- 換一串新對話，agent 仍記得「我的受眾是 X」（長期記憶）。
- 問「像上次那個活動文案再來一版」→ 能拉到舊對話（跨對話檢索）。
- Phase D：agent 主動說「你 Ch12 還沒學完、這步我用你會的方式做」/「你這作品符合機會島 3 個競賽」。
