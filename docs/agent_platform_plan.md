# AI 島行動代理系統（Agent 平台）— 架構規劃書 v0

> 立項：2026-07-10。來源分析：`docs/待閱/Agent.md`。本檔＝**架構/資料流/資料表/API contract/WebSocket 事件/Tool 介面/權限模型/目錄結構/分階段 task list**。**此階段只出設計、不寫大量實作、不把 Agent 迴圈塞前端。**

---

## 0. 一句話定位與範圍

> **AI 島行動代理：讓不會寫程式的人，也能安全指揮 AI 完成數位任務。** 把 AI 島上的學習與思考，延伸到瀏覽器、電腦、手機與外部服務；所有操作皆透過**明確授權、可視化步驟、可中止、失敗可回復**執行。

**差異化（接 AI 島靈魂「降低 AI 時代的恐懼」）**：不是做通用 Agent 模型，而是做**面向初學者的安全操作層、教學層、任務模板平台**——底層模型可換，核心價值在**權限透明、步驟可視化、失敗可回復、且使用者能從「用 Agent」進一步學會「建 Agent」**。這是第三座島（學習島 / 創作島 / 行動島）。

**🎯 MVP 範圍（只做這些，其餘全部往後放）：**
- 平台：**Windows + 瀏覽器**（Android 第二階段、iOS 最後、macOS 視需求）。
- 能力：開 App / 開網址 / 操作隔離 Chromium / 讀取指定資料夾 / 建改文字檔 / 執行白名單終端指令 / 截圖 / 操作 VS Code / 跑 AI 島專案測試 / 每一步可視化 / 所有寫入先確認。
- **端到端 Demo（唯一閉環）**：使用者從 AI 島（手機或網頁）下令 → 桌面助手開指定 AI 島專案 → 跑測試 → 收集錯誤 → 分析原因 → 提出修正建議，**未取得確認前不得改任何檔**。

**⛔ 非目標（MVP 不碰）**：iOS 全面控制、任意付款、系統管理員操作、背景偷跑、接管使用者現有瀏覽器登入態、多裝置技能商店。

---

## 1. 整體架構

```text
使用者（AI 島網頁 / 手機 / 語音）
      │  自然語言目標
      ▼
┌─────────────────────────────────────────────┐
│ Agent Core（任務大腦，server-side、非前端）    │
│  planner(LLM) → tool router → permission →   │
│  execute → observe → verify → 重試/下一步/完成 │
│  + 最大步數上限 + 任務狀態機 + 中止            │
└───────────────┬──────────────┬───────────────┘
                │              │
       Tool Registry     Approval Engine（L0–L4）
       （JSON Schema、    Credential Broker（本機、Agent 不碰明文）
        風險等級、平台）
                │
      ┌─────────┴──────────┬───────────────┐
      ▼                    ▼               ▼
 Browser Worker      Device Bridge      API / MCP 工具
 （Playwright、      （本機助手 Electron→   （Gmail/Calendar/
  獨立 Chromium、     Tauri、WebSocket、    GitHub/Supabase/
  DOM/Role/A11y）     檔案/App/終端/截圖）   Notion… 直接打）
                │  WebSocket（控制通道）
                │  WebRTC（畫面串流，正式版）
                ▼
      使用者的 Windows / 之後 Android
```

**元件職責：**
| 元件 | 職責 | MVP 技術 |
|---|---|---|
| **Agent Core** | 理解目標→拆步→選工具→執行→觀察→驗證→重試/完成；狀態、上限、中止 | Node.js + TypeScript（獨立 service；MVP 可先跑在 AI 島 node server 的獨立 worker，**不放前端**）；模型走 AI 島現有 `ai-providers.ts`（`completeForUsage`／tool-use） |
| **Tool Registry** | 定義所有可執行能力（schema/風險/平台/驗證/結構化結果） | TS + JSON Schema（`packages/tool-sdk`） |
| **Approval Engine** | 風險分級 + 確認流程 + 稽核 | Supabase 表 + WS 事件 |
| **Credential Broker** | 本機管密碼，Agent 只知道「有無憑證」 | Windows Credential Manager（之後 Keychain/Keystore） |
| **Device Bridge** | 本機的「手」：接指令、本機執行、回結果/截圖、停止鈕、權限 | Electron（MVP）→ Tauri 2 + Rust（正式）；Windows worker：Python + pywinauto |
| **Browser Worker** | 網頁自動化，優先 DOM/Role/A11y、不用固定座標 | Playwright（獨立 Chromium Profile） |
| **Observation Normalizer** | 把螢幕/DOM/檔案「壓成精簡結構」給模型，別整包塞（省 token） | Agent Core 內模組 |

