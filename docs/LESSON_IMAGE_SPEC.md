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
| ✅ `ch00.04_vscode_interface.png` | 0.4 | **（已佈線）** VS Code 介面五大區塊導覽。林董實際檔名 `ch00.04_vscode_interface.png`（原規劃 `ch00_vscode_ui`）。0.4 另已佈 `ch00.01_vscode_install`（安裝）/ `ch00.03_vscode_extensions`（擴充）/ `ch00.05_first_project_setup`（建第一個專案）。|
| `ch01_devtools_elements.png` | 1.1 | Chrome F12 開 Elements、游標移到頁面元素看對應 HTML 標籤。紅框標 Elements 面板。|
| `ch08_create_react.png` | 8.2 | **建 React 專案（現代版）**：`npm create vite@latest` → 選 `react-ts` → `cd` → `npm install` → `npm run dev`。終端機編號步驟 + 一句「過來人：以前用 `npx create-react-app`、現已停更，改用 Vite」。|
| `ch08_create_react_cra.png` | 8.2 | **（歷史對照、可選）** 舊的 `npx create-react-app my-app` 長怎樣 + 為什麼 2026 別再用（慢、停止維護）。對照 D-1 工具演進。|
| `ch09_create_vue.png` | 9.2 | **建 Vue 專案**：`npm create vue@latest` → 互動選項（TS / Router / Pinia / ESLint 要不要）→ `cd` → `npm install` → `npm run dev`。終端機編號步驟。|
| `ch10_create_next.png` | 10.1 | 建 Next.js 專案：`npx create-next-app@latest` 選項說明（App Router / TS / Tailwind）。|
| `ch10_create_nuxt.png` | 10.16 | **建 Nuxt 專案**：`npx nuxi@latest init my-app` → `cd` → `npm install` → `npm run dev`。終端機編號步驟。|
| `ch48_cursor_setup.png` | 48.21 | Cursor / Claude Code 安裝 + 第一次設定（登入、選模型、開專案）。|
| `ch48_codex_cli.png` | 48.21 | **（已有範例 example/pic/4）** Codex / Claude Code CLI 使用：裝 → 登入 → 在專案下指令。|
| `ch17_install_postgres.png` | 17.2 | 裝 PostgreSQL（Docker `docker run` 或本機）+ 用 TablePlus / psql 第一次連線。|
| `ch22_docker_desktop.png` | 22.x | 裝 Docker Desktop + `docker build` / `docker run` 第一次跑起來。|
| `ch22_deploy_zeabur.png` | 22.x | Zeabur / Vercel 部署流程：連 GitHub → 選 repo → 設 env → deploy。截圖步驟。|
| `ch31_install_node.png` | 31.1 | 裝 Node（建議 nvm）+ `node -v` / `npm -v` 確認。|
| `ch39_line_console.png` | 39.2 | LINE Developers Console 建 channel + 官方帳號後台設定截圖。|
| `ch25_dns_setup.png` | 25.x | 網域 DNS 設定：A / CNAME 紀錄怎麼填、指到主機 + 等生效。|
| ✅ `ch00.02_vscode_zhtw.png` | 0.4 | **（已佈線）** VS Code 裝繁體中文語言包步驟。林董實際檔名 `ch00.02_vscode_zhtw.png`（原規劃 `ch_vscode_zhtw`）。|

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

## D. 前端框架專區（📊 React / Vue / Vite / Next / Nuxt — 前端是多數人入門基礎，加碼詳細）

> 林董指示：這幾章教學圖要「帶到一點 CRA」——雖然 2026 幾乎沒人用 Create React App 了，但要讓學員知道「過來人以前怎麼寫、為什麼現在改用 Vite」，理解工具演進。
> 全部是 📊 概念 / 對照型，深色底 + 綠青點綴、繁中、底部「☕ 一句話總結」。

