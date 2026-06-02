# 章節圖文解說 — 需求清單 + 圖片規格

> 目的：列出最需要「圖文解說 / 示意圖」的章節與 lesson，直接給檔名。
> 流程：**GPT 依本表生圖 → 放進對應資料夾 → 嶼築依檔名插進該 lesson 的正確位置（markdown `![]()`）。**
> 參考風格：`example/pic/1~6.png`（多面板資訊圖、繁體中文、深色 code 區 + 淺底註解、編號步驟①②③、紅框/箭頭標註）。

---

## 0. 規範（生圖前先看）

**存放位置**：`public/lesson-img/ch{NN}/{檔名}.png`
- 例：`public/lesson-img/ch26/ch26_install_uv_win.png`
- 每章一個資料夾、資料夾名 `ch01`…`ch75`（兩位數）。

**檔名規則**：`ch{NN}_{topic-slug}.png`（全小寫、單字用底線、英數）。本表「檔名」欄已列好、直接用。

**插入語法**（嶼築會做、你不用管）：lesson content 裡用
`![圖說文字](/lesson-img/ch26/ch26_install_uv_win.png)`

**兩種類型**：
- 🖼️ **操作教學**（screenshot 型）：安裝 / 設定 / 工具操作。需真實截圖風格、編號步驟、紅框標重點。**比文字有用 10 倍的就是這類**。
- 📊 **概念示意**（diagram 型）：抽象概念。用流程圖 / 對照圖 / 箭頭 / 配色區塊，不需截圖。

**通用風格**：
- 尺寸建議直式 3:4 或方形 1:1（手機看為主）。
- 繁體中文、用「」不用「，」、Luffysky 大白話風。
- 深色背景 + 綠/青點綴（對齊站內 `#50fa7b` 主題色更好）。
- 每張圖左上角放標題、底部可放一句「☕ 一句話總結」。

---

## A. 新手 onboarding 操作教學（🖼️ 最高優先 — 對應真實使用者卡關）

| 檔名 | 對應 lesson | 內容說明 |
|---|---|---|
| `ch26_install_uv_win.png` | 26.1 | Windows 裝 uv：PowerShell 貼 `irm https://astral.sh/uv/install.ps1 \| iex` → 重開終端機 → `uv --version` 確認。編號步驟 + 截圖。|
| `ch26_install_uv_mac.png` | 26.1 | Mac / Linux 裝 uv：`curl -LsSf https://astral.sh/uv/install.sh \| sh` → `uv --version`。|
| `ch26_env_var_win.png` | 26.1 | **（已有範例 example/pic/1、2）** 裝完後環境變數 / PATH 設定（Windows）：找不到指令時怎麼把 uv 加進 PATH、重開終端機讓 PATH 生效。|
| `ch26_vscode_python_ext.png` | 26.1 | VS Code 裝 Python + Pylance + Ruff 擴充：Extensions 面板搜尋 → Install → 選直譯器。|
| `ch26_repl_guide.png` | 26.2 | **（已有範例 example/pic/5）** Python REPL 圖文指南：`python` 進入 → `>>>` 是提示符不是要打的字 → 試 1+1 → `exit()` 離開。|
| `ch26_first_run_flow.png` | 26.2 | 「寫檔 → 終端機執行 → 看輸出」完整流程圖：📄 寫進 hello.py → 🖥️ `uv run hello.py` → 💬 電腦印出。對應四種標籤。|
| `ch00_terminal_open.png` | 0.x / 26.0 | 怎麼打開終端機：Windows（Win→cmd/PowerShell）、Mac（Cmd+空白→Terminal）。雙欄對照截圖。|
| `ch00_git_first_push.png` | 0.3 | Git 第一次 push 五步：`git init` → `add` → `commit` → 連 GitHub remote → `push`。流程圖 + 指令。|
| `ch00_github_signup.png` | 0.3 | GitHub 註冊 + 建 repo + 拿 remote URL 截圖步驟。|
| `ch01_devtools_elements.png` | 1.1 | Chrome F12 開 Elements、游標移到頁面元素看對應 HTML 標籤。紅框標 Elements 面板。|
| `ch08_create_vite.png` | 8.2 | 建 React 專案：`npm create vite@latest` → 選 react-ts → `cd` → `npm install` → `npm run dev`。終端機步驟。|
| `ch10_create_next.png` | 10.1 | 建 Next.js 專案：`npx create-next-app@latest` 選項說明（App Router / TS / Tailwind）。|
| `ch48_cursor_setup.png` | 48.21 | Cursor / Claude Code 安裝 + 第一次設定（登入、選模型、開專案）。|
| `ch48_codex_cli.png` | 48.21 | **（已有範例 example/pic/4）** Codex / Claude Code CLI 使用：裝 → 登入 → 在專案下指令。|
| `ch17_install_postgres.png` | 17.2 | 裝 PostgreSQL（Docker `docker run` 或本機）+ 用 TablePlus / psql 第一次連線。|
| `ch22_docker_desktop.png` | 22.x | 裝 Docker Desktop + `docker build` / `docker run` 第一次跑起來。|
| `ch22_deploy_zeabur.png` | 22.x | Zeabur / Vercel 部署流程：連 GitHub → 選 repo → 設 env → deploy。截圖步驟。|
| `ch31_install_node.png` | 31.1 | 裝 Node（建議 nvm）+ `node -v` / `npm -v` 確認。|
| `ch39_line_console.png` | 39.2 | LINE Developers Console 建 channel + 官方帳號後台設定截圖。|
| `ch25_dns_setup.png` | 25.x | 網域 DNS 設定：A / CNAME 紀錄怎麼填、指到主機 + 等生效。|
| `ch_vscode_zhtw.png` | 26.1（共用） | **（已有範例 example/pic/6）** VS Code 裝繁體中文語言包。|