> 與現有 AI 島整合：模型呼叫、成本記帳、配額（Z幣）全**沿用** `ai-providers.ts` / `ai-usage-log.ts` / `consume_ai_quota_v2`。前端可視化面板放 AI 島 Next.js（`/agent`），但**編排迴圈在後端 Agent Core**。

---

## 2. 資料流（一次任務）

```text
1. 使用者在 AI 島下令「打開 AI 島專案跑測試、找錯誤、給建議、先別改」
2. 前端 POST /api/agent/tasks → 建 agent_tasks(status=planning) → 回 taskId
3. Agent Core 認領任務、挑到已配對的 Device Bridge（deviceId）
4. Loop（≤ maxSteps）：
   a. collectObservation → Device Bridge 回精簡觀察（Observation Normalizer 壓縮）
   b. planner(LLM, goal+observation+history+availableTools) → decision(tool, args, expectedResult)
   c. permissionEngine.evaluate(tool.risk) → 需確認就發 WS approval.request、等使用者
   d. tool.execute（經 Device Bridge / Browser Worker / API）
   e. verifier.check(expected vs actual) → 記 agent_steps
   f. 每步發 WS step.update 給前端即時顯示；失敗 registerFailure → 重試或換法
5. decision=complete → agent_tasks(status=succeeded)、回報摘要
   （或使用者按停 → status=cancelled；逾上限 → status=failed）
```

---

## 3. 資料表（Supabase / PostgreSQL）

```sql
-- 已配對的本機/裝置
device_bridges(
  id uuid pk, user_id uuid, name text, platform text,       -- 'windows'|'android'|...
  public_key text, last_seen_at timestamptz, status text,   -- 'online'|'offline'
  capabilities jsonb, created_at timestamptz)

-- 一次任務
agent_tasks(
  id uuid pk, user_id uuid, device_id uuid null,
  goal text, status text,                                    -- planning|running|awaiting_approval|succeeded|failed|cancelled
  skill_id uuid null, max_steps int default 30, step_count int default 0,
  result jsonb, error text, cost_usd numeric,
  created_at timestamptz, finished_at timestamptz)

-- 任務裡的每一步（可回放）
agent_steps(
  id uuid pk, task_id uuid, idx int,
  observation jsonb, decision jsonb,                         -- {tool,args,expectedResult}
  tool_name text, risk text,                                 -- read|write|dangerous
  result jsonb, verified bool, verify_reason text,
  screenshot_ref text, latency_ms int, created_at timestamptz)

-- 需人工確認的關卡
agent_approvals(
  id uuid pk, task_id uuid, step_idx int, user_id uuid,
  tool_name text, risk text, summary jsonb,                  -- 動作/位置/影響/可否復原
  decision text, decided_at timestamptz, created_at timestamptz)  -- pending|approved|denied

-- 工具定義（可後台管、亦可 code 內建 registry 為主）
agent_tools(
  id uuid pk, name text unique, description text, input_schema jsonb,
  risk text, platforms text[], enabled bool, source text)   -- builtin|mcp

-- 技能（第三階段：Prompt+Tools+Permission+Workflow+Success）
agent_skills(
  id uuid pk, name text, prompt text, tools text[],
  permissions jsonb, success_criteria jsonb, owner_id uuid, is_public bool)

-- 憑證只存「參考」，明文永遠在本機 broker
agent_credential_refs(
  id uuid pk, user_id uuid, domain text, broker text,        -- windows_cm|keychain|1password
  created_at timestamptz)                                    -- 絕不存 password
```
> RLS：全部 `user_id = auth.uid()` 隔離；寫入走 service_role + app 層檢查（同 AI 島慣例）。稽核：`agent_steps`/`agent_approvals` 即 audit log。

