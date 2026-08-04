# 分身島 · 語音代理與裝置控制 Roadmap（Phase 2/3）

> 規格母檔：`docs/speech_agent.md`。本檔＝**第二、三階段的架構藍圖**（本輪 Phase 1 網頁語音 MVP 已完成，見 todo §2.8.1–2.8.6）。
> 作者：Claude · 2026-08-04。**這是規劃、不是已實作**——Phase 2/3 尚未動工，先把架構、權限模型、緊急停止、可替換點講清楚。

---

## Phase 1 已完成（回顧，供銜接）

- **語音層**（`src/features/voice/`）：`SpeechToTextProvider`/`TextToSpeechProvider` 抽象 + Browser 實作（Web Speech API、免費）。未來替換點見文末。
- **client-action 中繼**（`src/lib/agent/client-actions.ts` + `agent_tasks.client_actions` + 原子 RPC）：Agent 在伺服器決策 → 派結構化白名單信封 → 前端在使用者分頁執行導航/開頁 → 回報結果。**這套「決策在雲、執行在端 + 回報」正是 Phase 2/3 裝置控制的縮小版**。
- 工具：`navigate_internal` / `open_url`（web）、`search_course` / `agent_status`（server）。

> 關鍵洞見：Phase 2/3 只是把「執行端」從『使用者當前瀏覽器分頁』換成『另一台已配對的裝置』。信封 → 執行 → 回報的骨架不變，換的是傳輸層（Transport）與工具集（Adapter）。

---

## Phase 2：手機語音控制電腦（Desktop Agent）

### 目標流程
```
手機上的 AI 島 → 語音轉文字 → 既有 Agent pipeline（launchAgentTask）
  → 產生 Device Command（白名單工具 + 參數）
  → 已配對的 Desktop Agent 收到 → 驗證權限 → 執行 → 回報進度/結果
  → 手機顯示並（可選）朗讀
```

### 既有地基（不重造）
- **裝置配對已有雛形**：`/api/agent/bridge/pair`、`/api/agent/devices`（列出/撤銷）、`device.*` stub（`needsDevice:true`）、orchestrator 的 `awaiting_device`／`waitForDevice`／`dispatchToDevice`。
- Phase 2 ＝把這條 stub 路徑補成真的桌面客戶端 + 正式傳輸。

### 資料結構（RLS：使用者只能看/控自己的）
```ts
device_connections { id, userId, deviceName, deviceType:"desktop"|"android", platform?, status:"online"|"offline"|"revoked", lastSeenAt?, createdAt }
device_commands   { id, userId, targetDeviceId, toolName, input, status:"pending"|"awaiting-confirmation"|"running"|"completed"|"failed"|"cancelled", error?, createdAt, startedAt?, completedAt? }
```
> `device_commands` 的狀態機與確認機制**直接沿用 Phase 1 client-action 的設計**（pending→…→completed/failed、原子更新、冪等、終態保護）。

### Desktop Agent（獨立程式 `snowrealm-device-agent`）
職責：登入 SnowRealm ID → 綁帳號 → 裝置配對 → 收授權命令 → 執行白名單工具 → 回報 → 本機通知 → **一鍵停止全部任務**。

傳輸抽象（先接一種、預留其他）：
```ts
interface DeviceTransport {
  connect(): Promise<void>; disconnect(): Promise<void>;
  subscribe(handler: (cmd: DeviceCommand) => void): () => void;
  report(result: DeviceCommandResult): Promise<void>;
}
// 實作候選：SupabaseRealtimeDeviceTransport（先做，複用現有 Supabase）／WebSocketDeviceTransport／LocalNetworkDeviceTransport
```
> **鐵則**：Supabase service role key **絕不**放桌面客戶端。桌面端只拿使用者範圍的短期權杖，經 RLS 只能讀自己的 `device_commands`、寫自己的回報。

---

## Phase 3：Desktop Agent 控制 Android（ADB）

> **不從 AI 島伺服器直連手機**。一律 AI 島 → Device Command → Desktop Agent → Android Adapter → ADB → 已授權裝置。

```ts
interface AndroidDeviceAdapter {
  listDevices(): Promise<AndroidDevice[]>;
  openApp(deviceId, packageName): Promise<void>;
  openUrl(deviceId, url): Promise<void>;
  pressHome(deviceId): Promise<void>;
  pressBack(deviceId): Promise<void>;
  takeScreenshot(deviceId): Promise<string>;
}
```
**第一批只做**：列裝置、指定某台、開網址、開已知 App、Home、Back、截圖。
**第一版禁止**：任意座標點擊、自動輸入密碼、自動付款、傳訊、刪 App/資料、繞過 Android 權限、未授權背景控制。

### 多裝置
```ts
type DeviceTarget = { type:"single"; deviceId } | { type:"group"; deviceIds[] } | { type:"all-authorized" }
```
- 每台獨立回報；單台失敗不拖垮全部；UI 顯示每台狀態；設**最大並行數**；執行前顯示「將操作哪些裝置」。

---

## 權限模型 · 確認機制 · 緊急停止（三階段共用）

- **風險分級沿用**：read/low 直接執行但顯示將做什麼；medium（開本機程式/操控瀏覽器/操控手機/建改檔案）**必須確認**；high（刪檔/傳訊/發布/付款/改帳號權限/任意終端指令）**第一版禁止，或必須畫面手動確認、不可只靠語音**。
- **語音「執行」只在畫面同時有 pending confirmation 時生效**（語音辨識錯字不得直接觸發破壞性動作）。
- **對外/破壞性動作永遠逐項批准**（紅線，跨所有裝置與自動化）。
- **緊急停止**：Desktop Agent 需提供「立即停止全部任務」；AI 島端 `device_commands` 可整批 `cancelled`；桌面端收到即中止並回報。
- **預算硬上限**沿用（`daily_budget` + STEP_CAP），任何編排不得繞過。

## 日誌與隱私
- 記錄：語音啟動成敗、辨識失敗、Agent 選了哪個工具、工具狀態、錯誤類型、耗時。
- **預設不存**：原始錄音、麥克風音訊、完整敏感語音內容、密碼/Token/Cookie、Agent 內部推理。要存錄音須另外明確取得同意。

## 未來可替換：Whisper / Piper（本機語音）
- STT/TTS 已抽象成 provider 介面。要離線/更準/跨瀏覽器時，新增 `WhisperLocalSpeechToTextProvider`／`PiperLocalTextToSpeechProvider`（或 Cloud 版）**只需實作同介面、換注入**，UI 與 Agent pipeline 完全不動。
- 桌面端最適合掛本機 Whisper/Piper（有算力、無瀏覽器限制）：Desktop Agent 可同時擔任「本機語音引擎」。

---

## 分期建議
1. **Phase 2 MVP**：Desktop Agent（Supabase Realtime 傳輸）+ `device_connections`/`device_commands` + 補完既有 `device.*`（filesystem/browser 白名單、medium 確認）+ 緊急停止。
2. **Phase 2 v2**：本機 Whisper/Piper、WebSocket 傳輸、更多本機 Skills。
3. **Phase 3**：Android Adapter（ADB，唯讀/低風險六件）→ 多裝置編組。
