# 工作日誌 2026-07-23

> 待辦主檔：`docs/todo/todo_list_0723.md`（0722→0723 續用；本日改名）。
> 本日主軸：**續辭典大量批次（22 批、+501 條 → 2348）＋翻譯 backlog 跑完（99%）**，收尾更新文件、全面 DB/API/UI 對齊健檢。

---

## 續辭典 — 本 session 共 22 批（seed 43–64，1847 → 2348 條，+501）

繁中原生、白話＋比喻，每條含「白話定義 + 什麼時候在意 + 生活比喻 + 範例 + 相關詞」。手寫零 API、依 slug upsert 冪等灌 DB。每批續寫前先跨檔掃 slug 去重（多批中途遇既有 slug 即時剔除）。

- **seed 43**：前端框架/React-Vue/TS 型別/測試（ssr-csr、RSC、樂觀更新、reactivity、satisfies、mock/stub/spy、AAA…）
- **seed 44**：Git/CLI-shell/CSS 版面（cherry-pick、merge-vs-rebase、pipe/std-streams、grep/sed/awk、stacking-context、subgrid…）
- **seed 45**：資料結構演算法/瀏覽器 JS（stack/queue/heap/graph、big-O、shadow-DOM、proxy、structuredClone…）
- **seed 46**：軟體工程實務（多層快取、SOLID 五原則、ETL/列式儲存、SLO-SLA-SLI、GitOps、HMR…）
- **seed 47**：AI/LLM 進階 + 產品成長（temperature、MoE、KV-cache、RAG、AI-agent、北極星指標、LTV-CAC…）
- **seed 48**：作業系統/底層 + 資安攻擊（排程器、syscall、page-fault、命令注入、SSTI、XXE、供應鏈攻擊…）
- **seed 49**：機器學習深入 + UX/設計（過擬合、隨機森林、k-means、費茲定律、完形原則、黑暗模式…）
- **seed 50**：DB 深入 + API + 黑話/Web3（複合索引、cursor 分頁、cargo-cult、footgun、共識機制、L2 擴容…）
- **seed 51**：編譯器/語言實作 + 行動 App + 網路（AST/lexer/parser/JIT、程式碼簽章、OTA、TCP-vs-UDP、NAT 穿透…）
- **seed 52**：函數式編程 + 網頁 API + 無障礙（不可變、pipe-compose、Fetch/AbortController、aria/WCAG/prefers-reduced-motion…）
- **seed 53**：敏捷 + 遊戲圖形 + CS 理論（燃盡圖、delta-time、shader、光柵化、圖靈機、NP完全、regex 引擎 ReDoS…）
- **seed 54**：並發/非同步 + 雲端 + 金流（actor 模型、worker-pool、serverless、PCI-DSS、3DS、webhook 冪等、chargeback…）
- **seed 55**：郵件/訊息 + 媒體壓縮 + 搜尋（SMTP/SPF-DKIM-DMARC、MQTT、gzip-brotli、自適應串流、反向索引、TF-IDF…）
- **seed 56**：時間日期 + Unicode + 開發工具（UTC/cron、單調時鐘、grapheme、emoji 編碼、pre-commit、monorepo…）
- **seed 57**：統計/資料 + 身分驗證 + 快取策略（常態分佈、貝氏、OIDC/SAML/MFA、cache-aside、write-through、SWR…）
- **seed 58**：Linux/系統管理 + 密碼學 + 微服務（systemd、log 輪替、AES/RSA、金鑰交換、API 閘道、BFF、絞殺榕…）
- **seed 59**：錯誤處理 + 可觀測性 + 可靠性（斷路器、優雅降級、panic-recover、OpenTelemetry、黃金訊號、零停機、錯誤預算…）
- **seed 60**：進階資料結構 + 網路 + PWA（B樹/LSM/紅黑樹/併查集、子網劃分、DHCP、SW 生命週期、web-manifest、background-sync…）
- **seed 61**：CSS 進階 + 型別理論 + 程式範式（@keyframes、層疊層、共變逆變、和積型別、命令式/OOP/函數式/邏輯式範式…）
- **seed 62**：商業/產品 + SEO + 行銷（TAM-SAM-SOM、JTBD、飛輪、on-page SEO、Core Web Vitals、AARRR、社會證明…）
- **seed 63**：資料庫進階 + 測試 + API 設計（MVCC、幻讀、視窗函數、測試金字塔、契約測試、REST 成熟度、GraphQL N+1…）
- **seed 64**：分散式系統 + 硬體底層 + 深度學習（Raft/Paxos/CRDT/Saga、GPU/SIMD/快取階層、神經網路/反向傳播/遷移學習…）