---

## 4. API contract（AI 島 Next.js `/api/agent/*`）

```text
POST   /api/agent/tasks            { goal, deviceId?, skillId? }        → { taskId }
GET    /api/agent/tasks/:id        → { task, steps[] }                  # 狀態+回放
POST   /api/agent/tasks/:id/cancel → { ok }                            # 中止
POST   /api/agent/approvals/:id    { decision:'approved'|'denied' }     → { ok }
GET    /api/agent/devices          → { devices[] }                     # 我配對的裝置
POST   /api/agent/devices/pair     { code }                            → { deviceId }  # 配對碼
GET    /api/agent/tools            → { tools[] }                       # 可用工具（依裝置平台）
GET    /api/agent/skills           → { skills[] }                      # 技能（後續）
```
- 認證：沿用 AI 島 Supabase auth（`getUser()`）。
- 配額/成本：任務內 LLM 呼叫走 `completeForUsage` → 自動記帳；可對 Agent 任務設每日上限（沿用 quota 機制）。

---

## 5. WebSocket 事件格式

**兩條通道**（MVP 用 Supabase Realtime 或自建 WS；正式版 WS 控制 + WebRTC 畫面）：

**A) 前端 ↔ Agent Core（即時狀態 + 確認）**
```jsonc
// server→client
{ "type": "task.status", "taskId": "...", "status": "running" }
{ "type": "step.update", "taskId": "...", "idx": 3, "tool": "browser.click",
  "summary": "點擊『登入』", "screenshotRef": "obs_9fa2", "verified": true }
{ "type": "approval.request", "approvalId": "...", "risk": "write",
  "summary": { "動作":"刪除 5 個檔案","位置":"C:\\...\\Downloads","影響":"移至資源回收筒","可復原":true } }
// client→server
{ "type": "approval.decision", "approvalId": "...", "decision": "approved" }
{ "type": "task.cancel", "taskId": "..." }
```

**B) Agent Core ↔ Device Bridge（工具執行）**
```jsonc
// core→bridge
{ "type": "tool.invoke", "callId": "...", "tool": "filesystem.list",
  "args": { "path": "~/Downloads", "recursive": true } }
{ "type": "observe.request", "callId": "..." }
{ "type": "task.abort", "taskId": "..." }
// bridge→core
{ "type": "tool.result", "callId": "...", "ok": true, "result": { ... }, "screenshotRef": "..." }
{ "type": "observation", "callId": "...", "data": { /* Observation Normalizer 格式，見 §7 */ } }
{ "type": "bridge.status", "deviceId": "...", "status": "online", "capabilities": [ ... ] }
```
> 連線安全：Device Bridge 配對時交換金鑰、控制通道端到端加密；每個 `tool.invoke` 由 Bridge 端再過一次本機權限檢查（雙重把關）。

---

## 6. Tool 介面（`packages/tool-sdk`）

```ts
type RiskLevel = "read" | "write" | "dangerous";
type Platform = "web" | "windows" | "macos" | "android" | "ios";

interface AgentTool {
  name: string;                 // e.g. "filesystem.list"
  description: string;          // 給 LLM 讀，講清楚用途與限制
  inputSchema: JSONSchema;      // 參數驗證（拒絕不合法輸入）
  riskLevel: RiskLevel;         // 決定要不要確認
  platforms: Platform[];        // 哪些裝置能跑
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}
interface ToolResult { ok: boolean; data?: unknown; screenshotRef?: string; error?: string; }
```
**MVP 工具集（白名單）**：
```text
read（自動）：  filesystem.list / filesystem.read / system.clipboard_read /
                browser.snapshot / system.screenshot / windows.find_element
write（確認）： filesystem.write / filesystem.move / browser.fill / browser.click /
                browser.download / system.open_app / system.clipboard_write / windows.click_element
dangerous（強制逐次確認）： filesystem.delete / system.run_command（白名單指令外一律擋）
```

