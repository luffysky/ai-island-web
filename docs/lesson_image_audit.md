# Lesson 圖文配圖 audit + GPT 生圖 prompt 清單

**目的**：林董直接拿這份去 ChatGPT（gpt-image-1）／DALL·E 3 生圖、不用每次重想 prompt。
**範圍**：75 章 / 1,158 lesson 全部掃過、依 _oneshot-pic-audit.mjs 分 A / B / C 三類。
**日期**：2026-05-29

---

## 0. GPT 生圖能做什麼、不能做什麼

| 適合 GPT 生 | 不適合 GPT 生 |
|---|---|
| ✅ 概念視覺化（變數作用域、event loop、reference 流向）| ❌ 真實 IDE / Dashboard 截圖 + 紅圈標註 |
| ✅ 流程示意圖（HTTP request、OAuth flow、Docker 層）| ❌ 中文長段文字（會糊掉、看不出來）|
| ✅ 比較對照圖（SQL vs NoSQL、CSR vs SSR）| ❌ 中文字數字排版（GPT 寫中文常出錯字）|
| ✅ Infographic 風格教學圖 | ❌ 像素級精準（按鈕位置、選單名稱、表格欄位）|
| ✅ 抽象隱喻（樂高、廚房、便利商店比喻）| ❌ 需要更新的真實畫面（軟體版本一變就失準）|

**結論**：A 類圖請手工做（Figma/Canva）或截圖標註工具；B、C 兩類用 GPT 就好。

---

## 1. 通用 GPT prompt template

複製這個 template、把 `{{ }}` 內換掉即可：

### B 類（概念解說）template

```
Create a clean, vibrant educational infographic explaining "{{ CONCEPT }}".

Style: flat design, dark navy background (#0a0e14),
       colorful accents (yellow, cyan, magenta), thick rounded shapes.
       NO complex gradients. NO realistic shadows.

Layout: 3 to 4 panels showing step-by-step progression.
        Use clear arrows between panels to show flow.

Text: English labels only (Chinese text often renders garbled).
      Use SHORT keywords, not sentences.
      Use emoji icons (🟢 🟡 🔴 ➡️ ✅) instead of long text where possible.

Style reference: Linear / Vercel / Stripe documentation illustrations.
                Modern, friendly, NOT cartoonish.

Aspect ratio: 16:9 (good for slides and lesson cards)
Resolution: 1920x1080 if possible
```

### C 類（流程/架構）template

```
Create a clean technical flowchart diagram of "{{ FLOW }}".

Style: minimal, like AWS architecture diagrams or excalidraw boards.
       Dark background (#0a0e14), white/cyan lines, colored nodes.

Layout: nodes connected by arrows showing data flow direction.
        Group related nodes with subtle background rectangles.

Text: English only, short keywords (2-4 words per node).
      Include arrow labels for key transitions.

Visual hints: use icons or emoji to differentiate node types
              (e.g. 🟦 client, 🟨 server, 🟥 database, 🟩 cache).

Aspect ratio: 16:9
Resolution: 1920x1080
```

### A 類（截圖步驟）— 不用 GPT、改用這些工具

| 工具 | 適合 |
|---|---|
| **Snipping Tool**（內建 Win+Shift+S）| 快速截圖 |
| **Greenshot** / **Lightshot** | 截圖 + 紅圈紅箭頭直接畫上去 |
| **Figma** | 排版多步驟教學頁、可加註解 |
| **Canva** + Infographic template | 半套自動排版 |

---

## 2. 🔴 A 類：截圖步驟圖（共 89 條、列 Top 15 最值得做）

**這類圖必須真實截圖、GPT 做不來。建議林董優先做這 15 條（新手最容易卡）：**

| Chapter | Lesson | 標題 | 為什麼急 |
|---|---|---|---|
| Ch26 | L26.0 | 開始之前 — 你需要知道的 5 件事 | Python 章開頭、卡住率最高 |
| Ch26 | L26.05 | 終端機 + GitHub + PowerShell 入門 | 沒終端機概念整章學不下去 |
| Ch26 | L26.1 | 為什麼是 Python？2026 安裝 + uv | 環境安裝、Windows / Mac / Linux 各異 |
| Ch26 | L26.1.5 | 編輯器 + Jupyter + Colab 工具大全 | 太多選擇、需視覺化引導 |
| Ch26 | L26.2 | Hello World、REPL、第一個變數 | REPL 看截圖最容易懂 |
| Ch31 | L31.2 | 安裝 Node + nvm/fnm 管版本 | 版本管理初心者必卡 |
| Ch32 | L32.1 | 為什麼是 Go？2026 安裝 | Go 環境特殊 |
| Ch15 | L15.2 | Git 進階：Branch + PR + Conflict | GitHub UI 操作 |
| Ch15 | L15.5 | 環境變數 + Secrets | Vercel / Zeabur 後台截圖 |
| Ch17 | L17.27 | Supabase：10 分鐘架好 SQL 後端 | Supabase Dashboard 操作 |
| Ch48 | L48.3 | Cursor 完整使用 | Cursor IDE 截圖必要 |
| Ch48 | L48.4 | Claude Code CLI 完整 | terminal 操作 |
| Ch64 | L64.1 | VSCode 快捷鍵 + 必裝套件 | VSCode UI |
| Ch62 | L62.3 | Git 完整指令 | 命令 + 結果輸出 |
| Ch64 | L64.3 | Docker / Docker Compose 速查 | docker UI / CLI |