## 翻譯 backlog 跑完（i18n）

- `translate-sync-all.mjs`（免費 Google、非 API、冪等）跑多輪 1000/輪迴圈直到 script 回「已同步完」。
- **辭典 i18n 覆蓋 99%**（17962 / 18123 非空欄位×語言）。＊分母是「非空欄位」：僅 1345/2348 詞條有 `analogy`、其餘只翻 zh_name+plain（早期批次沒填 analogy）。所以 script 說「翻 0 已同步完」＝真的沒東西可翻了，不是卡住。
- 一併同步 chapter/lesson/blog/forum 各 scope 的改動（如深寫章 lesson 內文重翻）。Google 全程未擋量。

## 🏁 收尾健檢（全面 DB / API / UI / RWD 對齊）

- **資料表**：`_diag-sql-vs-db.mjs` → SQL 宣告 222 張、DB 227 張、**0 張缺**（含機會島三表）。
- **欄位**：`db_check.mjs` → 151 ADD COLUMN 宣告、**0 欄缺**（lesson_reactions_userid 已在）。
- **RPC**：`rpc_check.mjs` → 程式呼叫 49 個、僅 `get_user_stats` 缺＝DatabaseLab 教學範例字串（非真呼叫、免建）。
- **API↔DB 欄位**：`audit-db-columns.mjs` → 機會島三表（submission_tasks/user_portfolio/opportunity_changes）新查詢全乾淨；殘留 ✗ 皆既有 template-literal / URL 誤報。
- **建置**：`npx tsc --noEmit` ✅ 0 · `npx vitest run` ✅（23 檔）· `npx next build` ✅ exit 0。
- **RWD/亮暗**：本日新 UI（FeatureGuide 卡、機會島缺件清單/作品庫、準備量 badge、FAQ details、LINE Flex 卡）皆響應式 class 齊、深淺色調過。
- **無新 migration 待跑**：機會島三表已於授權時跑 prod 並驗證存在。

## 文件收尾

- `todo_list_0722.md` → **改名 `todo_list_0723.md`**（git mv），標題日期改 0723；CLAUDE.md 主檔指標同步更新。
- 本日完成項全部在 todo 劃線更新（辭典 43–64、翻譯 backlog、機會島三表/§3.6、使用說明、LINE 美化、CSP、apple-touch-icon）。
- 補寫 0722 worklog 後半段（機會島三表 / §3.6 / FeatureGuide / LINE 通知美化 / CSP / apple-touch-icon）。

## 互動學習道具大工程 — 定調 + 起步（林董 0723）

- **背景**：林董檢視 ch26（Python 基礎 38 課）只掛 1 個 scenario-judge，指出 0722 的「每章 1-2 教具」campaign **太薄、太敷衍**。重新定調「教具＝能讓使用者真正學懂該章的互動道具、玩了就懂」。
- **定調規則**（詳見 todo §4.1.5）：① 程式碼章每課沙盒必備（概念課例外→給道具）② 非程式章給該領域道具（寫作→TipTap）③ 既有好道具鋪更密 + 可遊戲化 ④ 建新「玩了就懂」元件。
- **起步（本日已建 2 個新元件）**：
  - **RegexTester** ✅：打 pattern + 測試字串，即時高亮命中、列擷取群組、語法錯即時提示。掛 ch64.4（正則 cheatsheet）/ch04.24（JS RegExp）/ch07.25（字串+正則）。
  - **WritingStudio** ✅：TipTap 編輯器 + 即時字數 + 引導發部落格（接現有 BlogEditor + /me/blog/new）。掛 ch51.3（部落格/內容寫作）。
- **確認**：Pyodide 已自動預載 numpy/pandas/matplotlib（可出圖表）→ ch26 資料/ML 課也能有真沙盒。
- **狀態**：大工程排入 todo §4.1.5、跨多次 session 逐章推進。tsc/vitest/build 全綠。

## ⏳ 下次開工

- **續辭典**：2348 / 5000，從 `dictionary-seed-65.json` 接（第 65 批）。＊新批次記得跑 `translate-sync-all.mjs` 補 i18n。
- 舊詞條的 `analogy` 補齊（1345/2348 有）＝可另做的品質提升。
- **C** 章節深寫剩餘章、**§6.8** 付費 gating 深化（動金流、單獨做）、§2.x 分身島 / §三 機會島大量 backlog（多需 🔴 外部帳號）。
