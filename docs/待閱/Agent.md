## 第一段：支持性分析

你的方向是對的，而且這會讓 AI 島從「有 AI 的網站」，正式跨進**真正的 Agent 平台**。

但先講破一個關鍵幻覺：

> **單靠 AI 島網頁，不可能直接隨意操作使用者整台手機或電腦。**

瀏覽器有沙盒限制，網站不能直接讀桌面、點其他軟體、操作檔案總管或控制手機 App。要做到真正跨出 AI 島，必須安裝一個本機程式，讓它成為 AI 島伸到裝置上的「手」。

我建議把它命名為：

# **AI 島 Device Bridge**

中文可以叫「島嶼橋接器」或「多聞助手」。

整體不是一個 Agent，而是以下架構：

```text
使用者
  ↓
AI 島聊天／語音介面
  ↓
Agent Orchestrator 任務大腦
  ↓
權限與風險判斷
  ↓
工具選擇器 Tool Router
  ├─ API / MCP 工具
  ├─ 瀏覽器操作
  ├─ 電腦桌面操作
  ├─ Android 手機操作
  └─ iPhone Shortcuts / App Intents
  ↓
執行 → 截圖／結果 → 驗證 → 下一步
```

---

# 一、真正的 Agent 要有哪些核心能力

普通聊天 AI：

```text
使用者問題 → LLM 回答
```

真正 Agent：

```text
理解目標
→ 拆分任務
→ 選擇工具
→ 執行動作
→ 觀察結果
→ 判斷是否成功
→ 失敗重試或換方法
→ 回報結果
```

例如使用者說：

> 幫我找出下載資料夾裡最大的 10 個檔案，整理成表格，但先不要刪。

Agent 應該產生：

```json
{
  "goal": "找出最大的 10 個檔案",
  "steps": [
    {
      "tool": "filesystem.list",
      "args": {
        "path": "~/Downloads",
        "recursive": true
      }
    },
    {
      "tool": "data.sort",
      "args": {
        "field": "size",
        "order": "desc"
      }
    },
    {
      "tool": "ui.present_table",
      "requiresConfirmation": false
    }
  ]
}
```

如果使用者接著說「刪掉前五個」，才切換成高風險操作：

```json
{
  "tool": "filesystem.delete",
  "risk": "high",
  "requiresConfirmation": true
}
```

這個「先規劃、再執行、執行後驗證」才叫 Agent，不是模型偷偷亂按一通，最後把電腦按成電子廢墟。🛠️

---

# 二、AI 島需要增加的六個核心模組

## 1. Agent Orchestrator

這是任務大腦，負責：

* 理解使用者真正目標
* 將目標拆成多步驟
* 選工具
* 管理任務狀態
* 失敗重試
* 要求使用者確認
* 判斷何時完成

技術可用：

* Next.js API Route
* 獨立 Node.js Agent Service
* OpenAI Responses API
* Claude Tool Use
* 自己建立模型抽象層

不要把 Agent 迴圈直接塞進前端。

建議：

```text
AI Island Next.js
        ↓
Agent API Service
        ↓
LLM Provider Adapter
        ↓
Tool Registry
```

Agent Service 可以用：

```text
Node.js + TypeScript
Fastify 或 NestJS
BullMQ + Redis
PostgreSQL / Supabase
```

---

## 2. Tool Registry 工具註冊中心

每個可執行能力都必須被定義成結構化工具。

例如：

```ts
interface AgentTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  riskLevel: "read" | "write" | "dangerous";
  platforms: Array<"web" | "windows" | "macos" | "android" | "ios">;
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}
```

工具範例：

```text
browser.open_url
browser.click
browser.fill
browser.download

filesystem.list
filesystem.read
filesystem.write
filesystem.move
filesystem.delete

system.open_app
system.run_command
system.clipboard_read
system.clipboard_write

windows.find_element
windows.click_element

android.open_app
android.tap_element
android.type_text

calendar.create_event
gmail.search_email
github.create_issue
```

MCP 很適合當工具層標準。MCP 本身就是讓模型連接外部工具和資料來源的協議，也支援 `stdio` 與 Streamable HTTP 傳輸。([Model Context Protocol][1])