---

## 7. 觀察正規化（省 token，別整包塞模型）

```jsonc
{ "activeApp": "Chrome", "windowTitle": "AI 島",
  "elements": [
    { "id": "btn-login", "role": "button", "name": "登入", "enabled": true },
    { "id": "email-input", "role": "textbox", "name": "電子信箱" }
  ],
  "screenshotRef": "obs_9fa2",           // 需要時模型才另外要圖
  "recentActions": ["opened login page"] }
```
模型回結構化決策（配 expectedResult 供 verifier 驗證）：
```jsonc
{ "tool": "browser.click", "arguments": { "elementId": "btn-login" },
  "expectedResult": { "urlContains": "/dashboard" } }
```

---

## 8. 權限模型（Approval Engine）

| 等級 | 行為 | 規則 |
|---|---|---|
| **L0** | 讀資料、讀畫面 | 自動執行 |
| **L1** | 開 App、填草稿 | 顯示通知即可 |
| **L2** | 改檔、發訊息、提交表單 | **執行前確認** |
| **L3** | 付款、刪除、發文、任意終端指令 | **強制逐次確認** |
| **L4** | 密碼、安全設定、銀行、系統管理員 | **預設禁止** |

- 確認畫面必含：**動作 / 位置 / 影響 / 可否復原 /【允許這一次】【取消】**（不准只寫「是否允許？」）。
- Credential Broker：Agent 要登入 → 本機判斷網站 → 使用者確認 → 本機自動填 → **Agent 看不到明文**（只知 `{ credential:"available", domain:"..." }`）。

---

## 9. 目錄結構（往 monorepo 演進；MVP 先最小集）

```text
apps/
  web/                  # 既有 AI 島 Next.js（新增 /agent 面板 + /api/agent/*）
  desktop-bridge/       # Device Bridge：Electron(MVP) → Tauri(正式)
  android-agent/        # 第二階段：Kotlin App（AccessibilityService）
services/
  agent-core/           # Agent Orchestrator（Node+TS worker；MVP 可與 web 同 repo、獨立進程）
  browser-worker/       # Playwright
  computer-worker/      # Windows：Python + pywinauto
packages/
  agent-protocol/       # WS 事件 + 任務型別（前後端共用）
  tool-sdk/             # AgentTool 介面 + registry + JSON Schema
  permission-engine/    # L0–L4 + 確認流程
  shared-types/
```
> **MVP 不做完整 monorepo 拆分**：先在 AI 島 repo 內開 `agent-core`（獨立 node 進程 + BullMQ/Redis 或先用 DB 輪詢）、`desktop-bridge`（Electron）、`browser-worker`。**Agent 迴圈永遠在後端，不進 `apps/web` 的前端。**

---

## 10. 技術選型（MVP → 正式）

```text
前端面板       ：Next.js（既有）/agent
Agent Core     ：Node.js + TypeScript（MVP：DB 輪詢或 BullMQ+Redis）；模型走 ai-providers.ts（雙供應商 OpenAI/Claude、tool-use）
桌面 Bridge    ：Electron + TS（MVP） → Tauri 2 + Rust（正式，安裝小、權限乾淨）
Windows UI     ：Python + pywinauto / UI Automation（結構化優先）
瀏覽器         ：Playwright（獨立 Chromium Profile；DOM/Role/A11y 優先，座標最後手段）
通訊           ：WebSocket（控制）；正式版加 WebRTC（畫面串流）+ 端到端加密
狀態/稽核      ：Supabase（既有）
憑證           ：Windows Credential Manager → Keychain/Keystore/1Password
```
**執行優先級（能走門就別爬窗）**：`API/MCP 工具` ＞ `結構化 UI Automation（Playwright DOM / Windows UIA）` ＞ `視覺 Computer Use（截圖點座標，僅補位）`。

---

## 11. 分階段 Task List