### D-1. 工具鏈演進 + 建置工具（含 CRA 歷史，跨 ch08 / ch10）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch08_frontend_tooling_history.png` | 8.2 | **前端建置工具演進時間軸**：手寫 `<script>` →（2016）**Webpack** →（2016-2023）**CRA / Create React App**（曾是 React 官方起手式、現已停止維護）→（2021+）**Vite** 成主流。一句「過來人：以前 `create-react-app`、現在 `npm create vite`，啟動快 10 倍」。|
| `ch08_cra_vs_vite.png` | 8.2 | **CRA vs Vite 對照表**：啟動速度（CRA 數十秒 vs Vite 秒開）、熱更新、設定彈性、2026 官方現況（React 官網已不再推薦 CRA、改推 Vite / Next）。讓學員看懂「為什麼舊教學都寫 CRA、但你別再用」。|
| `ch08_vite_how_it_works.png` | 8.2 | **Vite 為什麼快**：開發時用瀏覽器原生 ESM、用到哪個檔才即時編譯哪個（on-demand）；對比 CRA / Webpack「啟動先把整包打包完」。左右對照圖。|
| `ch08_npm_scripts_flow.png` | 8.2 | `npm run dev / build / preview` 各做什麼：dev=開發伺服器（熱更新）、build=產出 production 靜態檔、preview=本機預覽打包結果。|

### D-2. React 核心（ch08，補現有 component_tree / usestate_rerender / useeffect_lifecycle 之外）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch08_jsx_to_js.png` | 8.3 | **JSX 怎麼變成 JS**：`<h1>Hi</h1>` →（編譯）→ `React.createElement('h1', null, 'Hi')`。破除「JSX 是 HTML」的誤解。|
| `ch08_virtual_dom_diff.png` | 8.1 / 8.5 | **Virtual DOM diff**：state 變 → 算出新虛擬樹 → 跟舊的比對 → 只更新「真的有變」的真實 DOM 節點。|
| `ch08_hooks_overview.png` | 8.5-8.11 | **常用 Hooks 一圖速查**：useState（狀態）/ useEffect（副作用）/ useRef（不重渲染的值）/ useMemo（快取值）/ useCallback（快取函數）/ useContext（跨層共享）各管什麼。|
| `ch08_props_vs_state.png` | 8.4 / 8.5 | **props vs state**：props＝外面傳進來、唯讀；state＝元件自己的、可變、變了會重畫。對照圖。|
| `ch08_server_vs_client_component.png` | 8.20 / 8.24 | **Server Component vs Client Component**：在哪裡跑、能不能用 useState / onClick、`"use client"` 邊界、誰能 import 誰。|

### D-3. Vue 核心（ch09）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch09_reactivity_system.png` | 9.4 / 9.11 | **Vue 響應式系統**：`ref` / `reactive` → Proxy 在背後盯著 → 資料一變、用到它的畫面自動更新。|
| `ch09_sfc_anatomy.png` | 9.2 | **單檔元件（.vue）三段解剖**：`<template>`（畫面）/ `<script setup>`（邏輯）/ `<style scoped>`（只影響本元件的樣式）。|
| `ch09_template_directives.png` | 9.3 / 9.12 | **模板指令速查**：`{{ }}` 插值 / `v-bind`(:) / `v-on`(@) / `v-if` / `v-for` / `v-model` 各做什麼，一圖對照。|
| `ch09_composition_vs_options.png` | 9.11 | **Composition API vs Options API**：同一個 counter 兩種寫法並排，標出「為什麼 Vue 3 改推 Composition（相關邏輯擺一起）」。|
| `ch09_props_emit_slot.png` | 9.5 / 9.13 | **元件通訊三招**：props 往下傳、emit 往上喊、slot 留位置插內容。箭頭方向圖。|
| `ch09_vue_vs_react.png` | 9.10 / 9.23 | **Vue vs React 心智模型對照**：模板指令 vs JSX、響應式自動追蹤 vs 重新執行整個函數、學習曲線、生態。|

### D-4. Next.js（ch10）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch10_rendering_modes.png` | 10.2 | **五種渲染模式對照**：CSR / SSR / SSG / ISR / RSC——誰在「何時、由誰」產生 HTML，對 SEO 與速度的影響。一張大對照表（最重要）。|
| `ch10_spa_vs_ssr_seo.png` | 10.1 | **純 SPA vs SSR 對 SEO 的差別**：CRA / Vite React 送「空殼」給 Google（看到空白）vs Next SSR 送「填好內容」（Google 讀得到）。呼應 D-1 的工具演進。|
| `ch10_app_router_structure.png` | 10.3 | **App Router 檔案即路由**：`app/` 資料夾結構 ↔ 對應 URL，約定檔名 `page` / `layout` / `loading` / `error` 各是什麼。|
| `ch10_server_client_boundary.png` | 10.4 | **Server / Client Component 邊界**：哪些在伺服器跑、哪些標 `"use client"` 在瀏覽器跑、資料怎麼用 props 往下傳。|
| `ch10_data_cache_layers.png` | 10.8 | **Next.js 四層快取**：Request Memoization / Data Cache / Full Route Cache / Router Cache，一圖看懂「為什麼改了資料沒更新」。|

