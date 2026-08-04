請先閱讀目前 AI 島專案架構、既有 Agent 實作、工具呼叫方式、API routes、Supabase schema 與前端狀態管理，再進行設計。不要直接推翻或重寫既有 Agent。

# 任務：為 AI 島 Agent 加入免費版語音控制與裝置工具架構

## 一、目標

AI 島目前已經有 Agent，希望加入語音互動功能，讓使用者可以：

1. 在手機或電腦瀏覽 AI 島。
2. 點擊麥克風按鈕後說話。
3. 將語音轉成文字送給目前既有 Agent。
4. Agent 判斷使用者意圖。
5. Agent 可以呼叫允許的工具。
6. 執行完成後，以文字和語音回覆結果。
7. 未來可以擴充成由手機語音控制電腦 Agent，以及由電腦 Agent 控制一台或多台 Android 手機。

目前優先完成免費可用的 MVP，不接任何必須付費的 STT 或 TTS API。

---

# 二、第一階段範圍：AI 島網頁語音 Agent

先完成以下完整流程：

```text
使用者按下麥克風
→ 瀏覽器取得麥克風權限
→ 語音辨識為文字
→ 顯示辨識文字供使用者確認
→ 將文字送給既有 Agent
→ Agent 正常回覆或呼叫工具
→ 顯示執行結果
→ 使用瀏覽器語音合成讀出結果
```

## 免費技術方案

第一版優先使用瀏覽器原生能力：

* STT：Web Speech API 的 SpeechRecognition 或 webkitSpeechRecognition。
* TTS：Web Speech API 的 speechSynthesis。
* 語言預設：`zh-TW`。
* 不新增付費 API。
* 不影響原本的文字輸入功能。
* 語音功能不可用時，必須自動退回文字模式。
* 不要假設所有瀏覽器都支援 SpeechRecognition。

請建立抽象介面，不要把 Web Speech API 直接寫死在聊天元件內。

建議介面：

```ts
interface SpeechToTextProvider {
  isSupported(): boolean;
  start(options?: SpeechRecognitionOptions): Promise<void>;
  stop(): void;
  abort(): void;
  onPartialResult(callback: (text: string) => void): () => void;
  onFinalResult(callback: (text: string) => void): () => void;
  onError(callback: (error: SpeechError) => void): () => void;
}

interface TextToSpeechProvider {
  isSupported(): boolean;
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
}
```

第一版實作：

```text
BrowserSpeechToTextProvider
BrowserTextToSpeechProvider
```

未來預留：

```text
WhisperLocalSpeechToTextProvider
PiperLocalTextToSpeechProvider
CloudSpeechToTextProvider
CloudTextToSpeechProvider
```

---

# 三、使用者介面

在既有 Agent 聊天輸入區加入麥克風按鈕。

## 語音狀態

至少需要以下狀態：

```ts
type VoiceState =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "processing"
  | "agent-working"
  | "speaking"
  | "error";
```

## 顯示方式

### idle

* 顯示麥克風圖示。
* Tooltip：「語音輸入」。

### listening

* 麥克風有明顯的錄音動畫。
* 顯示「正在聽你說話」。
* 顯示即時辨識的 partial transcript。
* 提供停止按鈕。
* 不要使用無限循環錄音。

### processing

* 顯示「正在辨識語音」。

### agent-working

* 顯示目前 Agent 正在理解或執行任務。
* 如果 Agent 有工具執行狀態，顯示工具名稱與進度。

### speaking

* 顯示 Agent 正在語音回覆。
* 提供立即停止播放的按鈕。
* 使用者再次按下麥克風時，先停止語音播放，再開始收音。

### error

顯示可理解的繁體中文錯誤，例如：

* 尚未允許麥克風權限。
* 目前瀏覽器不支援語音辨識。
* 沒有偵測到語音。
* 語音辨識中斷。
* 網路或瀏覽器語音服務發生錯誤。

不可只顯示原始 exception。

---

# 四、語音互動行為

## Push-to-talk

第一版採用「按一下開始，按一下停止」或按住說話。

不要做常駐監聽與喚醒詞，避免：