但我要吐槽一下業界常見迷思：

> 接上 MCP 不等於自動擁有 Agent。

MCP 是插座，不是大腦。你仍然需要任務規劃、權限、狀態、驗證和失敗處理。

---

## 3. Device Bridge 本機橋接程式

這是最重要的部分。

使用者需要在 Windows、macOS 或 Android 上安裝 AI 島助手。

它負責：

* 和 AI 島後端建立安全連線
* 接收工具呼叫
* 在本機執行
* 回傳畫面或執行結果
* 顯示即時操作狀態
* 提供停止按鈕
* 管理本機權限

推薦桌面版技術：

```text
Tauri 2
Rust 核心
React / TypeScript UI
WebSocket 或 WebRTC 通訊
```

為什麼優先 Tauri，不先用 Electron：

* 安裝檔較小
* 本機權限控制較乾淨
* Rust 適合處理系統層操作
* 可做 Windows、macOS、Linux
* 安全邊界比直接開滿 Node.js 權限更容易管理

不過若你要快速做 MVP，Electron 會更快。

### MVP 選擇

```text
第一版：Electron + TypeScript
正式版：Tauri + Rust
```

不要第一天就拿 Rust 把自己煉成仙丹，先把閉環跑通。

---

## 4. Browser Agent

網站操作應該先用 Playwright，不要第一步就用截圖點座標。

Playwright 可以操作 Chromium、Firefox、WebKit，也已經有專門給 Agent 使用的 MCP Server，可以透過結構化 accessibility snapshot 操作網頁，不一定需要視覺模型。([playwright.dev][2])

推薦優先順序：

```text
API
↓
DOM / Accessibility Tree
↓
Playwright Locator
↓
螢幕視覺 + 座標點擊
```

例如登入某網站：

```ts
await page.goto("https://example.com/login");

await page
  .getByRole("textbox", { name: "Email" })
  .fill(userEmail);

await page
  .getByRole("button", { name: "登入" })
  .click();
```

不要寫：

```ts
click(846, 523);
```

因為視窗縮一下、廣告跳出來、按鈕搬家，Agent 就會開始點空氣，十分有行為藝術感。

瀏覽器部分可以提供兩種模式：

### 隔離瀏覽器

Agent 開自己的 Chromium Profile。

優點：

* 安全
* 好管理
* 不會碰使用者原本的瀏覽資料

缺點：

* 需要重新登入網站

### 接管目前瀏覽器

透過 Chrome Extension 或 Chrome DevTools Protocol 連接現有分頁。

優點：

* 可以使用現有登入狀態

缺點：

* 權限和隱私風險更高

第一版建議用**獨立 Agent 瀏覽器**。

---

## 5. Computer Use 桌面操作

Windows 與 macOS 不應只靠截圖辨識。

應該混合：

```text
Accessibility Tree
+ 系統 UI Automation
+ 截圖視覺
+ 滑鼠鍵盤模擬
```

### Windows

首選 Microsoft UI Automation。

它可以取得桌面應用程式中的：

* 按鈕
* 輸入框
* 選單
* 表格
* 視窗
* 元素名稱
* 是否可點擊
* 元素位置

Microsoft 官方指出 UI Automation 可以程式化存取大部分桌面 UI 元素，也能操作這些元素。([Microsoft Learn][3])

技術選項：

```text
C#：
System.Windows.Automation
FlaUI

Python：
pywinauto
uiautomation

Rust：
windows-rs + UIAutomation COM API
```

第一版我建議：

```text
Device Bridge 主程式：Electron
Windows Worker：Python + pywinauto
```

例如：

```python
from pywinauto import Desktop

window = Desktop(backend="uia").window(title_re=".*記事本.*")
window.set_focus()

editor = window.child_window(control_type="Document")
editor.type_keys("AI 島 Agent 測試成功", with_spaces=True)
```

### macOS

使用 Accessibility API，例如 `AXUIElement`。Apple 官方文件明確說，輔助應用可透過這些函式與 macOS 上可存取的應用程式溝通和控制。([Apple Developer][4])

還可搭配：