### D-5. Nuxt（ch10 後半）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch10_nuxt_structure.png` | 10.16 | **Nuxt 3 檔案結構 + 自動 import**：`pages/` 自動路由、`components/` 自動匯入（不用寫 import），跟 Next 對照。|
| `ch10_nuxt_data_fetching.png` | 10.17 | **useFetch / useAsyncData / $fetch 決策樹**：三者差別 + 什麼時候用哪個。|
| `ch10_routerules_render.png` | 10.19 | **Nuxt routeRules**：一個設定檔讓不同路由各自選渲染模式（這頁 SSG、那頁 SSR、另一頁 ISR）對照圖。|
| ✅ `ch10_next_vs_nuxt.png` | 10.21 | **（已佈線）** Next vs Nuxt 對照：React 陣營 vs Vue 陣營、心智模型 80% 相同、各自殺手鐧（Next: RSC / Nuxt: routeRules + auto import）。|

### D-6. 前端全景（收尾大圖）
| 檔名 | lesson | 內容 |
|---|---|---|
| ✅ `ch08_frontend_framework_roadmap1.png` + `2.png` | 8.1（開頭）| **（已佈線）** 前端三大框架路線圖。林董拆成兩張（上 / 下），8.1 開頭並列插入。React（Ch08）/ Vue（Ch09）/ Angular（Ch09c）三者定位、職缺、怎麼選、學習動線。|
| ✅ `ch08_react_ecosystem_2026.png` | 8.1 | **（已佈線）** React 生態系 2026，放「完整前端地圖」段開頭。|
| ✅ `ch09_vue_ecosystem_2026.png` | 9.1 | **（已佈線）** Vue 生態系 2026。|
| ✅ `ch09c_angular_ecosystem_2026.png` | 76.1（Ch09c）| **（已佈線）** Angular 生態系 2026。|
| ✅ `ch09b_vite_react_vue.png` | 74.1（Ch09b）| **（已佈線）** Vite × React / Vue。|
| `ch08_frontend_landscape_2026.png` | 8.1 | **2026 前端全景路線圖**：框架（React / Vue / Svelte / Solid）→ meta-framework（Next / Nuxt / SvelteKit）→ 建置工具（Vite）→ 該怎麼選的決策路線。新手入門地圖。|

---

## E. Python + 資料分析 + 爬蟲 + Node 專區（📊 ch26-31，加碼詳細）

> 林董指示細細規劃。注意：**ch26-28 是 Python（基礎 / 資料分析 / 爬蟲）、ch29 是 JS 爬蟲、ch30 跨語言爬蟲、ch31 是 Node.js**，圖依各章真實主題。
> A 區已有安裝圖（`ch26_install_uv_*` / `ch26_repl_guide` / `ch26_first_run_flow` / `ch31_install_node`）、B 區已有 `ch26_containers`，本區不重複、只補概念圖。