* 麥克風長期開啟。
* 隱私問題。
* 手機耗電。
* 誤觸發。
* 瀏覽器背景限制。

## 自動送出設定

提供使用者設定：

```ts
voiceAutoSend: boolean
```

預設建議為 `false`。

當 `false`：

```text
語音辨識
→ 將內容填入輸入框
→ 使用者確認
→ 手動送出
```

當 `true`：

```text
語音辨識結束
→ 倒數約 1 至 2 秒
→ 自動送出
```

倒數期間允許取消。

## 自動朗讀設定

提供：

```ts
voiceReplyEnabled: boolean
```

開啟時才朗讀 Agent 回覆。

不要朗讀以下內容：

* Markdown 語法。
* 程式碼區塊。
* 超長網址。
* JSON。
* 工具執行原始紀錄。
* 隱藏 system prompt。
* 內部推理內容。

請先建立 `sanitizeTextForSpeech()`，將 Agent 顯示內容轉成適合朗讀的純文字。

如果回覆過長，只朗讀摘要或前段，畫面仍顯示完整內容。

---

# 五、Agent 工具呼叫架構

語音只是一種輸入方式，不應建立另一套 Agent。

語音辨識後仍然呼叫目前既有的 Agent pipeline：

```text
voice transcript
→ existing chat input format
→ existing Agent
→ existing tool router
→ response
```

請避免：

* 複製一份 VoiceAgent。
* 語音和文字使用不同記憶。
* 語音繞過既有權限系統。
* 語音指令直接執行 shell。

## 建立 Tool Registry

如果目前還沒有統一工具註冊機制，請設計：

```ts
interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  riskLevel: "read" | "low" | "medium" | "high";
  inputSchema: unknown;
  requiresConfirmation: boolean;
  execute(
    input: TInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<TOutput>>;
}
```

工具必須：

* 使用白名單註冊。
* 驗證參數。
* 驗證使用者身分。
* 記錄執行結果。
* 設定 timeout。
* 可以取消。
* 不允許模型自行生成任意 shell command 並直接執行。

---

# 六、第一批安全工具

第一版先做低風險、可驗證的工具。

## 1. open_url

用途：

* 開啟 AI 島頁面。
* 開啟 YouTube。
* 開啟指定允許的 SnowRealm 產品。
* 開啟一般 HTTPS 網址。

輸入：

```ts
{
  url: string;
  target?: "same-tab" | "new-tab";
}
```

限制：

* 只允許 `https:`。
* 本機開發環境可額外允許 `http://localhost`。
* 阻擋 `javascript:`、`data:`、`file:` 等 scheme。
* 若瀏覽器阻擋 popup，顯示明確提示。
* 不能讓 Agent 靜默開啟大量分頁。

語音例子：

* 「打開 YouTube。」
* 「幫我開啟 AI 島 Python 課程。」
* 「打開 Space。」
* 「開啟這篇文章。」

## 2. navigate_internal

用於 AI 島站內導航。

```ts
{
  path: string;
}
```

必須檢查 path 是否屬於允許的站內 route，並使用 Next.js router，不重新整理整個網站。

語音例子：

* 「帶我去 Python 第三章。」
* 「打開我的學習紀錄。」
* 「回到 AI 島首頁。」

## 3. search_course

搜尋 AI 島教材、辭典、章節或功能。

```ts
{
  query: string;
  type?: "all" | "course" | "dictionary" | "feature";
}
```

語音例子：

* 「幫我找主程式判斷。」
* 「搜尋跟 Prompt 有關的課程。」
* 「找 Python 迴圈。」

## 4. agent_status

讓使用者詢問目前有哪些 Agent 任務，以及它們是否執行中。

語音例子：

* 「現在有哪些代理人在工作？」
* 「剛才的任務完成了嗎？」

---

# 七、工具確認機制

語音辨識錯一個字就可能執行錯誤，因此必須依風險分級。

## read / low

例如：

* 查詢內容。
* 站內導航。
* 開啟單一網址。

可以直接執行，但畫面必須顯示 Agent 準備做什麼。

## medium

例如：

* 開啟本機程式。
* 操控瀏覽器。
* 操控手機。
* 建立或修改檔案。