```text
AppleScript
Shortcuts
CGEvent
AXUIElement
```

### 視覺 Computer Use

OpenAI Computer Use 的運作方式是：

1. 模型查看截圖
2. 回傳點擊、輸入、捲動等動作
3. 你的程式執行動作
4. 再截圖回傳
5. 不斷循環

OpenAI 官方文件把它描述為由模型檢查截圖，再回傳由開發者程式執行的 UI 動作。([OpenAI 開發者][5])

Claude Computer Use 也可即時處理截圖與動作請求。([Claude Platform][6])

但我不建議把 Computer Use 當唯一引擎。最好採用：

```text
結構化 UI 優先
視覺辨識補位
座標操作最後手段
```

---

## 6. Approval Engine 權限與確認引擎

這是整套系統的煞車，不做這層，AI 島就不是 Agent 平台，而是雲端遙控炸彈。

工具分級：

| 等級 | 行為                 | 規則     |
| -- | ------------------ | ------ |
| L0 | 查看資料、讀取畫面          | 可自動執行  |
| L1 | 開啟 App、填寫草稿        | 顯示通知即可 |
| L2 | 修改檔案、發訊息、提交表單      | 執行前確認  |
| L3 | 付款、刪除、發文、執行終端指令    | 強制逐次確認 |
| L4 | 密碼、安全設定、銀行、系統管理員操作 | 預設禁止   |

確認畫面不能只寫：

> 是否允許？

要寫清楚：

```text
多聞準備執行：

動作：刪除 5 個檔案
位置：C:\Users\xxx\Downloads
影響：刪除後將移至資源回收筒
可復原：是

[允許這一次] [取消]
```

---

# 三、手機怎麼操作

## Android：做得到最多

Android 可建立原生 App，使用：

```text
AccessibilityService
MediaProjection
NotificationListenerService
App Links / Intents
Shizuku，可選進階版
```

AccessibilityService 能：

* 讀取目前視窗的可存取節點
* 找按鈕和文字
* 點擊元素
* 捲動畫面
* 輸入文字
* 返回、首頁、最近使用
* 監聽畫面變化

Android 官方文件說明，Accessibility Service 可以檢查螢幕內容，並代表使用者與 App 互動。([Android Developers][7])

基本流程：

```text
AI 島下達任務
→ Android App 收到指令
→ AccessibilityService 讀取節點樹
→ 尋找目標元素
→ 執行 click / scroll / setText
→ 回傳節點狀態或截圖
```

Kotlin 示意：

```kotlin
fun clickByText(root: AccessibilityNodeInfo?, text: String): Boolean {
    if (root == null) return false

    val nodes = root.findAccessibilityNodeInfosByText(text)

    for (node in nodes) {
        var target: AccessibilityNodeInfo? = node

        while (target != null) {
            if (target.isClickable) {
                return target.performAction(
                    AccessibilityNodeInfo.ACTION_CLICK
                )
            }
            target = target.parent
        }
    }

    return false
}
```

### 但有現實限制

Google Play 對 AccessibilityService 使用有政策限制，尤其不是純輔助用途的 App，需要清楚揭露用途與取得同意，不能偷偷控制裝置。([Google 幫助中心][8])

所以 Android 版要設計成：

* 使用者主動開啟 Agent 模式
* 畫面持續顯示 Agent 正在操作
* 隨時可停止
* 首次使用明確說明權限
* 不在背景偷偷執行敏感操作

否則上架審核可能直接把 AI 島踢下海。

---

## iPhone：限制比 Android 大很多

iOS 一般 App 不能像 Android AccessibilityService 一樣，自由讀取與控制其他 App 的整個 UI。

比較可行的是：

```text
App Intents
Siri
Shortcuts
URL Schemes
Share Extension
Notification Actions
自家 App 內的操作
服務 API 整合
```

Apple 的 App Intents 能把 App 功能以結構化方式提供給 Siri、Shortcuts 和系統服務。([Apple Developer][9])

所以 iPhone 版不要宣稱：

> AI 可以任意控制所有 App。

應該說：

> AI 島可以執行已授權的捷徑、系統意圖，以及有 API 或 App Intent 支援的動作。