### Phase 0 — 設計凍結（本檔）
- [x] 架構 / 資料流 / 資料表 / API / WS / Tool 介面 / 權限 / 目錄 / task list。
- [ ] 老闆 review、凍結 MVP 範圍與資料表。

### Phase 1a — AI 島側垂直切片（已完成 · 2026-07-10）
> 先在現有 Next.js + Supabase 內把「下令→規劃→用工具→關鍵動作確認→回放」整條接通、UI 一起接。本機 Electron Bridge 留給 1b。
- [x] `src/lib/agent/tools.ts`：`AgentTool` 介面 + registry + 風險等級 + 確認摘要（`web.fetch`/`dictionary.lookup` 伺服器真的能跑；`filesystem.*`/`system.run_command` 為 device stub）。
- [x] permission：`needsApproval()`（read 自動 / write,dangerous 要確認）+ `approvalSummary()`（動作/位置/影響/可復原）。
- [x] Supabase migration：`agent_tasks` / `agent_steps` / `agent_approvals` / `agent_device_bridges` 四張核心表 + RLS + index（`supabase/agent_platform_migration.sql`，已跑）。
- [x] `src/lib/agent/orchestrator.ts`：Agent Loop（planner→permission→execute→記步→回饋）、最大步數、中止、狀態機；模型接 `completeForUsage("agent_core")`（記帳/配額/自動備援）；approval 用「寫 pending row + 輪詢」等前端。
- [x] `/api/agent/*`：`tasks`（POST 建任務+SSE 串執行、GET 清單）、`tasks/[id]`（GET 詳情+步驟回放、POST 取消）、`approvals/[id]`（同意/拒絕）、`tools`（能力清單）。
- [x] `/agent` 面板（`page.tsx` + `AgentClient.tsx`）：下令、即時步驟流、💭思考、確認彈窗（動作/影響/可復原）、能力面板、任務歷史回放；RWD + nav 入口（4 語 i18n）。
- [x] 驗證：tsc / vitest(122) / next build 綠；DB insert smoke 綠；真模型 planner 回合法 JSON + 選對工具。

### Phase 1b — 本機能力（進行中 · 2026-07-10）
> 架構決策：Zeabur 不架長駐 WS，Bridge↔雲端改用 **`agent_device_calls` 佇列 + 輪詢**（同 approval 那招）。WS 之後當優化。
- [x] DB：`agent_device_calls` 佇列 + `agent_device_bridges` 補 `token_hash/whitelist/revoked`（`supabase/agent_bridge_migration.sql`，已跑）。
- [x] Bridge API：`/api/agent/bridge/{pair,poll,result}` + `/api/agent/devices`（pair 用登入態發一次性 token；poll/result 用裝置 Bearer token 認證；poll 兼心跳更新在線）。
- [x] orchestrator：`needsDevice` 工具改走 `dispatchToDevice()`（入列+輪詢等結果）；無在線裝置 → 明確提示去配對。
- [x] `desktop-bridge`（`apps/desktop/`）：**可實跑的 Node 核心 `bridge.mjs`**（輪詢→領取→執行→回填、零安裝需 Node18+）+ Electron 外殼（系統匣/狀態視窗/啟停鈕）。本機權限：檔案限 `roots`、`run_command` 首詞白名單、寫入/高風險靠雲端逐次確認；token 只存本機（已 gitignore）。
- [x] 把 `filesystem.*`/`system.run_command` stub 換成經 Bridge 的真實作（`filesystem.list/read/write`、`system.run_command`）。
- [x] `/agent` UI：桌面助手面板（裝置在線狀態/解除配對）+ 配對彈窗（一次性 token + 設定步驟）。
- [x] 驗證：tsc / vitest(122) / next build 綠；**Bridge 端到端 smoke 綠**（真的寫檔/跑 echo/列目錄 + 正確擋掉白名單外 `rm -rf /`）。
- [ ] `browser-worker`（Playwright）：獨立 Chromium、DOM/Role/A11y 定位（`browser.*` 工具預留）。
- [ ] 截圖回傳（`screen.capture`）。
- [ ] **端到端 Demo（真跑一次）**：登入 → 配對 → 啟動 bridge → `/agent` 下「跑 npm test 看結果」→ 確認 → 收錯誤分析。
- [ ] KPI 儀表：成功率 / 步數 / 人工介入率 / 重試 / 成本 / 完成時間 / 誤操作率。
- [ ] `agent_tools` / `agent_skills` / `agent_credential_refs` 表（registry 目前 code-first，之後要 DB 化再建）。