必須要求確認：

```text
Agent：我要在你的電腦開啟 YouTube，是否執行？
[執行] [取消]
```

語音回答「執行」只能在畫面同時存在 pending confirmation 時生效。

## high

例如：

* 刪除檔案。
* 傳送訊息。
* 發布內容。
* 付款。
* 修改帳號或權限。
* 執行任意終端指令。

第一版禁止實作，或必須要求畫面手動確認，不可只靠語音確認。

---

# 八、第二階段預留：手機控制電腦 Agent

第一階段不要直接實作任意遠端電腦控制，但架構需預留。

未來流程：

```text
手機上的 AI 島
→ 語音轉文字
→ AI 島後端建立 Device Command
→ 已配對的 Desktop Agent 收到命令
→ Desktop Agent 驗證權限
→ 執行白名單工具
→ 回傳進度與結果
→ 手機顯示並朗讀結果
```

## Desktop Agent 建議架構

未來建立獨立程式：

```text
snowrealm-device-agent
```

職責：

* 登入 SnowRealm ID。
* 與使用者帳號綁定。
* 裝置配對。
* 接收經授權的命令。
* 執行白名單工具。
* 回傳狀態。
* 顯示本機通知。
* 允許使用者立即停止全部任務。

通訊可先抽象成：

```ts
interface DeviceTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(handler: (command: DeviceCommand) => void): () => void;
  report(result: DeviceCommandResult): Promise<void>;
}
```

未來可以實作：

```text
SupabaseRealtimeDeviceTransport
WebSocketDeviceTransport
LocalNetworkDeviceTransport
```

禁止直接把 Supabase service role key 放在桌面客戶端。

---

# 九、第三階段預留：控制 Android 手機

未來透過本機 Desktop Agent 呼叫 ADB，不要從 AI 島伺服器直接連接使用者手機。

流程：

```text
AI 島 Agent
→ Device Command
→ Desktop Agent
→ Android Tool Adapter
→ ADB
→ 已授權的 Android 裝置
```

## AndroidDeviceAdapter

```ts
interface AndroidDeviceAdapter {
  listDevices(): Promise<AndroidDevice[]>;
  openApp(deviceId: string, packageName: string): Promise<void>;
  openUrl(deviceId: string, url: string): Promise<void>;
  pressHome(deviceId: string): Promise<void>;
  pressBack(deviceId: string): Promise<void>;
  takeScreenshot(deviceId: string): Promise<string>;
}
```

第一批未來可支援：

* 列出已連接裝置。
* 指定某一台手機。
* 開啟網址。
* 開啟已知 App。
* Home。
* Back。
* 截圖回傳。

不要第一版就加入：

* 任意座標點擊。
* 自動輸入密碼。
* 自動付款。
* 傳送訊息。
* 刪除 App 或資料。
* 繞過 Android 權限。
* 未授權的背景控制。

## 多裝置

資料結構必須以 `deviceId` 為基礎，不要假設只有一台手機。

例如：

```ts
type DeviceTarget =
  | { type: "single"; deviceId: string }
  | { type: "group"; deviceIds: string[] }
  | { type: "all-authorized" };
```

同時操作多台裝置時：

* 每台裝置獨立回報結果。
* 單台失敗不應使所有任務失敗。
* UI 顯示每台裝置的執行狀態。
* 設定最大並行數。
* 執行前顯示將操作哪些裝置。

---

# 十、資料結構

請依現有資料庫架構判斷是否需要新增，避免重複。

可能需要：

## user_voice_preferences

```ts
{
  userId: string;
  locale: string;
  autoSend: boolean;
  replyEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  preferredVoice?: string;
  updatedAt: string;
}
```

不要把瀏覽器支援狀態存入資料庫。

## device_connections

第二階段才需要：

```ts
{
  id: string;
  userId: string;
  deviceName: string;
  deviceType: "desktop" | "android";
  platform?: string;
  status: "online" | "offline" | "revoked";
  lastSeenAt?: string;
  createdAt: string;
}
```

## device_commands

第二階段才需要：

```ts
{
  id: string;
  userId: string;
  targetDeviceId: string;
  toolName: string;
  input: unknown;
  status:
    | "pending"
    | "awaiting-confirmation"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
```