**剩 74 條**（包含其他語言安裝、IDE 使用、各種 Dashboard）暫不急。

---

## 3. 🟢 B 類：概念解說圖（共 267 條、列 Top 30 + prompt）

**這類強推 GPT 生。Top 30 按「新手最容易誤解」排序：**

### CSS / 排版（4 條）

| Lesson | 標題 | GPT prompt（concept 換掉即可） |
|---|---|---|
| Ch02 L2.4 | 盒模型 | `the CSS Box Model: content, padding, border, margin as concentric rectangles, labeled` |
| Ch02 L2.6 | Flexbox 一維排版 | `Flexbox layout: main axis vs cross axis, justify-content vs align-items, 6 example layouts` |
| Ch02 L2.7 | Grid 二維排版 | `CSS Grid: rows columns gap, fr unit visualization, grid template areas` |
| Ch02 L2.8 | position 五種人格 | `CSS position values: static relative absolute fixed sticky, 5 cards comparing behavior` |

### JavaScript / 程式語言核心（10 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch04 L4.4 | `==` vs `===` | `JavaScript loose vs strict equality: showing type coercion behavior with 6 examples` |
| Ch04 L4.9 | 原型鏈 Prototype | `JavaScript prototype chain: object pointing to prototype, prototype pointing to Object.prototype, ending at null` |
| Ch04 L4.10 | Event Loop | `JavaScript Event Loop: call stack, web APIs, callback queue, microtask queue, event loop arrows` |
| Ch04 L4.11 | Promise | `JavaScript Promise states: pending → fulfilled / rejected, with .then() .catch() .finally() chain` |
| Ch04 L4.12 | Iterator / Generator | `JavaScript generators: function* yielding values one at a time, generator function vs iterator vs iterable` |
| Ch04 L4.18 | ESM vs CommonJS | `ES Modules vs CommonJS: import/export vs require/module.exports, static vs dynamic, side-by-side comparison` |
| Ch07 L7.20 | 並發 1：執行緒、鎖 | `concurrency primitives: thread, process, mutex lock, race condition visualization` |
| Ch07 L7.21 | async / await / event loop | `async await visualization: synchronous code style with non-blocking execution, promise chain underneath` |
| Ch07 L7.23 | Big O 時間複雜度 | `Big O notation: O(1) O(log n) O(n) O(n log n) O(n²) O(2^n) curves on a graph with example algorithms` |
| Ch07 L7.24 | 排序、搜尋、遞迴、DP | `4 algorithm categories: sorting, searching, recursion, dynamic programming, with iconic example each` |

### TypeScript（4 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch05 L5.1 | 為什麼學 TS | `JavaScript pain points fixed by TypeScript: typo catching, refactor safety, autocomplete, with before/after` |
| Ch05 L5.5 | Union + Literal Type | `TypeScript union types and literal types: status: 'idle' \| 'loading' \| 'done' visualization` |
| Ch05 L5.8 | Generic 泛型 | `TypeScript generics: function and class with type parameter T, like a reusable container with different content types` |
| Ch05 L5.11 | type vs interface | `type vs interface in TypeScript: side-by-side comparison of when to use which, with checkmarks` |

### React / Vue / Next.js（5 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch08 L8.24 | RSC vs Client Components | `React Server Components vs Client Components: tree diagram showing serialization boundary, with 'use client' marker` |
| Ch09 L9.23 | Vue vs React 全面對比 | `Vue vs React side-by-side comparison: template vs JSX, reactive vs hooks, with code snippets` |
| Ch10 L10.4 | SC vs CC（Next）| `Server Components vs Client Components in Next.js App Router: tree with green (server) and blue (client) leaves` |
| Ch10 L10.21 | Next vs Nuxt 對照 | `Next.js vs Nuxt 3 comparison: file structure, routing, data fetching, side-by-side table` |
| Ch08 L8.25 | React Performance | `React performance optimization: memo, useMemo, useCallback decision tree, when to use which` |

### 後端 / 網路（7 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch06 L6.22 | JWT 認證 | `JWT structure: header.payload.signature, base64 encoded, with private key signing on server` |
| Ch12 L12.3 | XSS 跨站腳本 | `XSS attack flow: attacker injects script, victim browser runs it, sends cookie to attacker server` |
| Ch12 L12.7 | HTTPS + TLS + 證書 | `TLS handshake: client hello, server hello, certificate exchange, key agreement, encrypted tunnel` |
| Ch12 L12.10 | Session vs JWT vs OAuth | `session vs JWT vs OAuth comparison: where state lives, who issues tokens, refresh flow` |
| Ch16 L16.2 | HTTP method/status/header | `HTTP anatomy: method line, headers, body, separated; status code ranges 2xx 3xx 4xx 5xx with color` |
| Ch16 L16.3 | REST/GraphQL/gRPC/WS/tRPC | `5 API styles compared: REST, GraphQL, gRPC, WebSocket, tRPC, with one-line use case each` |
| Ch16 L16.8 | JWT/Session/OAuth/RBAC/ABAC | `auth ecosystem map: JWT vs session, OAuth providers, RBAC vs ABAC decision tree` |