例如：

```text
建立提醒事項
建立行事曆
傳送預設訊息
開啟導航
啟動 AI 島捷徑
整理分享進 AI 島的內容
```

iOS 想做到全面 GUI 控制，正常 App Store 路線基本不可行。

---

# 四、手機控制電腦怎麼做

這反而是很合理的模式：

```text
手機上的 AI 島
→ AI 島雲端 Agent
→ 使用者電腦上的 Device Bridge
→ 操作桌面
→ 結果串流回手機
```

例如你在外面說：

> 幫我叫家裡電腦打開 AI 島專案，跑測試，把錯誤摘要傳給我。

流程：

1. 手機送出任務
2. Agent 找到已配對的 MSI 筆電
3. Device Bridge 接收工作
4. 執行 `npm test`
5. 收集輸出
6. Agent 分析錯誤
7. 回傳摘要
8. 若要修改程式，再要求確認

裝置連線可以用：

```text
WebSocket：最容易做
WebRTC DataChannel：延遲低、適合即時畫面
MQTT：適合裝置訊息
Tailscale：適合開發期安全連線
```

第一版：

```text
Supabase Realtime 或 WebSocket
```

正式版：

```text
WebSocket 控制通道
WebRTC 畫面串流
端到端加密
```

---

# 五、Agent 執行引擎的實際程式結構

建議專案拆成：

```text
apps/
  web/                    AI 島 Next.js
  desktop-bridge/         Electron / Tauri
  android-agent/          Kotlin Android App

services/
  agent-core/             Agent Orchestrator
  tool-gateway/           工具呼叫與權限驗證
  browser-worker/         Playwright
  computer-worker/        Computer Use
  scheduler/              排程任務

packages/
  agent-protocol/
  tool-sdk/
  permission-engine/
  device-sdk/
  shared-types/
```

---

## Agent Loop

核心大概長這樣：

```ts
async function runAgentTask(task: AgentTask) {
  let state = await createInitialState(task);

  for (let step = 0; step < 30; step++) {
    const observation = await collectObservation(state);

    const decision = await planner.decide({
      goal: task.goal,
      observation,
      history: state.history,
      availableTools: toolRegistry.describe(state.device),
    });

    if (decision.type === "complete") {
      return finishTask(decision.result);
    }

    const tool = toolRegistry.get(decision.toolName);

    const permission = await permissionEngine.evaluate({
      userId: task.userId,
      tool,
      args: decision.arguments,
      context: state,
    });

    if (permission.requiresApproval) {
      const approved = await requestApproval(permission);

      if (!approved) {
        return cancelTask("使用者拒絕操作");
      }
    }

    const result = await tool.execute(
      decision.arguments,
      state.context
    );

    const verified = await verifier.check({
      expected: decision.expectedResult,
      actual: result,
    });

    state = appendStep(state, {
      decision,
      result,
      verified,
    });

    if (!verified.success) {
      state = registerFailure(state, verified.reason);
    }
  }

  throw new Error("超過最大執行步數");
}
```

最重要的是這三段：

```text
permissionEngine.evaluate()
verifier.check()
最大執行步數
```

少任何一個，Agent 都可能陷入無限點擊、重複寄信或連續重試。

---

# 六、觀察資料要怎麼傳給模型

不要每次把整個螢幕、完整 DOM、全部檔案都丟進模型，成本會膨脹成河豚。

應該建立 Observation Normalizer：

```json
{
  "activeApp": "Chrome",
  "windowTitle": "AI 島",
  "elements": [
    {
      "id": "btn-login",
      "role": "button",
      "name": "登入",
      "enabled": true
    },
    {
      "id": "email-input",
      "role": "textbox",
      "name": "電子信箱"
    }
  ],
  "screenshotRef": "obs_9fa2",
  "recentActions": [
    "opened login page"
  ]
}
```

模型選擇：

```json
{
  "tool": "ui.click",
  "arguments": {
    "elementId": "btn-login"
  },
  "expectedResult": {
    "urlContains": "/dashboard"
  }
}
```

這比直接讓模型回覆「點畫面右下方大約 80% 的地方」穩定太多。

---