### E-1. Python 基礎（ch26，35 課，橫跨基礎 → ML → FastAPI）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch26_data_types.png` | 26.3 | int / float / str / bool 四基本型別 + 各自陷阱（float 精度 `0.1+0.2`、字串不可變）。|
| `ch26_comprehension.png` | 26.5 | List Comprehension 拆解：`[x*2 for x in nums if x>0]` →（要什麼）（來源）（條件）三段，對照傳統 for 迴圈。|
| `ch26_args_kwargs.png` | 26.6 | `*args` / `**kwargs` 怎麼收參數：位置參數收成 tuple、關鍵字參數收成 dict。|
| `ch26_decorator.png` | 26.11 | decorator＝函數包函數：在「不改原函數」的前提下加功能（計時、權限檢查），@ 語法糖示意。|
| `ch26_generator.png` | 26.11 | generator（yield）：一次吐一個、用到才算（省記憶體）vs list 一次全產出。|
| `ch26_oop_class.png` | 26.10 | class / 物件 / 繼承：藍圖 → 實例、`dataclass` 省樣板。|
| `ch26_ml_3types.png` | 26.16 | 機器學習三類對照：監督（有答案）/ 非監督（找結構）/ 強化（試錯獎勵）。|
| `ch26_nn_backprop.png` | 26.21 | 神經網路 + 反向傳播：前向算預測 → 比對答案算誤差 → 後向修權重。（可與 B 區 `ch46_neural_net` 風格一致）|
| `ch26_cnn_rnn_transformer.png` | 26.23 | CNN / RNN / Transformer 三大架構各擅長什麼（圖像 / 序列 / 全局注意力）。|
| `ch26_fastapi_flow.png` | 26.25 | FastAPI 請求流程：route → Pydantic 驗證 → 處理 → 回 JSON ＋ 自動產生 API 文件。|
| `ch26_async_python.png` | 26.27 | Python async / await + event loop：等 I/O 的空檔先做別的（呼應 7.21）。|

> ML / 神經網路相關（26.16-26.24）可與 B 區 ch46 的圖共用風格與概念；train/test split 直接用 `ch46_train_test_split.png`。

### E-2. Python 資料分析（ch27）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch27_numpy_vectorize.png` | 27.3 / 27.9 | NumPy 向量運算 vs Python for 迴圈：整批一次算（快上百倍）的示意。|
| `ch27_pandas_dataframe.png` | 27.4 | DataFrame 結構：index（列）/ columns（欄）/ values，像加強版 Excel 表。|
| `ch27_pandas_5ops.png` | 27.8 | pandas 5 大操作一圖：篩選 / 排序 / 分組 / 合併 / 聚合。|
| `ch27_data_cleaning.png` | 27.20 | 資料清理流程：缺失值（補 / 丟）/ 重複（去重）/ 異常值（偵測）。|
| `ch27_pandas_polars_duckdb.png` | 27.18 / 27.19 | pandas vs Polars vs DuckDB：依資料量級「何時用誰」對照。|
| `ch27_chart_picker.png` | 27.5 / 27.10 | 該用哪種圖：折線（趨勢）/ 長條（比較）/ 散點（關係）/ 圓餅（占比）選圖指南。|
| `ch27_analysis_flow.png` | 27.7 | 完整資料分析流程：取得 → 清理 → 探索（EDA）→ 視覺化 → 結論。|

### E-3. Python 爬蟲（ch28）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch28_crawl_flow.png` | 28.1 / 28.2 | 爬蟲四步流程：發請求 → 拿 HTML → 解析（選取元素）→ 存資料。|
| `ch28_static_vs_dynamic.png` | 28.2 / 28.3 | 靜態頁（requests + BS4 就夠）vs 動態頁（JS 渲染、要 Playwright）怎麼判斷、選工具。|
| `ch28_selector_xpath.png` | 28.12 | CSS Selector vs XPath：對同一段 HTML，兩種定位元素的寫法對照。|
| `ch28_anti_crawl.png` | 28.5 / 28.11 | 7 種反爬機制 + 對應破解（User-Agent / Cookie / 代理 IP / 驗證碼 / 頻率限制…）。|
| `ch28_tool_picker.png` | 28.1 | 爬蟲工具選擇樹：requests+BS4 →（要 JS）Playwright →（要規模）Scrapy。|

### E-4. JavaScript 爬蟲（ch29）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch29_node_vs_python_crawler.png` | 29.1 / 29.7 | Node vs Python 爬蟲對比：生態、速度、適用場景。|
| `ch29_puppeteer_vs_playwright.png` | 29.3 / 29.4 | Puppeteer vs Playwright（Node）差別與選擇（2026 首選 Playwright）。|
| `ch29_network_intercept.png` | 29.12 | 攔截 Network 直接抓 API 資料（不用辛苦解 HTML）的示意。|

### E-5. 跨語言爬蟲（ch30）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch30_lang_quadrant.png` | 30.1 / 30.7 | Python / Node / Go / Rust 爬蟲象限圖：開發速度 ↔ 執行效能，什麼時候該換語言。|
| `ch30_distributed_arch.png` | 30.5 / 30.17 | 分散式爬蟲架構：Redis Queue + 多 Worker + 去重 + 儲存。|
| `ch30_etl_pipeline.png` | 30.21 / 30.22 | 爬蟲 ETL pipeline：抓取 → 清理 → 轉換 → 儲存（CSV / Parquet / DB）→ 交付。|