### Phase 2 — 手機遙控 + Android
> 關鍵洞察：Bridge↔雲端本來就走佇列+輪詢＝**裝置無關**，所以手機瀏覽器（RWD/PWA）開 `/agent` 就已能「手機下令→雲端 Agent→已配對電腦 Bridge→執行→串回手機」。Phase 2a 補的是**遠端感知**。
- [x] **Phase 2a（2026-07-10）**：
  - Web Push：任務**需確認 / 完成 / 未完成**時推播到使用者所有裝置（`sendPushToUser`，VAPID 未設自動 no-op）、深連結 `/agent?task=<id>`。
  - **跨裝置批准**：`/agent?task=<id>` 自動載入任務、有待確認就顯示確認卡 → 手機上直接批准（approval 走 DB row，orchestrator 輪詢，任何裝置決定都生效）。
  - **遠端觀看**：非本機發起的進行中任務靠輪詢刷新狀態/步驟/待確認（「遠端觀看中」標籤 + 可遠端停止）。
  - **語音輸入**（Web Speech API zh-TW）+ 目標裝置提示（本機指令會在哪台電腦跑）。
  - 驗證：tsc / vitest(122) / next build 綠。
- [ ] Phase 2b：任務**背景執行**（脫離 SSE 連線也不中斷，改由 push 通知）＝真正「關掉手機頁面任務照跑」。
- [ ] Android Agent（Kotlin + AccessibilityService，明確揭露、可視化、可停止；顧 Play 政策）。
- [ ] 排程任務（cron，例：每晚檢查 CI 有無測試失敗才通知）。

### Phase 3 — 技能商店 / 使用者自建 Agent
- [ ] `agent_skills`：Prompt + Tools + Permission Policy + Workflow + Success Criteria（YAML）。
- [ ] 內建技能：GitHub 管家 / 檔案整理師 / 網站巡檢員 / 課程整理師 / 學習陪練員。
- [ ] 「用 Agent → 學會建 Agent」的教學閉環（接 AI 島教育定位）。

---

## 12. 風險與 KPI（誠實）

**三大風險**：① 範圍失控（每個平台都能變一家公司 → 死守 Windows+瀏覽器）② 成功率假象（Demo 成一次 ≠ 產品成立）③ 權限與信任（一次刪錯檔/發錯文 → 從「智能助手」變「電子內鬼」）。

**核心 KPI（不是「看起來很聰明」，是「100 次任務安全完成幾次」）**：
| 指標 | 目標 |
|---|---|
| 可完成任務種類 | 5–10 種 |
| 每種測試次數 | ≥ 20 |
| 任務成功率 | ≥ 80% 較能講 |
| 人工介入率 / 重試次數 | 越低越好 |
| 平均步數 / 完成時間 / 每次成本 | 要算清楚 |
| **誤操作率** | 趨近 0（護城河所在） |
| 使用者訪談 / 願用 / 願付 | ≥ 10–20 人、要有實測 |

**護城河敘事（競賽/補助）**：不是「操作能力最強」，而是「**最透明、最可控、最適合新手理解的 Agent**」；能跟 AI 島「降低 AI 恐懼」定位、以及「用 Agent → 學會建 Agent」的教育閉環完美接軌。

**一句最能打的話**：現在的 AI 會回答問題，下一代 AI 會替人完成任務；真正阻止一般人使用 Agent 的不是模型能力，而是**他們不敢授權、不懂操作、無法判斷風險**——AI 島要做的，就是讓每個人安全地學會駕馭 Agent。