# 七、密碼與登入怎麼處理

絕對不要讓 Agent 直接讀取明文密碼。

應該有 Credential Broker：

```text
Agent 要求登入
→ 本機 Credential Broker 判斷網站
→ 使用者確認
→ 本機自動填入
→ Agent 看不到密碼內容
```

可使用：

```text
Windows Credential Manager
macOS Keychain
Android Keystore
iOS Keychain
1Password / Bitwarden 整合
```

模型只會知道：

```json
{
  "credential": "available",
  "domain": "example.com"
}
```

而不是：

```json
{
  "password": "朕的密碼123"
}
```

---

# 八、你真正應該採取的技術策略

我建議你建立四層執行優先級：

## Level 1：API Agent

最穩定。

例如：

* Gmail API
* Google Calendar API
* GitHub API
* Supabase API
* Notion API
* Discord API

```text
成功率最高
成本最低
速度最快
最容易驗證
```

## Level 2：MCP Tool

將各種能力統一成工具協議。

```text
filesystem MCP
GitHub MCP
database MCP
Playwright MCP
AI 島自有 MCP
```

## Level 3：結構化 UI Automation

```text
Playwright DOM
Windows UI Automation
macOS Accessibility
Android AccessibilityService
```

## Level 4：視覺 Computer Use

只有找不到 API 或結構化 UI 時才啟用。

```text
看截圖
辨識元素
點座標
驗證畫面
```

也就是：

> **能走門就別爬窗，能呼叫 API 就別讓 AI 拿滑鼠戳半天。**

---

# 九、第一個可落地的 MVP

不要一開始就做「控制世界萬物」。那會直接爆炸成六個專案。

## MVP 1：AI 島桌面助手

先只支援 Windows，能力限制為：

* 開啟 App
* 開啟網址
* 操作隔離 Chrome
* 讀取指定資料夾
* 建立與修改文字檔
* 執行白名單終端指令
* 截圖
* 操作 VS Code
* 執行 AI 島專案測試
* 顯示每一步操作
* 所有寫入操作先確認

技術：

```text
AI 島前端：Next.js
Agent Core：Node.js + TypeScript
任務佇列：BullMQ + Redis
資料庫：Supabase
桌面端：Electron
瀏覽器：Playwright
Windows UI：pywinauto
模型：OpenAI / Claude 雙供應商
通訊：WebSocket
```

### 第一個 Demo 任務

> 打開 AI 島專案，執行測試，讀取錯誤，找出可能原因，產生修正建議，但不要自動修改。

這個 Demo 很適合你，因為：

* 使用情境真實
* 不碰高風險付款
* 能展示多步驟 Agent
* 能操作 AI 島以外的 VS Code、終端和檔案
* 可以量化成功率
* 補助或競賽展示也好講

---

# 十、第二階段

加入：

```text
Android Agent App
手機遠端派遣桌面任務
語音指令
排程任務
多裝置選擇
任務模板
使用者自訂工具
MCP Marketplace
```

例如：

> 每天晚上 11 點檢查 AI 島 GitHub 有沒有測試失敗，有才通知我。

這時才加入排程 Agent。

---

# 十一、第三階段

建立「AI 島技能商店」：

```text
GitHub 管家
檔案整理師
網站測試員
課程整理師
社群發布助手
資料分析助手
電腦教學陪練員
```

每個技能其實是一組：

```text
Prompt
+ Tools
+ Permission Policy
+ Workflow
+ Success Criteria
```

例如：

```yaml
name: AI 島網站巡檢員

tools:
  - browser.open
  - browser.click
  - browser.screenshot
  - github.create_issue

permissions:
  browser: automatic
  github_create_issue: confirm

success:
  - no_console_errors
  - login_success
  - mobile_layout_valid
```

這會與 AI 島原本的教育定位完美接軌：

> 使用者不只是使用 Agent，也能學會怎麼建立自己的 Agent。

這才是你能跟 ChatGPT、Claude 拉開差異的地方。

---

## 第二段：對立性視角

現在我要潑一桶有建設性的冰水。🧊

「可以控制所有手機和電腦」聽起來霸氣，但它本身**不是產品價值，只是技術能力**。