---

## B. 概念示意圖（📊 抽象概念，diagram 型）

### 程式邏輯 / 共通（ch07）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch07_variable_assign.png` | 7.x | **（已有範例 example/pic/3）** `x = x * 5` 為什麼最後是 30 不是 35：= 是「指派」不是「等於」、要存回去。|
| `ch07_loop_flow.png` | 7.x | for / while 迴圈流程圖：進入 → 判斷條件 → 執行 → 回頭。|
| `ch07_if_branch.png` | 7.x | if / elif / else 分支示意（岔路圖）。|
| `ch07_function_io.png` | 7.7 | 函數 = 機器：input 參數 →（處理）→ return 輸出。|
| `ch07_recursion_callstack.png` | 7.x | 遞迴 + call stack：一層層疊上去、再一層層回來。|

### CSS（ch02）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch02_box_model.png` | 2.x | Box model：content / padding / border / margin 同心方框。|
| `ch02_flexbox_axes.png` | 2.x | Flexbox 主軸 / 交叉軸 + justify / align 對照。|
| `ch02_grid_lines.png` | 2.7 | Grid 行 / 列 / 線編號 + 區域命名。|
| `ch02_position.png` | 2.x | position：static / relative / absolute / fixed / sticky 對照示意。|

### JavaScript（ch04）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch04_event_loop.png` | 4.x | Event loop：call stack + callback queue + microtask，誰先跑。|
| `ch04_scope_closure.png` | 4.x | 作用域鏈 + 閉包：函數記住外層變數。|
| `ch04_eq_vs_eqeq.png` | 4.x | `==` vs `===`：型別轉換陷阱對照表。|

### React（ch08）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch08_component_tree.png` | 8.4 | Component 樹 + props 單向往下流。|
| `ch08_usestate_rerender.png` | 8.5 | setState → re-render 流程：UI = f(state)。|
| `ch08_useeffect_lifecycle.png` | 8.8 | useEffect 時機：mount / deps 變 / cleanup。|

### 後端 / DB / API（ch16-21）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch16_request_lifecycle.png` | 16.1 | 請求生命週期：瀏覽器 → 路由 → 中介層 → 處理 → DB → 回應。|
| `ch17_sql_joins.png` | 17.x | JOIN 種類：inner / left / right / full 的文氏圖。|
| `ch17_index.png` | 17.x | index 為什麼快：沒 index 全表掃 vs 有 index 像書的目錄。|
| `ch17_transaction_acid.png` | 17.21 | Transaction / ACID：扣款+建單要嘛全成功要嘛全失敗。|
| `ch20_rest_methods.png` | 20.x | HTTP 方法 + 狀態碼速查（GET/POST/PUT/DELETE、2xx/4xx/5xx）。|
| `ch21_jwt_anatomy.png` | 21.x | JWT 三段結構（header.payload.signature）+ 「只是編碼不是加密」。|
| `ch21_oauth_flow.png` | 21.x | OAuth 登入流程：使用者 → 授權 → code → token。|

### 資安（ch12）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch12_sql_injection.png` | 12.x | SQL injection 怎麼發生 + 參數化查詢怎麼擋。|
| `ch12_xss_csrf.png` | 12.x | XSS vs CSRF 差別示意。|
| `ch12_tls_handshake.png` | 12.x | HTTPS / TLS 握手流程（憑證、加密通道）。|

### HTTP（ch75）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch75_request_response.png` | 75.x | 一個 HTTP request / response 的組成（method、headers、body、status）。|
| `ch75_http_versions.png` | 75.x | HTTP/1.1 vs 2 vs 3 差別示意。|

### AI / ML（ch46, ch49）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch46_token_embedding.png` | 46.7 | token 是什麼 + embedding「意思變數字」示意。|
| `ch46_rag_flow.png` | 46.13 | RAG 流程：問題 → 檢索片段 → 塞進 prompt → LLM 回答。|
| `ch46_train_test_split.png` | 46.x | 訓練 / 測試集切分 + overfitting / underfitting 對照。|
| `ch46_neural_net.png` | 46.x | 神經網路結構（input / hidden / output 層）。|
| `ch49_agent_loop.png` | 49.1 | Agent = LLM + 工具 + 迴圈：思考 → 呼叫工具 → 看結果 → 再決定。|

### Python 容器（ch26）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch26_containers.png` | 26.4 | list / tuple / set / dict 四容器一圖對照（有序?可改?可重複?鍵值?）。|

---

## C. 建議產製順序

1. **A 區（操作教學）全做** — 對應真實卡關、CP 值最高，且已有 6 張範例風格可參考。
2. **B 區挑「最常被問」的**：ch07 變數賦值、ch17 JOIN、ch08 UI=f(state)、ch46 RAG、ch04 event loop。
3. 其餘 B 區概念圖後續分批補。

> 生好圖丟進 `public/lesson-img/ch{NN}/`、跟我說一聲，我就依本表把 `![]()` 插進對應 lesson 的正確段落。