---

## 4. 🔵 C 類：流程 / 架構圖（共 132 條、列 Top 20 + prompt）

### HTTP / 認證流程（5 條）

| Lesson | 標題 | GPT prompt（用 C template + 換內容） |
|---|---|---|
| Ch16 L16.1 | 後端請求生命週期 | `HTTP request lifecycle flowchart: browser → DNS → TCP → TLS → HTTP → server → DB → response, with timing labels` |
| Ch21 L21.7 | OAuth 2.0 完整流程 | `OAuth 2.0 authorization code flow: user, client app, auth server, resource server, 6 numbered arrows` |
| Ch21 L21.2 | 密碼 + OAuth + Magic Link | `3 login flows side-by-side: password, OAuth, magic link, with security tradeoffs annotated` |
| Ch20 L20.8 | Webhook 設計 + 安全 | `webhook security flowchart: sender signs HMAC, receiver verifies, retry logic with exponential backoff` |
| Ch75 L75.1 | HTTP 生命週期 | `single HTTP request anatomy: URL parsing, DNS, TCP handshake, TLS, request, response, render` |

### 部署 / DevOps（4 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch15 L15.3 | GitHub Actions CI/CD | `CI/CD pipeline: push → lint → test → build → deploy → smoke test, with branch flows` |
| Ch15 L15.6 | Preview Deploy + Staging | `branch deployment strategy: main → production, PR → preview, feature → staging` |
| Ch22 L22.8 | Zero-downtime Deploy | `blue-green deployment: traffic switch from blue to green, with rollback arrow` |
| Ch23 L23.1 | 雲端架構總圖 | `AWS / GCP / Azure side-by-side: compute, storage, db, network, AI services compared` |

### Database / 資料流（4 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch17 L17.23 | Trigger / Function | `database triggers and functions: BEFORE/AFTER, INSERT/UPDATE/DELETE, fired on row event` |
| Ch18 L18.9 | MongoDB Aggregation Pipeline | `MongoDB aggregation pipeline: $match → $group → $project → $sort, each stage as a labeled funnel` |
| Ch18 L18.11 | Redis 5 種資料結構 | `Redis 5 data types: string, list, set, hash, sorted set, each with use case icon` |
| Ch16 L16.9 | Background Job / Queue | `job queue architecture: producer → Redis/RabbitMQ → workers, with retry and DLQ` |

### AI / Agent（7 條）

| Lesson | 標題 | GPT prompt |
|---|---|---|
| Ch46 L46.13 | RAG 完整 | `RAG flow: user query → embedding → vector DB search → retrieved chunks → LLM with context → answer` |
| Ch46 L46.16 | Agent 架構：ReAct / Plan-Execute | `Agent architectures compared: ReAct loop vs Plan-Execute vs Multi-Agent, side-by-side` |
| Ch49 L49.3 | ReAct 架構 | `ReAct loop: Thought → Action → Observation → Thought → ..., with tool calls and reasoning bubbles` |
| Ch49 L49.5 | Multi-Agent 架構 | `multi-agent system: orchestrator delegates to specialists (planner, researcher, coder, reviewer)` |
| Ch49 L49.6 | Agent Loop 從零實作 | `agent main loop pseudocode visualization: while not done: think, act, observe, update memory` |
| Ch49 L49.7 | Tool Use 完整 | `LLM tool use: model returns function call, runtime executes tool, result fed back to model` |
| Ch50 L50.4 | n8n Trigger 跟 Action | `n8n workflow: trigger node → conditional → action nodes branching out, with data flowing through` |

---

## 5. 林董使用流程

每生一張圖：

1. 從上面表格找對應 lesson、複製 prompt
2. 把 prompt 貼到 ChatGPT（Plus / Team / Enterprise 都有 image gen）或 DALL·E
3. 拿到圖、檢查中文有沒有糊（B / C 類我建議都用英文 label、勝率最高）
4. 滿意就下載、命名 `chXX_LXX.X_concept.png`、丟到 `public/lesson-images/` 或 `chapters/chXX.json` 對應 lesson 的 `image:` 欄位

如果想批量、可以串：
- Midjourney v6 對「infographic」風格更穩
- Stable Diffusion + ControlNet 對 flowchart 更準

但**最快**：先用 ChatGPT 試 5 張 B 類、看效果決定要不要繼續這條路。

---

## 6. 沒寫進 Top list 的怎麼辦

- A 類剩 74 條：等真的要做某章內容時、再針對該章做
- B 類剩 237 條 + C 類剩 112 條：用第 1 節的 template、自己 fill「{{ CONCEPT }}」即可

完整原始 lesson 清單可以重跑：
```
node scripts/_oneshot-pic-audit.mjs
```