使用者真正想要的不是：

> AI 可以幫我點滑鼠。

而是：

> AI 能可靠地完成某件我懶得做、做不會或容易出錯的事。

所以你不能先做萬能操作，再找用途。正確順序應該是：

```text
先選高價值任務
→ 定義需要哪些工具
→ 實作最小控制能力
→ 驗證成功率
→ 再逐步擴張
```

### 你目前最大的三個風險

#### 1. 範圍失控

桌面、Android、iOS、瀏覽器、API、MCP、語音、排程，每一個都能變成獨立公司。

所以第一版只做：

```text
Windows + Browser + AI 島開發工作流
```

Android 放第二階段，iOS 放到更後面。

#### 2. 成功率假象

Demo 跑成功一次不代表產品成立。

你要記錄：

```text
任務成功率
平均步驟數
人工介入率
重試次數
執行成本
平均完成時間
誤操作率
```

Agent 的核心 KPI 不是「看起來很聰明」，而是：

```text
100 次任務裡，能安全完成幾次？
```

#### 3. 權限與信任

只要發生一次：

* 傳錯訊息
* 刪錯檔案
* 發錯貼文
* 終端指令跑錯
* 把私人畫面傳上雲端

使用者就會立刻把「智能助手」改名成「電子內鬼」。

因此 AI 島真正的護城河可能不是「操作能力最強」，而是：

> **最透明、最可控、最適合新手理解的 Agent。**

讓使用者看到：

```text
它現在看到什麼
它打算做什麼
為什麼這樣做
會影響哪些東西
能不能復原
如何立即停止
```

---

# 最後的產品定義

我會把這個功能定義成：

## **AI 島行動代理系統**

> 讓使用者透過自然語言，把 AI 島上的學習與思考，延伸到瀏覽器、電腦、手機和外部服務。所有操作皆透過明確授權、可視化步驟與可中止機制執行。

最合理的開發順序：

```text
1. Agent Core
2. Tool Registry
3. Windows Device Bridge
4. Playwright Browser Agent
5. 權限確認系統
6. 任務紀錄與回放
7. VS Code／終端／檔案工具
8. Android Agent
9. 手機遠端派遣電腦
10. 技能商店與使用者自建 Agent
```

**一句話給 Claude Code / Codex：**

請在 AI 島現有 Next.js 專案外，設計一套安全的跨裝置 Agent 架構。第一階段只支援 Windows 與瀏覽器，不要嘗試一次完成 Android 或 iOS。

系統分成四部分：

1. Agent Core：使用 Node.js、TypeScript 建立任務規劃與工具呼叫迴圈，支援多步驟任務、最大步驟限制、失敗重試、結果驗證與中止。
2. Tool Registry：所有工具必須有 JSON Schema、風險等級、平台限制、輸入驗證與結構化結果。
3. Windows Device Bridge：先用 Electron 建立本機桌面助手，透過 WebSocket 與 Agent Core 連線，支援開啟程式、讀寫指定資料夾、執行白名單指令、截圖與回傳執行結果。
4. Browser Worker：使用 Playwright 操作獨立 Chromium Profile，優先使用 DOM、Role、Label 與 Accessibility Tree 定位元素，不以固定座標作為主要方式。

建立 read、write、dangerous 三級權限。讀取操作可自動執行；修改檔案、提交表單、傳送訊息必須確認；刪除、付款、系統設定與任意終端指令預設禁止。Agent 不得讀取明文密碼，登入憑證必須由本機 Credential Broker 處理。

第一個端到端 Demo 是：使用者從 AI 島要求桌面助手開啟指定的 AI 島專案、執行測試、收集錯誤、分析原因並提出修正建議，但未取得確認前不得修改任何檔案。

先輸出完整架構、資料流、資料表、API contract、WebSocket 事件格式、Tool interface、權限模型、目錄結構與分階段 task list。不要先寫大量實作程式，也不要把 Agent 邏輯塞進前端。

這一塊確實可能把 AI 島從教育網站推成「**人類學會駕馭 Agent 的訓練場**」。但先讓它穩穩地替你開 VS Code，別第一天就叫它接管朕的江山。👑