所有資料都必須套用 RLS，使用者只能看到並控制自己的裝置與命令。

---

# 十一、日誌與隱私

需要記錄：

* 語音功能是否成功啟動。
* 語音辨識是否失敗。
* Agent 選擇了哪個工具。
* 工具執行狀態。
* 錯誤類型。
* 執行耗時。

預設不要保存：

* 原始錄音。
* 麥克風音訊。
* 完整敏感語音內容。
* 密碼、Token、Cookie。
* Agent 的內部推理。

如果未來要保存錄音，必須另外明確取得使用者同意。

---

# 十二、程式結構建議

請依現有專案結構調整，不要盲目照抄路徑。

```text
src/
  features/
    voice/
      providers/
        browser-speech-to-text.ts
        browser-text-to-speech.ts
      hooks/
        use-speech-recognition.ts
        use-speech-synthesis.ts
        use-voice-agent.ts
      components/
        voice-button.tsx
        voice-status.tsx
        voice-settings.tsx
        transcript-preview.tsx
      utils/
        sanitize-text-for-speech.ts
        speech-error-message.ts
      types.ts

  agents/
    tools/
      registry.ts
      types.ts
      open-url.ts
      navigate-internal.ts
      search-course.ts
      agent-status.ts
```

如果目前已有相同用途的資料夾或抽象層，請整合進既有架構，不要建立第二套平行系統。

---

# 十三、測試要求

至少加入：

## 單元測試

* `sanitizeTextForSpeech()`。
* URL scheme 驗證。
* 工具輸入 schema 驗證。
* 風險等級與確認判斷。
* 語音錯誤轉繁體中文。
* voice state transition。

## 整合測試

* 語音辨識結果進入既有 Agent。
* 文字輸入功能不受影響。
* Agent 呼叫 `navigate_internal`。
* Agent 呼叫 `open_url`。
* 不支援 SpeechRecognition 時正確退回文字模式。
* 使用者取消工具確認時不可執行。
* TTS 播放中按麥克風會先停止播放。

## 手動測試

至少測試：

* Android Chrome。
* Windows Chrome。
* 麥克風拒絕權限。
* 沒有說話。
* 中途停止。
* 繁體中文。
* 中英混合指令。
* Agent 回覆包含 Markdown 與程式碼。
* 連續快速點擊麥克風。

---

# 十四、驗收標準

第一階段完成後，使用者應能：

1. 在 AI 島 Agent 輸入框按下麥克風。
2. 說：「幫我打開 Python 課程。」
3. 畫面顯示辨識文字。
4. 使用者確認或自動送出。
5. 既有 Agent 接收到相同格式的文字訊息。
6. Agent 呼叫允許的站內導航工具。
7. 畫面前往指定頁面。
8. Agent 以文字回覆。
9. 開啟語音回覆設定時，瀏覽器朗讀結果。
10. 語音功能失敗時，原本的文字聊天仍可正常使用。

---

# 十五、執行順序

請按照以下順序工作：

1. 先盤點既有 Agent、聊天輸入與工具系統。
2. 列出會修改與新增的檔案。
3. 說明如何避免破壞現有功能。
4. 建立 voice provider 抽象介面。
5. 完成瀏覽器 STT。
6. 完成瀏覽器 TTS。
7. 整合既有聊天輸入。
8. 建立或整合 Tool Registry。
9. 實作第一批低風險工具。
10. 加入確認與取消機制。
11. 加入錯誤處理與 fallback。
12. 加入測試。
13. 更新相關文件。

先完成第一階段，不要在本次直接實作 Desktop Agent 或 ADB 控制。

但是請新增一份架構文件：

```text
docs/agent-device-control-roadmap.md
```

文件需描述：

* 手機控制電腦 Agent。
* Desktop Agent。
* 裝置配對。
* 多裝置並行。
* Android ADB Adapter。
* 權限模型。
* 確認機制。
* 緊急停止。
* 未來可替換 Whisper 與 Piper 的位置。

開始修改前，先回報目前專案中與此功能最相關的既有檔案與你準備採用的整合方式。