### E-6. Node.js（ch31）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch31_event_loop.png` | 31.8 | Node event loop + 非阻塞 I/O：單執行緒卻能扛大量連線（餐廳一個服務生同時招呼多桌）。|
| `ch31_esm_vs_cjs.png` | 31.5 | ES Modules（import / export）vs CommonJS（require）對照表。|
| `ch31_express_middleware.png` | 31.9 | Express 中介層管線：request 經過一層層 middleware → handler → response。|
| `ch31_runtime_war.png` | 31.20 | Node vs Bun vs Deno（2026 runtime 戰）：速度、相容性、生態對照。|
| `ch31_streams.png` | 31.25 | Streams：大檔案邊讀邊處理、不整包塞進記憶體（水管 vs 水桶示意）。|

---

## F. 其他章節補充圖（📊 ch20 前面尚未列、加上 ch20-25 後端週邊）

> 林董指示「20 章前面也列出來」。這區補齊前面章節缺的概念圖，**ch03 UI/UX 完全沒圖、又最視覺，優先**。

### F-1. HTML（ch01，補 A 區的 devtools 之外）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch01_html_tree.png` | 1.x | HTML 是一棵樹：DOCTYPE → html → head / body 的巢狀結構圖。|
| `ch01_semantic_tags.png` | 1.x | 語意標籤 vs `<div>` 海：header / nav / main / article / footer 對照（給人 + 給機器看）。|
| `ch01_head_essentials.png` | 1.9 | `<head>` 必備 5 個：charset / viewport / title / description / lang。|

### F-2. UI/UX（ch03，🔴 最缺、最視覺、優先）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch03_ui_vs_ux.png` | 3.1 | UI vs UX：UI＝長相（顏色 / 圓角）、UX＝流程順不順（少步驟）對照。|
| `ch03_visual_hierarchy.png` | 3.3 | 視覺層次：用大小 / 粗細 / 顏色 / 對比引導眼睛先看哪。|
| `ch03_color_system.png` | 3.4 / 3.22 | 色票系統：主色 / 灰階 / 語意色（成功 / 警告 / 危險）各 11 階。|
| `ch03_spacing_8pt.png` | 3.6 / 3.24 | 8 點網格：間距都用 8 的倍數 + 對齊，整齊 vs 凌亂對照。|
| `ch03_button_states.png` | 3.7 | 按鈕 5 種狀態：default / hover / active / disabled / focus。|
| `ch03_5_laws.png` | 3.21 | 5 大設計法則一圖：Hick / Fitts / Miller / Jakob / 美感可用性。|
| `ch03_states_3.png` | 3.12 | 三種狀態：空狀態 / 載入中 / 錯誤，各該長怎樣（別只做「有資料」版）。|
| `ch03_a11y_contrast.png` | 3.14 | 無障礙：對比度合格 vs 不合格、觸控目標至少 44×44px。|

### F-3. TypeScript（ch05）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch05_type_inference.png` | 5.3 | 型別推斷：`const x = 5` → TS 自己知道是 number，不用標註。|
| `ch05_union_literal.png` | 5.5 | Union（A \| B）+ Literal 型別：「只能是這幾個固定值」示意。|
| `ch05_generics.png` | 5.8 / 5.23 | 泛型 `<T>`：一份程式適用多型別（萬用充電線比喻）。|
| `ch05_utility_types.png` | 5.24 | Utility Types：Partial / Pick / Omit 改造現有型別對照。|

### F-4. JSON（ch06）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch06_json_syntax.png` | 6.2 | JSON 語法：6 種值 + 2 容器（{} / []）+ 嚴格規則（雙引號、不能尾逗號、不能註解）。|
| `ch06_parse_stringify.png` | 6.3 | parse（字串 → 物件）/ stringify（物件 → 字串）來回轉示意。|