[1]: https://modelcontextprotocol.io/specification/2025-11-25?utm_source=chatgpt.com "Specification"
[2]: https://playwright.dev/?utm_source=chatgpt.com "Playwright: Fast and reliable end-to-end testing for modern ..."
[3]: https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32?utm_source=chatgpt.com "UI Automation - Win32 apps"
[4]: https://developer.apple.com/documentation/applicationservices/axuielement_h?utm_source=chatgpt.com "AXUIElement.h | Apple Developer Documentation"
[5]: https://developers.openai.com/api/docs/guides/tools-computer-use?utm_source=chatgpt.com "Computer use | OpenAI API"
[6]: https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool?utm_source=chatgpt.com "Computer use tool - Claude Platform Docs"
[7]: https://developer.android.com/guide/topics/ui/accessibility/service?utm_source=chatgpt.com "Create an accessibility service"
[8]: https://support.google.com/googleplay/android-developer/answer/10964491?hl=en&utm_source=chatgpt.com "Use of the AccessibilityService API - Play Console Help"
[9]: https://developer.apple.com/documentation/appintents?utm_source=chatgpt.com "App Intents | Apple Developer Documentation"



## 支持性分析

**有，而且是有機會形成明顯差異化的那種。**
但優勢不在「我們做了一個會幫你點滑鼠的 Agent」，而在於你怎麼把它包成一個清楚、可信、能落地的創業故事。

評審通常會被這幾個點打中：

### 1. 題目夠新，不是又一個聊天機器人

現在很多作品還停在：

* 聊天問答
* 文件摘要
* 知識庫
* AI 客服
* AI 幫你生成內容

AI 島若做到：

> AI 不只回答，而是能跨網站、電腦、手機完成任務。

這會直接跳到 **Agent + Device Automation + AI 教育**，辨識度很高。

你可以把差異講成：

```text
別人教你怎麼問 AI
AI 島教你怎麼讓 AI 真正做事
```

這句就很能打。

---

### 2. 你不是單純做工具，而是在解決「新手不敢用 Agent」

這是你真正有優勢的地方。

市面上很多 Agent 產品都有同一個問題：

* 太技術
* 太危險
* 不知道它做了什麼
* 使用者不敢授權
* 出錯後不知道怎麼救
* 一般人根本不懂 MCP、API、權限、工作流

AI 島可以主打：

> 把 Agent 操作拆成看得懂、能學會、可掌控的過程。

這跟你原本 AI 島定位完全接得上：

* 降低 AI 恐懼
* 降低程式恐懼
* 用任務式學習
* 看見 Agent 每一步
* 學會建立自己的工具
* 學會怎麼安全授權

這不是硬加功能，是品牌主線的自然進化。

---

### 3. Demo 很容易製造舞台效果

創業比賽很吃現場展示。

你只要展示：

> 手機輸入一句話
> → 家中電腦收到任務
> → 自動打開 VS Code
> → 執行 AI 島測試
> → 找到錯誤
> → 回傳手機
> → 修改前要求確認

這個畫面比放二十頁市場分析更有記憶點。

評審會直接看懂：

* 它真的會執行
* 它跨裝置
* 有安全確認
* 不是假 AI
* 有實際場景

Demo 一旦穩，優勢很大。

---

### 4. 有延伸商業模式

這個題目不是做完就沒了，可以延伸成：

```text
個人訂閱
企業 Agent
教育課程
技能商店
自訂 Agent
MCP 工具市場
企業內部自動化
Agent 操作訓練
```

尤其技能商店很好講：

> 使用者可以安裝不同職能的 Agent，例如網站測試員、檔案整理師、GitHub 助手、學習陪練員。

對評審來說，這代表你不是單點功能，而是平台型構想。

---

## 對立性視角

但我要直接戳破一件事：

> **這個題目很有吸引力，也很容易死在「看起來很強，實際做不完」。**

創業比賽不只看幻想有多大，也看你是不是在吹一艘還沒釘好的航空母艦。

### 最大問題一：範圍太大

你現在講的是：

* 手機
* 電腦
* Windows
* Android
* iPhone
* 瀏覽器
* MCP
* API
* VS Code
* 自動化
* 教育
* 技能商店

這在評審耳中可能不是「宏大」，而是：

> 這團隊到底有幾百個工程師？

所以參賽時不能說「我們什麼都能控制」。

應該縮成：

> 第一階段聚焦在新手與創作者的 Windows 工作流，由手機下達任務，AI 島協助完成瀏覽器、檔案、程式測試與常見工具操作。

這樣可信度會高很多。

---

### 最大問題二：競爭對手非常強

你一定會被問：

* 跟 OpenAI Operator / Computer Use 差在哪？
* 跟 Claude Computer Use 差在哪？
* 跟 Microsoft Copilot 差在哪？
* 跟 Zapier、n8n、Make 差在哪？
* 跟各種自動化 Agent 有什麼差別？

不能回答：

> 我們比較親民。

太虛。

你要答：

> 我們不是做通用 Agent 模型，而是做面向 AI 初學者的安全操作層、教學層與任務模板平台。底層模型可以替換，核心價值在權限透明、步驟可視化、失敗可回復，以及使用者能從使用 Agent 進一步學會建 Agent。

這才是護城河敘事。

---

### 最大問題三：沒有數據，Demo 再帥也可能只是魔術

評審很可能問：

* 成功率多少？
* 能完成幾種任務？
* 平均要幾步？
* 出錯率多少？
* 一次成本多少？
* 使用者真的需要嗎？
* 使用者敢不敢授權？

所以你至少要準備：

| 指標     |       最低要有 |
| ------ | ---------: |
| 可完成任務數 |     5～10 種 |
| 任務測試次數 |  每種至少 20 次 |
| 成功率    |  80% 以上較能講 |
| 人工介入率  |       越低越好 |
| 平均執行成本 |       要算清楚 |
| 使用者訪談  | 至少 10～20 人 |
| 願意使用比例 |       要有實測 |
| 願意付費比例 |     最好能問出來 |

沒有這些，評審可能會說：

> 很酷，所以呢？

這三個字很殘忍，但比賽裡天天出沒。🪓

---

# 我給這個題目的比賽評分

假設滿分 10 分：

| 面向      | 分數 | 評語             |
| ------- | -: | -------------- |
| 創新性     |  9 | 很有舞台感          |
| 差異化     |  8 | 前提是綁定 AI 教育與安全 |
| 技術難度    |  9 | 加分也是風險         |
| 市場潛力    |  8 | 可從個人走向企業       |
| 可落地性    |  6 | 範圍需要砍          |
| 商業模式    |  7 | 還需驗證付費意願       |
| Demo 效果 | 10 | 做穩會很炸          |
| 評審理解度   |  8 | 故事包裝要簡單        |

**整體：8/10。**

不是穩拿獎，但絕對比「再做一個 AI 聊天網站」有競爭力。

---

# 最適合你的參賽版本

不要用：

> AI 島打造能控制所有手機與電腦的超級 Agent。

這聽起來像科技發布會喝了三杯。🥴

改成：

## **AI 島行動代理：讓不會寫程式的人，也能安全指揮 AI 完成數位任務**

核心場景只挑三個：

1. **AI 學習助理**
   幫使用者開工具、建立環境、執行教學任務。

2. **AI 開發助理**
   幫新手跑測試、讀錯誤、整理問題、提出修正。

3. **AI 數位生活助理**
   幫使用者整理檔案、操作網站、建立任務。

Demo 只做一條閉環：

```text
手機下指令
→ 電腦執行
→ AI 判斷
→ 高風險操作前確認
→ 回傳結果
```

---

# 最能打評審的一句話

> 現在的 AI 會回答問題，下一代 AI 會替人完成任務；但真正阻止一般人使用 Agent 的，不是模型能力，而是他們不敢授權、不懂操作，也無法判斷風險。AI 島要做的，就是讓每個人安全地學會駕馭 Agent。

這句比「我們用了很多先進技術」強十倍。

結論很直接：

**有優勢，但前提是你把它做成「安全、可教、可展示的 Agent」，不是一張寫滿全平台支援的宇宙許願清單。** 👑