### F-5. 行動 App / SEO / PWA / DevOps（ch11 / 13 / 14 / 15）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch11_native_rn_flutter.png` | 11.1 | 三大路線對照：原生（Swift/Kotlin）/ React Native / Flutter，優缺點。|
| `ch13_seo_3pillars.png` | 13.1 | SEO 三本柱：技術 SEO / 內容 SEO / 連結（信任），缺一不可。|
| `ch13_serp_anatomy.png` | 13.1 / 13.12 | 搜尋結果（SERP）解剖：title / description / rich snippet 對應網頁哪些設定。|
| `ch13_seo_vs_geo.png` | 13.5 / 13.15 | SEO（拼 Google 排名）vs GEO（拼被 AI 引用）對照。|
| `ch14_pwa_3pieces.png` | 14.1 | PWA 三要素：Web Manifest + Service Worker + HTTPS。|
| `ch14_cache_strategies.png` | 14.13 | 快取策略對照：網路優先 / 快取優先 / Stale-While-Revalidate。|
| `ch15_cicd_pipeline.png` | 15.3 | CI/CD 流程：push → 測試 → build → deploy 自動化管線。|
| `ch15_git_branch_pr.png` | 15.2 | Git 協作流程：branch → commit → PR → review → merge。|
| `ch15_semver.png` | 15.13 | 語意化版本號 `1.2.3`：major / minor / patch 各代表什麼。|

### F-6. 後端週邊（ch20-25）
| 檔名 | lesson | 內容 |
|---|---|---|
| `ch20_rest_graphql_trpc.png` | 20.1 | 三種 API 風格對照：REST（固定套餐）/ GraphQL（自助夾取）/ tRPC（內線直通）。|
| `ch20_webhook_vs_poll.png` | 20.8 | Webhook（主動推）vs Polling（一直問）對照——省資源又即時。|
| `ch21_authn_vs_authz.png` | 21.x | 認證（你是誰）vs 授權（你能做什麼）對照（刷卡進門 vs 卡能開哪些門）。|
| `ch21_session_vs_jwt.png` | 21.x | Session（伺服器記住）vs JWT（自己帶證件）運作差別。（B 區已有 jwt_anatomy / oauth_flow）|
| `ch22_container_vs_vm.png` | 22.x | 容器（Docker）vs 虛擬機：共用 OS 核心、輕量快速 vs 各帶一套 OS。|
| `ch22_docker_flow.png` | 22.x | Dockerfile → image → container 流程（食譜 → 半成品 → 上桌）。|
| `ch23_iaas_paas_saas.png` | 23.x | IaaS / PaaS / SaaS 三層：租地自己蓋 / 租房簡裝 / 住飯店全包。|
| `ch24_observability.png` | 24.x | 可觀測性三本柱：Logs / Metrics / Traces（可與 B 區 ch16 共用）。|
| `ch25_dns_resolution.png` | 25.x | 從輸網址到看到網頁：DNS 查詢流程（問路 → 拿到 IP → 連線）。|
| `ch25_https_lock.png` | 25.x | 網址列那個鎖頭怎麼來：憑證 + TLS 握手 = 加密連線。|

---

## C. 建議產製順序

1. **A 區（操作教學）全做** — 對應真實卡關、CP 值最高，且已有 6 張範例風格可參考。
2. **B 區挑「最常被問」的**：ch07 變數賦值、ch17 JOIN、ch08 UI=f(state)、ch46 RAG、ch04 event loop。
3. **D 區（前端框架專區）優先** — 林董指示前端是多數人入門基礎；先做 D-1 工具演進（含 CRA 歷史）、D-4 ch10 五種渲染模式、D-2 React Hooks 速查，這三組最常卡。
4. **E 區（Python / 爬蟲 / Node）** — 先做 E-1 ch26 基礎（comprehension / decorator / generator / OOP）、E-3 ch28 爬蟲流程與靜態vs動態、E-6 ch31 event loop，這幾組最常卡。
5. **F-2 ch03 UI/UX 🔴 優先** — 這章完全沒圖、又最視覺，視覺層次 / 色票 / 8 點網格 / 按鈕狀態做出來最有感。
6. 其餘 B / D / E / F 區概念圖後續分批補。

> 全部加總約 **110+ 張**概念圖待產（B 40+、D 26、E 33、F 30+）。生好丟進 `public/lesson-img/ch{NN}/`、跟我說一聲，我依本表把 `![]()` 插進對應 lesson。

> 生好圖丟進 `public/lesson-img/ch{NN}/`、跟我說一聲，我就依本表把 `![]()` 插進對應 lesson 的正確段落。
