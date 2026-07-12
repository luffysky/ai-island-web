# Lesson 圖文配圖 audit — 全量清單（每條都有檔名 + GPT prompt）

**目的**：林董直接拿這份去 ChatGPT（gpt-image-1）生圖。**所有需要配圖的 lesson 都列出來了、每條都有 prompt。**
**重生**：`node scripts/_gen-image-audit.mjs`（章節內容改了就重跑）。
**日期**：自動產生。

---

## 0. GPT 生圖更新說明

之前以為「A 類截圖步驟圖 GPT 做不來」——**錯了**。`example/pic/1~6.png`（Python 環境變數、VSCode 中文包、Codex CLI、REPL）就是 **GPT 直接生**的截圖式教學圖。所以 **A / B / C 三類都可以用 GPT 生**，A 類用下面的「操作教學 template」即可。

> 提醒：GPT 對「長段中文」「像素級精準 UI」還是會糊；A 類拿到圖後對照真實畫面檢查一下，差太多再用 Snipping Tool 補真截圖。

## 1. 檔名 / 存放規範

- 存放：`public/lesson-img/ch{NN}/{檔名}.png`（每章一資料夾）
- 檔名：本清單「檔名」欄已給好（`ch{NN}_l{lessonId}.png`）
- 生好丟進對應資料夾、跟嶼築說一聲，會依檔名插進該 lesson 的 markdown `![]()`。

## 2. 🖼️ A 類：操作教學 / 截圖步驟（共 93 條）

> prompt 已含「多步驟編號 + 紅框標註 + 截圖風格」。

**Ch00 環境準備**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch00_l0_1.png` | L0.1 Day 1 onboarding — 3 天上手工程師日常 stack | Step-by-step illustrated how-to guide for 「Day 1 onboarding — 3 天上手工程師日常 stack」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：你今天會把終端機 + Git + VS Code + ChatGPT 4 件套裝起來、後面所有章節都靠它們。 |
| `ch00_l0_2.png` | L0.2 終端機（Terminal / PowerShell）+ 10 個必會指令 | Step-by-step illustrated how-to guide for 「終端機（Terminal / PowerShell）+ 10 個必會指令」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：黑底白字的「跟電腦對話窗口」、會 pwd / ls / cd / mkdir 4 個 = 解 80% 卡關。 |
| `ch00_l0_3.png` | L0.3 Git + GitHub — 5 招 + 註冊 + 第一次 push | Step-by-step illustrated how-to guide for 「Git + GitHub — 5 招 + 註冊 + 第一次 push」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Git 是程式碼的「存檔系統」、GitHub 是雲端的「程式碼倉庫」、5 個指令搞定 80% 日常。 |
| `ch00_l0_4.png` | L0.4 VS Code — 安裝 + 3 個必裝擴充 | Step-by-step illustrated how-to guide for 「VS Code — 安裝 + 3 個必裝擴充」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：微軟出的免費編輯器、2026 業界 80% 用、會這個一個能寫任何語言。 |

**Ch01 HTML 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch01_l1_2.png` | L1.2 head 區塊：給機器看的全部秘密 | Step-by-step illustrated how-to guide for 「head 區塊：給機器看的全部秘密」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：&lt;head&gt; 區塊是「給瀏覽器跟搜尋引擎看的設定區」—使用者看不到、但決定網頁怎麼被找到 / 分享 / 顯示。 |

**Ch05 TypeScript 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch05_l5_2.png` | L5.2 安裝 + 第一個 TS 程式 | Step-by-step illustrated how-to guide for 「安裝 + 第一個 TS 程式」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：基本型別（string / number / boolean / array / object）是TS 的 ABC。 |
| `ch05_l5_11.png` | L5.11 type vs interface：深入差異 | Step-by-step illustrated how-to guide for 「type vs interface：深入差異」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：tsconfig.json 是「告訴 TS 怎麼編譯」的設定檔—嚴格程度、目標版本、模組系統。 |

**Ch06 JSON 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch06_l6_1.png` | L6.1 JSON 是什麼，為什麼是事實標準 | Step-by-step illustrated how-to guide for 「JSON 是什麼，為什麼是事實標準」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：JSON 是「給機器看的標準格式資料」—API 回傳、設定檔、跨語言溝通全用它。 |
| `ch06_l6_7.png` | L6.7 讓 LLM 強制回傳結構化 JSON | Step-by-step illustrated how-to guide for 「讓 LLM 強制回傳結構化 JSON」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：JSON5 / JSONC 是「允許註解的 JSON」—設定檔常用、VS Code 就吃 JSONC。 |
| `ch06_l6_10.png` | L6.10 進階格式：JSONL、JSONPath、JMESPath | Step-by-step illustrated how-to guide for 「進階格式：JSONL、JSONPath、JMESPath」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：JSON 的常見資料結構—API response / config / state—實戰看熟很重要。 |
| `ch06_l6_17.png` | L6.17 JSON Path / JSONPath：在大物件裡找資料 | Step-by-step illustrated how-to guide for 「JSON Path / JSONPath：在大物件裡找資料」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：SQL 有 WHERE、JSON 有 JSONPath—`$.user.posts[*].title` 一次抽出所有標題 |

**Ch07 程式邏輯共通**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch07_l7_20.png` | L7.20 並發 1：執行緒、行程、鎖 | Step-by-step illustrated how-to guide for 「並發 1：執行緒、行程、鎖」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Git 版本控制基礎：「程式的時光機」—每次改動都能回滾、跟團隊協作。 |
| `ch07_l7_26.png` | L7.26 I/O：檔案、網路、資料庫 | Step-by-step illustrated how-to guide for 「I/O：檔案、網路、資料庫」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Debug 技巧：console.log / debugger / Chrome DevTools—工程師 80% 時間在 debug。 |

**Ch09 Vue 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch09_l9_11.png` | L9.11 Vue Composition API：setup + ref + reactive | Step-by-step illustrated how-to guide for 「Vue Composition API：setup + ref + reactive」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Vue 3 主流寫法、取代 Options API、跟 React Hook 概念類似 |
| `ch09_l9_24.png` | L9.24 Vue 實戰：完整 Todo App + Pinia + Supabase | Step-by-step illustrated how-to guide for 「Vue 實戰：完整 Todo App + Pinia + Supabase」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：把整章學的串成一個能 ship 的小 SaaS |

**Ch10 Next.js / Nuxt**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch10_l10_15.png` | L10.15 認證模式 | Step-by-step illustrated how-to guide for 「認證模式」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Metadata API：「在每頁設定 SEO」—title / description / OG image / canonical 全靠它。 |
| `ch10_l10_19.png` | L10.19 Nuxt Hybrid Rendering — routeRules 神奇魔法 | Step-by-step illustrated how-to guide for 「Nuxt Hybrid Rendering — routeRules 神奇魔法」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Deployment：「推到 Vercel 自動上線」—Next.js 親兒子部署、3 秒完成。 |
| `ch10_l10_25.png` | L10.25 Next.js 部署：Vercel / Cloudflare / self-host | Step-by-step illustrated how-to guide for 「Next.js 部署：Vercel / Cloudflare / self-host」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：三大主流部署選擇對比 + 各自設定 |

**Ch11 行動裝置 App**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch11_l11_12.png` | L11.12 Auth：Supabase / Clerk | Step-by-step illustrated how-to guide for 「Auth：Supabase / Clerk」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：App 認證—不要自己刻、用現成 SaaS |

**Ch14 PWA 跨平台**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch14_l14_6.png` | L14.6 PWA 安裝 + iOS 處理 | Step-by-step illustrated how-to guide for 「PWA 安裝 + iOS 處理」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不同平台安裝體驗不同 |
| `ch14_l14_12.png` | L14.12 Service Worker 完整生命週期 | Step-by-step illustrated how-to guide for 「Service Worker 完整生命週期」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不只 install、要懂 update / activate |
| `ch14_l14_19.png` | L14.19 PWA 安裝率 + Engagement 優化 | Step-by-step illustrated how-to guide for 「PWA 安裝率 + Engagement 優化」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：裝了不用 = 沒裝、要設計 retention |
| `ch14_l14_21.png` | L14.21 PWA 部署 + CI/CD | Step-by-step illustrated how-to guide for 「PWA 部署 + CI/CD」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：一次 setup、永久自動 deploy |

**Ch15 前端 DevOps**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch15_l15_2.png` | L15.2 Git 進階：Branch + PR + Conflict | Step-by-step illustrated how-to guide for 「Git 進階：Branch + PR + Conflict」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不只 add commit push、要會團隊協作 |
| `ch15_l15_3.png` | L15.3 GitHub Actions：CI/CD | Step-by-step illustrated how-to guide for 「GitHub Actions：CI/CD」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：免費、簡單、整合 GitHub—Indie 首選 |
| `ch15_l15_4.png` | L15.4 Vercel / Netlify / Cloudflare Pages | Step-by-step illustrated how-to guide for 「Vercel / Netlify / Cloudflare Pages」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：前端部署三大平台 |
| `ch15_l15_5.png` | L15.5 環境變數 + Secrets | Step-by-step illustrated how-to guide for 「環境變數 + Secrets」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不能寫死 API key 在 code |
| `ch15_l15_11.png` | L15.11 Branching 策略：GitHub Flow vs Git Flow | Step-by-step illustrated how-to guide for 「Branching 策略：GitHub Flow vs Git Flow」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：怎麼開 branch 影響團隊效率 |

**Ch16 後端世界全圖**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch16_l16_16.png` | L16.16 部署與運維：Docker、環境變數、health check | Step-by-step illustrated how-to guide for 「部署與運維：Docker、環境變數、health check」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：API 測試工具：Postman / Bruno / curl—寫後端必備工具。 |

**Ch17 SQL 資料庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch17_l17_2.png` | L17.2 安裝 PostgreSQL 與第一次連線 | Step-by-step illustrated how-to guide for 「安裝 PostgreSQL 與第一次連線」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：裝 PostgreSQL 5 分鐘、連 DB 試 SELECT 1—走出第一步。 |
| `ch17_l17_27.png` | L17.27 Supabase：10 分鐘架好 SQL 後端 | Step-by-step illustrated how-to guide for 「Supabase：10 分鐘架好 SQL 後端」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Supabase = 「PG 雲端 + 認證 + Storage + Realtime」—2026 Indie SaaS 後端神器。 |
| `ch17_l17_28.png` | L17.28 整章實戰：用 Supabase + Next.js 做完整 Todo 後端 | Step-by-step illustrated how-to guide for 「整章實戰：用 Supabase + Next.js 做完整 Todo 後端」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：把整章學的整合—Supabase 建表 + RLS、Next.js client、Realtime 同步、Production-ready。 |

**Ch18 NoSQL 資料庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch18_l18_13.png` | L18.13 Supabase 完整：Auth + DB + Realtime + Storage | Step-by-step illustrated how-to guide for 「Supabase 完整：Auth + DB + Realtime + Storage」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：PG 雲端版 + 全套後端、Indie SaaS 2026 第一選擇 |
| `ch18_l18_23.png` | L18.23 Migration 工具：Prisma / Drizzle | Step-by-step illustrated how-to guide for 「Migration 工具：Prisma / Drizzle」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Schema 版控、Git 友善、可回滾 |

**Ch19 DB 進階**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch19_l19_5.png` | L19.5 Replication：讀寫分離 + HA | Step-by-step illustrated how-to guide for 「Replication：讀寫分離 + HA」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：一台撐不住、用多台 |

**Ch21 認證授權**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch21_l21_7.png` | L21.7 OAuth 2.0 完整流程 | Step-by-step illustrated how-to guide for 「OAuth 2.0 完整流程」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：「用 Google / GitHub 登入」背後是什麼 |

**Ch22 部署 + Docker**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch22_l22_4.png` | L22.4 Vercel / Cloudflare Workers | Step-by-step illustrated how-to guide for 「Vercel / Cloudflare Workers」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Edge 部署、全球毫秒級 |
| `ch22_l22_7.png` | L22.7 CI/CD：GitHub Actions | Step-by-step illustrated how-to guide for 「CI/CD：GitHub Actions」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不再手動 deploy、push 就上線 |

**Ch23 雲端架構**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch23_l23_4.png` | L23.4 CDN + Storage：S3 / R2 / Cloudflare | Step-by-step illustrated how-to guide for 「CDN + Storage：S3 / R2 / Cloudflare」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：靜態檔放 CDN、不要從 server 餵 |

**Ch24 監控與 Logs**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch24_l24_9.png` | L24.9 Metrics + Dashboard | Step-by-step illustrated how-to guide for 「Metrics + Dashboard」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：看數字、不靠感覺 |

**Ch25 網域 + DNS + SSL**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch25_l25_2.png` | L25.2 SSL / HTTPS 設定 | Step-by-step illustrated how-to guide for 「SSL / HTTPS 設定」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：2026 沒 HTTPS = 過時 + 不安全 |
| `ch25_l25_5.png` | L25.5 CDN / Cloudflare 進階 | Step-by-step illustrated how-to guide for 「CDN / Cloudflare 進階」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：一個 service 整合 DNS + CDN + SSL + WAF + Email |
| `ch25_l25_9.png` | L25.9 Email DNS 完整設定 | Step-by-step illustrated how-to guide for 「Email DNS 完整設定」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：寄信不進 Spam 必懂 |

**Ch26 Python 基礎**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch26_l26_0.png` | L26.0 開始之前 — 你需要知道的 5 件事 | Step-by-step illustrated how-to guide for 「開始之前 — 你需要知道的 5 件事」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：第一次碰程式？先認識「終端機、程式檔、寫 vs 執行、教材的四種標示」——後面 32 課才不會卡。 |
| `ch26_l26_05.png` | L26.05 終端機 + GitHub + PowerShell 入門 | Step-by-step illustrated how-to guide for 「終端機 + GitHub + PowerShell 入門」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不會終端機就裝不了 Python。pwd / ls / cd / git push 3 招解 80% 卡關。 |
| `ch26_l26_1.png` | L26.1 為什麼是 Python？2026 安裝 + uv | Step-by-step illustrated how-to guide for 「為什麼是 Python？2026 安裝 + uv」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Python 就是「最好學的萬用工具」—2026 是 AI / 資料 / 爬蟲 / 自動化的首選語言。 |
| `ch26_l26_1_5.png` | L26.1.5 編輯器 + Jupyter + Colab 工具大全 | Step-by-step illustrated how-to guide for 「編輯器 + Jupyter + Colab 工具大全」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：裝完 Python 後在哪寫 code？VS Code / Cursor / Jupyter / Colab / REPL 完整指南。 |
| `ch26_l26_2.png` | L26.2 Hello World、REPL、第一個變數 | Step-by-step illustrated how-to guide for 「Hello World、REPL、第一個變數」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Python 為什麼好學：「語法接近英文」—寫 code 像寫散文。 |
| `ch26_l26_10.png` | L26.10 OOP：class、繼承、dataclass | Step-by-step illustrated how-to guide for 「OOP：class、繼承、dataclass」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Pip：「Python 的套件管理員」—一行 pip install 裝全世界。 |
| `ch26_l26_13.png` | L26.13 NumPy：陣列運算 | Step-by-step illustrated how-to guide for 「NumPy：陣列運算」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：JSON 處理：json.loads / json.dumps—Python 內建、無需安裝。 |

**Ch27 Python 資料分析**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch27_l27_12.png` | L27.12 Streamlit：5 分鐘做出 Dashboard | Step-by-step illustrated how-to guide for 「Streamlit：5 分鐘做出 Dashboard」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：寫 Python 像寫 Markdown、自動變網頁 |

**Ch28 Python 爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch28_l28_5.png` | L28.5 反爬機制：你會遇到的 7 種防線 | Step-by-step illustrated how-to guide for 「反爬機制：你會遇到的 7 種防線」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：大型網站都有反爬機制—User-Agent 偵測、IP 限流、驗證碼、Cloudflare、JS 挑戰—一層一層擋你。 |
| `ch28_l28_12.png` | L28.12 解析 HTML：CSS Selector + XPath | Step-by-step illustrated how-to guide for 「解析 HTML：CSS Selector + XPath」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：抓到網頁後怎麼精準抽資料 |

**Ch29 JavaScript 爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch29_l29_13.png` | L29.13 Cloudflare Workers 爬蟲 | Step-by-step illustrated how-to guide for 「Cloudflare Workers 爬蟲」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：在 Cloudflare edge 跑、免費、全球 IP |
| `ch29_l29_20.png` | L29.20 Vercel / Netlify Functions 爬蟲 | Step-by-step illustrated how-to guide for 「Vercel / Netlify Functions 爬蟲」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Serverless 跑爬蟲、不付 server 費 |

**Ch30 跨語言爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch30_l30_3.png` | L30.3 Rust + reqwest + scraper：極致效能 | Step-by-step illustrated how-to guide for 「Rust + reqwest + scraper：極致效能」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Rust 爬蟲 = 「記憶體最省、跑最快、零崩潰」—Discord / Cloudflare 內部都用 Rust。 |
| `ch30_l30_4.png` | L30.4 排程：cron / GitHub Actions / Temporal | Step-by-step illustrated how-to guide for 「排程：cron / GitHub Actions / Temporal」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：爬蟲不會一次跑完—每天 / 每小時定時跑。排程工具決定可靠度。 |
| `ch30_l30_23.png` | L30.23 客戶交付：報表 + Dashboard + API | Step-by-step illustrated how-to guide for 「客戶交付：報表 + Dashboard + API」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：爬完不是結束、要給客戶看才有價值 |

**Ch31 Node.js 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch31_l31_2.png` | L31.2 安裝 Node + nvm/fnm 管版本 | Step-by-step illustrated how-to guide for 「安裝 Node + nvm/fnm 管版本」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Node 安裝跟 npm：「裝 Node 順便有套件管理員」。 |
| `ch31_l31_7.png` | L31.7 TypeScript 設定 + 用法 | Step-by-step illustrated how-to guide for 「TypeScript 設定 + 用法」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Express：「Node 最經典的 web 框架」—2010 至今、簡單實用。 |
| `ch31_l31_18.png` | L31.18 Pino 結構化 log + 監控 | Step-by-step illustrated how-to guide for 「Pino 結構化 log + 監控」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Environment Variables：「設定檔不該寫在 code 裡」—用 .env 管理。 |
| `ch31_l31_19.png` | L31.19 部署：Docker / Railway / Vercel | Step-by-step illustrated how-to guide for 「部署：Docker / Railway / Vercel」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Deployment：Vercel / Railway / Fly.io / Docker—Node 上線方式。 |
| `ch31_l31_22.png` | L31.22 AI 整合：Vercel AI SDK + 串流 | Step-by-step illustrated how-to guide for 「AI 整合：Vercel AI SDK + 串流」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：整章實戰：用 Node + Express + Prisma + JWT 做一個完整後端—register / login / CRUD / file upload。 |
| `ch31_l31_24.png` | L31.24 Hono：取代 Express 的現代 Web 框架 | Step-by-step illustrated how-to guide for 「Hono：取代 Express 的現代 Web 框架」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：輕量、TypeScript first、跑遍 Node / Bun / Deno / Cloudflare Workers |

**Ch32 Go 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch32_l32_1.png` | L32.1 為什麼是 Go？2026 安裝 | Step-by-step illustrated how-to guide for 「為什麼是 Go？2026 安裝」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Go 是「Google 出的高速跑車語言」—簡單、超快、適合系統 / 雲端 / CLI 工具。 |
| `ch32_l32_12.png` | L32.12 Error handling：沒 try-catch 的世界 | Step-by-step illustrated how-to guide for 「Error handling：沒 try-catch 的世界」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：CLI Tools：「Go 寫命令列工具神器」—Docker / kubectl / hugo / lazygit 都是 Go。 |
| `ch32_l32_15.png` | L32.15 標準庫 HTTP server：不用框架也行 | Step-by-step illustrated how-to guide for 「標準庫 HTTP server：不用框架也行」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Modules：「Go 的套件管理」—2018 之後標準、go.mod 取代 GOPATH。 |

**Ch37 WordPress 接案**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch37_l37_2.png` | L37.2 WordPress 後台 + 主題 | Step-by-step illustrated how-to guide for 「WordPress 後台 + 主題」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不寫 code 也能交付專業網站 |

**Ch39 LINE Bot + LIFF**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch39_l39_2.png` | L39.2 LINE 官方帳號：註冊 + 後台 | Step-by-step illustrated how-to guide for 「LINE 官方帳號：註冊 + 後台」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不寫 code、5 分鐘上線你的「LINE 公司帳號」 |
| `ch39_l39_3.png` | L39.3 LINE OA 後台操作：群發、選單、自動回覆 | Step-by-step illustrated how-to guide for 「LINE OA 後台操作：群發、選單、自動回覆」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：不寫 code 也能做到 80% 的事 |
| `ch39_l39_7.png` | L39.7 Rich Menu：底部選單（用 API 設定） | Step-by-step illustrated how-to guide for 「Rich Menu：底部選單（用 API 設定）」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：比後台手動更彈性、可動態切換 |

**Ch43 專案管理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch43_l43_9.png` | L43.9 OKR + KPI 設定 | Step-by-step illustrated how-to guide for 「OKR + KPI 設定」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Velocity：「團隊每 sprint 能完成多少」—planning 的基礎。 |
| `ch43_l43_16.png` | L43.16 工具地圖：Jira / Linear / Notion / Asana / 其他 | Step-by-step illustrated how-to guide for 「工具地圖：Jira / Linear / Notion / Asana / 其他」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：GitHub Projects：「跟 code 整合的 PM 工具」—免費、跟 PR / issue 直連。 |

**Ch46 AI/ML 原理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch46_l46_18.png` | L46.18 Vercel AI SDK：TS 全端 AI | Step-by-step illustrated how-to guide for 「Vercel AI SDK：TS 全端 AI」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：RAG（Retrieval Augmented Generation）：「先找資料、再讓 AI 寫」—2026 企業 AI 主流。 |

**Ch47 AI 應用工程**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch47_l47_15.png` | L47.15 設計 / 創意產業：10 種 AI 應用 | Step-by-step illustrated how-to guide for 「設計 / 創意產業：10 種 AI 應用」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：AI Streaming with Vercel AI SDK：「2026 前端串 AI 標準工具」—useChat hook 5 行搞定。 |

**Ch48 Vibe Coding**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch48_l48_2.png` | L48.2 AI-first 開發流程：心法 | Step-by-step illustrated how-to guide for 「AI-first 開發流程：心法」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Cursor：「VS Code + AI」—2025-2026 最熱的 AI 編輯器。 |
| `ch48_l48_3.png` | L48.3 Cursor 完整使用 | Step-by-step illustrated how-to guide for 「Cursor 完整使用」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Claude Code：「終端機版 AI 寫程式」—Anthropic 出、agentic 能力最強。 |
| `ch48_l48_4.png` | L48.4 Claude Code CLI 完整 | Step-by-step illustrated how-to guide for 「Claude Code CLI 完整」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Windsurf：「Cursor 的競爭者」—2024 新出、agentic 體驗強。 |
| `ch48_l48_5.png` | L48.5 v0 / Bolt / Lovable / Windsurf 比較 | Step-by-step illustrated how-to guide for 「v0 / Bolt / Lovable / Windsurf 比較」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：GitHub Copilot：「VS Code 內建 AI 補全」—2021 起、2026 還是大廠主流。 |
| `ch48_l48_7.png` | L48.7 CLAUDE.md / .cursorrules / Skills | Step-by-step illustrated how-to guide for 「CLAUDE.md / .cursorrules / Skills」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Spec Writing：「寫好需求文件給 AI」—prompt engineering 的程式版。 |
| `ch48_l48_13.png` | L48.13 Git workflow with AI | Step-by-step illustrated how-to guide for 「Git workflow with AI」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Lovable / Bolt / v0：「不會 code 也能做產品」—描述需求 AI 直接生整個 App。 |
| `ch48_l48_14.png` | L48.14 測試與 AI 配合 | Step-by-step illustrated how-to guide for 「測試與 AI 配合」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Replit Agent：「AI 幫你開發 + 部署」—雲端 IDE + agent。 |
| `ch48_l48_20.png` | L48.20 一人從 0 到 production 的 Vibe Coding workflow | Step-by-step illustrated how-to guide for 「一人從 0 到 production 的 Vibe Coding workflow」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：整章實戰：用 Cursor + Claude Code 做一個完整 SaaS—7 天完成傳統 1 個月的工作。 |
| `ch48_l48_21.png` | L48.21 Cursor / Claude Code / Windsurf 三選一 | Step-by-step illustrated how-to guide for 「Cursor / Claude Code / Windsurf 三選一」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：2026 AI coding IDE 三巨頭、各有適合場景 |

**Ch49 AI Agent**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch49_l49_4.png` | L49.4 Plan-and-Execute 架構 | Step-by-step illustrated how-to guide for 「Plan-and-Execute 架構」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Tool Use：「Agent 的工具箱」—讀檔 / 寫檔 / 查 DB / 打 API / 跑 shell。 |
| `ch49_l49_13.png` | L49.13 Coding Agent：Devin / Claude Code / OpenHands | Step-by-step illustrated how-to guide for 「Coding Agent：Devin / Claude Code / OpenHands」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Web Agent：「會用瀏覽器的 AI」—Computer Use / Anthropic、Browser-Use 都做這個。 |

**Ch50 n8n 自動化**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch50_l50_3.png` | L50.3 n8n 自架 + 安裝 | Step-by-step illustrated how-to guide for 「n8n 自架 + 安裝」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Node：「workflow 的每個積木」—代表一個動作 / 服務。 |

**Ch52 AI 設計**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch52_l52_5.png` | L52.5 v0 + Cursor：AI UI 開發革命 | Step-by-step illustrated how-to guide for 「v0 + Cursor：AI UI 開發革命」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：寫文字 → React 元件 |

**Ch62 附錄 B：後端 / 資料庫速查**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch62_l62_3.png` | L62.3 Git 完整指令（含 rebase、cherry-pick、解衝突） | Step-by-step illustrated how-to guide for 「Git 完整指令（含 rebase、cherry-pick、解衝突）」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：從 clone 到 force push、所有 Git 場景一頁掌握。 |

**Ch64 附錄 D：開發工具速查**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch64_l64_1.png` | L64.1 VSCode 快捷鍵 + 必裝套件 | Step-by-step illustrated how-to guide for 「VSCode 快捷鍵 + 必裝套件」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：提升 10 倍效率的快捷鍵 + 30 個必裝套件。 |
| `ch64_l64_3.png` | L64.3 Docker / Docker Compose 速查 | Step-by-step illustrated how-to guide for 「Docker / Docker Compose 速查」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：容器化必備指令、Dockerfile、compose、優化。 |

**Ch68 附錄 H：高階工程師修煉路徑**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch68_l68_13.png` | L68.13 Project Management — 工程師也要懂 | Step-by-step illustrated how-to guide for 「Project Management — 工程師也要懂」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：估時、拆任務、抓 critical path——別當會寫 code 的奴工 |

**Ch73 Vue 進階**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch73_l73_1.png` | L73.1 Composition API 完全指南 | Step-by-step illustrated how-to guide for 「Composition API 完全指南」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. 重點：Composition API 把組件邏輯放進 setup() 函式裡、ref / reactive / computed / watch 全部 export from Vue。比 Options API 更靈活、TypeScript 推導更好。 |

---

## 3. 📊 B 類：概念解說圖（共 267 條）

> prompt 已含「深色 infographic + 英文 label + emoji」風格。

**Ch01 HTML 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch01_l1_1.png` | L1.1 HTML 是什麼？為什麼網頁長那樣？ | Clean educational infographic explaining 「HTML 是什麼？為什麼網頁長那樣？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：HTML 就是「網頁的說明書」—告訴瀏覽器「這裡是標題、這裡是圖片、這裡是按鈕」。 |
| `ch01_l1_7.png` | L1.7 表格 | Clean educational infographic explaining 「表格」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：表格（&lt;table&gt;）是放整齊資料用—價目表、課表、比較表。絕對不要用來排版！ |
| `ch01_l1_24.png` | L1.24 HTML 全域屬性：data-* / contenteditable / draggable | Clean educational infographic explaining 「HTML 全域屬性：data-* / contenteditable / draggable」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不是只有 id / class，HTML 還有一堆冷門但好用的全域屬性 |

**Ch02 CSS 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch02_l2_1.png` | L2.1 CSS 是什麼？為什麼需要它？ | Clean educational infographic explaining 「CSS 是什麼？為什麼需要它？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：CSS 就是「網頁的化妝師」—HTML 寫好骨架、CSS 把它變漂亮。 |
| `ch02_l2_4.png` | L2.4 盒模型：每個元素都是一個盒子 | Clean educational infographic explaining 「盒模型：每個元素都是一個盒子」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：顏色有 4 種寫法（英文 / Hex / RGB / HSL）—學會 HSL 之後你會懂為什麼設計師用它。 |
| `ch02_l2_6.png` | L2.6 Flexbox：一維排版王者 | Clean educational infographic explaining 「Flexbox：一維排版王者」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：顯示類型（block / inline / inline-block）決定元素佔多大空間。 |
| `ch02_l2_7.png` | L2.7 Grid：二維排版引擎 | Clean educational infographic explaining 「Grid：二維排版引擎」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Flexbox 是「一條線上排東西」的工具—橫排或直排都行、自動分配空間。 |
| `ch02_l2_8.png` | L2.8 position：定位的五種人格 | Clean educational infographic explaining 「position：定位的五種人格」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Grid 是「二維格子佈局」—像 Excel 表格、可以同時控制橫列跟直欄。 |
| `ch02_l2_10.png` | L2.10 字型：閱讀體驗的核心 | Clean educational infographic explaining 「字型：閱讀體驗的核心」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：響應式設計（RWD）就是讓網頁在電腦 / 平板 / 手機都好看。 |
| `ch02_l2_12.png` | L2.12 響應式設計（RWD） | Clean educational infographic explaining 「響應式設計（RWD）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：CSS 變數（--xxx）讓你「定義一個顏色名、整站到處用」—改一個地方全變。 |
| `ch02_l2_18.png` | L2.18 Bootstrap：老牌且實用 | Clean educational infographic explaining 「Bootstrap：老牌且實用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Z-index 是「誰蓋在誰上面」—像疊圖層、數字越大越上面。 |
| `ch02_l2_21.png` | L2.21 動畫心理學：為什麼按鈕該回彈 | Clean educational infographic explaining 「動畫心理學：為什麼按鈕該回彈」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Tailwind CSS 是「不寫 CSS、用 class 排版」的潮流—2026 indie / 新創幾乎全用。 |

**Ch03 UI/UX 設計原理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch03_l3_2.png` | L3.2 Nielsen 10 大可用性原則 | Clean educational infographic explaining 「Nielsen 10 大可用性原則」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：視覺層次（hierarchy）就是「讓眼睛知道先看哪、再看哪」—大小 / 顏色 / 對比決定。 |
| `ch03_l3_4.png` | L3.4 色彩：選色 + 情緒 + 對比 | Clean educational infographic explaining 「色彩：選色 + 情緒 + 對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：字體選擇：標題粗、內文細、等寬字給程式碼—別用太多種。 |
| `ch03_l3_6.png` | L3.6 間距 + 對齊：8pt grid | Clean educational infographic explaining 「間距 + 對齊：8pt grid」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：對齊：「東西要排得整齊」—左對齊或置中或右對齊、混著用就亂。 |
| `ch03_l3_7.png` | L3.7 Button：5 種狀態 + 階層 | Clean educational infographic explaining 「Button：5 種狀態 + 階層」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Grid System 是「網頁排版的隱形格線」—12 欄式是業界主流。 |
| `ch03_l3_15.png` | L3.15 響應式設計（mobile-first） | Clean educational infographic explaining 「響應式設計（mobile-first）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Form Design：表單做不好、轉換率掉 50%—輸入框 / 標籤 / 驗證 / 提交全都關鍵。 |
| `ch03_l3_22.png` | L3.22 顏色理論：色票系統 + 對比度 | Clean educational infographic explaining 「顏色理論：色票系統 + 對比度」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不是「我喜歡這個顏色」、設計師用色票 + WCAG 對比度規範 |

**Ch04 JavaScript 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch04_l4_1.png` | L4.1 JavaScript 是什麼？為什麼長這樣？ | Clean educational infographic explaining 「JavaScript 是什麼？為什麼長這樣？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JavaScript 就是「讓網頁活起來」的程式語言—按鈕按下去有反應、表單能驗證、畫面會動。 |
| `ch04_l4_3.png` | L4.3 原始型別與物件型別 | Clean educational infographic explaining 「原始型別與物件型別」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：資料型別有 7 種—字串 / 數字 / 布林 / 陣列 / 物件 / null / undefined，搞清楚才不會出錯。 |
| `ch04_l4_4.png` | L4.4 運算符：== 跟 === 的世紀大戰 | Clean educational infographic explaining 「運算符：== 跟 === 的世紀大戰」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：運算子（+ - * / === && //）是「算數學跟做比較的工具」。 |
| `ch04_l4_8.png` | L4.8 類別（Class）：ES2015 的物件導向 | Clean educational infographic explaining 「類別（Class）：ES2015 的物件導向」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：陣列（Array）是「一排東西的有序列表」—索引從 0 開始（不是 1）。 |
| `ch04_l4_9.png` | L4.9 原型鏈（Prototype）：JS 真正的繼承機制 | Clean educational infographic explaining 「原型鏈（Prototype）：JS 真正的繼承機制」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：物件（Object）是「鑰匙 + 值的組合」—像詞典：鍵 → 值。 |
| `ch04_l4_10.png` | L4.10 事件迴圈：JS 是單執行緒的秘密 | Clean educational infographic explaining 「事件迴圈：JS 是單執行緒的秘密」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：陣列方法（map / filter / reduce）是「處理一群資料的瑞士刀」—10 行代碼變 1 行。 |
| `ch04_l4_11.png` | L4.11 Promise：非同步的現代答案 | Clean educational infographic explaining 「Promise：非同步的現代答案」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：解構（destructuring）是「一次從物件拿好幾個值」—寫 React 必用、超省事。 |
| `ch04_l4_12.png` | L4.12 Iterator / Generator：自製迭代邏輯 | Clean educational infographic explaining 「Iterator / Generator：自製迭代邏輯」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Spread / Rest（...）是「展開或收合一堆東西」—複製陣列 / 合併物件超快。 |
| `ch04_l4_15.png` | L4.15 儲存：把資料留在瀏覽器 | Clean educational infographic explaining 「儲存：把資料留在瀏覽器」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Closure（閉包）是「函式記住它出生時周圍的變數」—JS 最強功能之一、也是面試愛問。 |
| `ch04_l4_16.png` | L4.16 Web Worker：真正的多執行緒 | Clean educational infographic explaining 「Web Worker：真正的多執行緒」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：this 是「指這段程式現在屬於誰」—JS 最容易混淆的概念之一。 |
| `ch04_l4_17.png` | L4.17 WebAssembly：JS 之外的超速引擎 | Clean educational infographic explaining 「WebAssembly：JS 之外的超速引擎」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：async / await 是「等久一點的事情怎麼寫得好看」—等 API、等檔案、等使用者輸入。 |
| `ch04_l4_18.png` | L4.18 模組系統 ESM vs CommonJS | Clean educational infographic explaining 「模組系統 ESM vs CommonJS」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Promise 是「未來會給你結果的合約」—async/await 背後的機制。 |
| `ch04_l4_21.png` | L4.21 資安：XSS / CSRF / Prototype Pollution | Clean educational infographic explaining 「資安：XSS / CSRF / Prototype Pollution」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Modules（import / export）是「把程式拆成多個檔案、互相 import」—大專案必用。 |
| `ch04_l4_22.png` | L4.22 測試：單元 / 整合 / E2E | Clean educational infographic explaining 「測試：單元 / 整合 / E2E」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Localstorage / Cookie 是「在使用者瀏覽器存東西」—關掉重開還在。 |
| `ch04_l4_24.png` | L4.24 正規表示式（RegExp） | Clean educational infographic explaining 「正規表示式（RegExp）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：ES2026 新功能（top-level await / pipe / pattern matching 等）是JS 持續進化的證明—2026 起主流。 |
| `ch04_l4_25.png` | L4.25 2026 必懂的新特性 | Clean educational infographic explaining 「2026 必懂的新特性」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：整章總複習 + 實戰：用 JS 做一個完整的待辦清單 App—變數 / 函式 / DOM / 事件 / localStorage 全用上。 |

**Ch05 TypeScript 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch05_l5_1.png` | L5.1 為什麼要學 TypeScript？JS 痛點解析 | Clean educational infographic explaining 「為什麼要學 TypeScript？JS 痛點解析」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TypeScript 就是「JavaScript + 型別檢查」—寫錯型別在編譯時就抓到、不會等線上才崩潰。 |
| `ch05_l5_3.png` | L5.3 基本型別：string / number / boolean | Clean educational infographic explaining 「基本型別：string / number / boolean」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：型別推斷（type inference）是「TS 看你寫的程式碼自己猜型別」—不用每個都標註。 |
| `ch05_l5_4.png` | L5.4 物件型別：type vs interface | Clean educational infographic explaining 「物件型別：type vs interface」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Interface 跟 Type 是「定義物件長什麼樣」—像合約。 |
| `ch05_l5_5.png` | L5.5 Union + Literal Type：精確型別 | Clean educational infographic explaining 「Union + Literal Type：精確型別」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Union Type（A / B）是「這個變數可能是 A 也可能是 B」。 |
| `ch05_l5_6.png` | L5.6 函式型別：3 種寫法 | Clean educational infographic explaining 「函式型別：3 種寫法」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Generics（泛型 &lt;T&gt;）是「型別參數化」—寫 1 個函式適用多種型別。 |
| `ch05_l5_7.png` | L5.7 Array / Map / Set / Record | Clean educational infographic explaining 「Array / Map / Set / Record」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Utility Type（Partial / Pick / Omit / Record）是「型別的瑞士刀」—改造現有型別。 |
| `ch05_l5_8.png` | L5.8 Generic 泛型：可重用型別 | Clean educational infographic explaining 「Generic 泛型：可重用型別」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Type Guard 是「在程式裡判斷型別」—讓 TS 知道這時候是 string、那時候是 number。 |
| `ch05_l5_9.png` | L5.9 Utility Types：8 個內建神器 | Clean educational infographic explaining 「Utility Types：8 個內建神器」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Enum 是「列舉一組固定值」—像下拉選單的選項。 |
| `ch05_l5_10.png` | L5.10 Enum vs as const：兩種寫法 | Clean educational infographic explaining 「Enum vs as const：兩種寫法」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Zod 是「跑起來會檢查」的型別工具—TS 只在編譯檢查、Zod 在 runtime 也檢查。 |
| `ch05_l5_12.png` | L5.12 Class：readonly / private / public / abstract | Clean educational infographic explaining 「Class：readonly / private / public / abstract」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Class 跟 OOP 在 TS 裡有完整型別支援—public / private / protected / abstract 全有。 |
| `ch05_l5_14.png` | L5.14 Type Narrowing：縮窄型別深入 | Clean educational infographic explaining 「Type Narrowing：縮窄型別深入」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Conditional Type / Mapped Type 是「型別的 if-else 跟 for 迴圈」—TS 高階魔法。 |
| `ch05_l5_15.png` | L5.15 tsconfig.json 完整解析 | Clean educational infographic explaining 「tsconfig.json 完整解析」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TypeScript 跟 React 一起用：component props 全部要寫型別—寫過就回不去 JS。 |
| `ch05_l5_16.png` | L5.16 strict 模式：6 個關鍵檢查 | Clean educational infographic explaining 「strict 模式：6 個關鍵檢查」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TypeScript 跟 Node 後端：API 用 Zod / Express + TS 寫出強型別後端。 |
| `ch05_l5_17.png` | L5.17 給 JS 套件加型別：.d.ts | Clean educational infographic explaining 「給 JS 套件加型別：.d.ts」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：tsc / tsx / esbuild 是「把 TS 轉成 JS 跑起來」的工具—2026 用 tsx 開發、esbuild 部署。 |
| `ch05_l5_18.png` | L5.18 React + TypeScript：完整實戰 | Clean educational infographic explaining 「React + TypeScript：完整實戰」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TS 跟 JSDoc：不用全改寫成 TS、用 JSDoc 註解也能有型別—大型 JS 專案漸進遷移用。 |
| `ch05_l5_19.png` | L5.19 API 型別安全：Zod + tRPC | Clean educational infographic explaining 「API 型別安全：Zod + tRPC」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：型別檔（.d.ts）是「給 JS 套件補上型別」—npm 套件大多有人寫好的 @types/xxx。 |
| `ch05_l5_20.png` | L5.20 常見錯誤訊息 + 對策 | Clean educational infographic explaining 「常見錯誤訊息 + 對策」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TypeScript Best Practices 2026：strict mode / type over interface / 避免 any。 |
| `ch05_l5_22.png` | L5.22 怎麼變強？學習路徑 + 資源 | Clean educational infographic explaining 「怎麼變強？學習路徑 + 資源」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TS 未來方向：更強的型別推斷、Pattern Matching、TC39 同步演化—跟著新版升級就對了。 |
| `ch05_l5_23.png` | L5.23 Generic 泛型完全攻略 | Clean educational infographic explaining 「Generic 泛型完全攻略」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：<T> 讓你寫一份能處理多種型別的函式 / class、TS 進階分水嶺 |
| `ch05_l5_24.png` | L5.24 Utility Types：TS 內建魔法工具 | Clean educational infographic explaining 「Utility Types：TS 內建魔法工具」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Partial / Pick / Omit / Required / Record—10 大 utility type 救你重複定義 |
| `ch05_l5_25.png` | L5.25 TS 4.9+ 新特性：satisfies / const type / Template literal | Clean educational infographic explaining 「TS 4.9+ 新特性：satisfies / const type / Template literal」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TS 持續進化、2023-2026 重要新功能必看 |

**Ch06 JSON 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch06_l6_8.png` | L6.8 API 設計：RESTful、JSON-RPC、GraphQL | Clean educational infographic explaining 「API 設計：RESTful、JSON-RPC、GraphQL」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JSON 跟其他格式（XML / YAML / TOML）的比較—各有適用場景。 |
| `ch06_l6_11.png` | L6.11 JSON 五大地雷 | Clean educational infographic explaining 「JSON 五大地雷」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JSON 安全：JSON injection / Prototype Pollution—接收使用者 JSON 要小心。 |
| `ch06_l6_12.png` | L6.12 JSON vs Protobuf / Avro / MessagePack | Clean educational infographic explaining 「JSON vs Protobuf / Avro / MessagePack」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JSON 跟 SQL / NoSQL：JSONB (Postgres) 跟 BSON (MongoDB)—DB 存 JSON 的方法。 |
| `ch06_l6_14.png` | L6.14 實戰：完整型別安全的 API 層 | Clean educational infographic explaining 「實戰：完整型別安全的 API 層」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：整章實戰：用 JSON 設計一個完整 API 規格—寫 spec、寫 schema、寫 mock。 |
| `ch06_l6_16.png` | L6.16 Zod：TS 友善的 Schema 驗證 | Clean educational infographic explaining 「Zod：TS 友善的 Schema 驗證」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：比 JSON Schema 簡潔 10 倍、自動生 TS 型別、2026 最熱 |
| `ch06_l6_20.png` | L6.20 GraphQL：選擇性查詢 vs REST | Clean educational infographic explaining 「GraphQL：選擇性查詢 vs REST」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：REST 給你全部、GraphQL 給你「你要的」—資料量省一半 |
| `ch06_l6_21.png` | L6.21 tRPC：純 TS 全端 type-safe API | Clean educational infographic explaining 「tRPC：純 TS 全端 type-safe API」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不寫 OpenAPI、不寫 GraphQL Schema、純 TS 連 Server ↔ Client |
| `ch06_l6_22.png` | L6.22 JWT：JSON Web Token 認證 | Clean educational infographic explaining 「JWT：JSON Web Token 認證」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：把使用者身份打包成 JSON、簽章後給客戶端、之後每次帶它認證 |
| `ch06_l6_25.png` | L6.25 實戰：寫 Type-Safe Next.js API（Zod + tRPC） | Clean educational infographic explaining 「實戰：寫 Type-Safe Next.js API（Zod + tRPC）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：整合本章：Zod schema 共用、tRPC 連 server-client、表單驗證一條龍 |

**Ch07 程式邏輯共通**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch07_l7_1.png` | L7.1 程式是什麼？指令、執行、編譯 vs 直譯 | Clean educational infographic explaining 「程式是什麼？指令、執行、編譯 vs 直譯」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：程式邏輯就是「電腦解決問題的步驟」—跟你做菜 / 算數學的思考方式一樣。 |
| `ch07_l7_3.png` | L7.3 資料型態大家族 | Clean educational infographic explaining 「資料型態大家族」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：資料型別：數字 / 字串 / 布林 / 陣列 / 物件—不同型別有不同操作。 |
| `ch07_l7_4.png` | L7.4 運算子：算術、比較、邏輯、位元、三元 | Clean educational infographic explaining 「運算子：算術、比較、邏輯、位元、三元」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：運算子（+ - * / == && //）是「程式做數學跟邏輯判斷的工具」。 |
| `ch07_l7_14.png` | L7.14 型別系統：動態 vs 靜態、推導、聯合、泛型 | Clean educational infographic explaining 「型別系統：動態 vs 靜態、推導、聯合、泛型」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Async / Await 是「等久一點的事情怎麼寫得好看」—等 API / 等檔案 / 等使用者。 |
| `ch07_l7_16.png` | L7.16 錯誤處理：try / catch / Result / Option / panic | Clean educational infographic explaining 「錯誤處理：try / catch / Result / Option / panic」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：演算法基礎：排序 / 搜尋 / 遞迴 / 動態規劃—面試常考、實戰偶用。 |
| `ch07_l7_17.png` | L7.17 模組化：import、export、package | Clean educational infographic explaining 「模組化：import、export、package」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Big O 是「演算法的速度等級」—O(1) 最快、O(n²) 最慢。 |
| `ch07_l7_21.png` | L7.21 並發 2：async / await / event loop | Clean educational infographic explaining 「並發 2：async / await / event loop」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Code Review：「同事互看程式碼」—不只抓 bug、更是學習文化。 |
| `ch07_l7_23.png` | L7.23 演算法基礎：時間 / 空間複雜度、Big O | Clean educational infographic explaining 「演算法基礎：時間 / 空間複雜度、Big O」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Design Pattern：「常見問題的標準解法」—Singleton / Factory / Observer / MVC。 |
| `ch07_l7_24.png` | L7.24 常見演算法：排序、搜尋、遞迴、DP | Clean educational infographic explaining 「常見演算法：排序、搜尋、遞迴、DP」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：SOLID 原則：「OOP 的 5 大寫 code 守則」—讓你的 code 不會越寫越亂。 |

**Ch08 React 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch08_l8_1.png` | L8.1 為什麼 React？前端框架戰史 | Clean educational infographic explaining 「為什麼 React？前端框架戰史」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：React 就是「把網頁拆成樂高積木」的方式—每塊積木叫「Component」、組合出整個畫面。 |
| `ch08_l8_23.png` | L8.23 React 19 新特性：Actions + use() + Server Components | Clean educational infographic explaining 「React 19 新特性：Actions + use() + Server Components」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：React 19 革命性更新—async 處理大幅簡化、Server Components 改變遊戲規則 |
| `ch08_l8_24.png` | L8.24 React Server Components vs Client Components | Clean educational infographic explaining 「React Server Components vs Client Components」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點："use client" vs Server Components—兩種 component 的根本差異 |

**Ch09 Vue 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch09_l9_1.png` | L9.1 Vue 是什麼？為什麼選 Vue？ | Clean educational infographic explaining 「Vue 是什麼？為什麼選 Vue？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Vue 是「亞洲團隊愛用的前端框架」—學習曲線比 React 平緩、文件中文化好。 |
| `ch09_l9_10.png` | L9.10 Vue vs React 怎麼選？ | Clean educational infographic explaining 「Vue vs React 怎麼選？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：整章實戰：用 Nuxt 做一個多頁部落格—SSR + 動態路由 + Markdown 渲染。 |
| `ch09_l9_20.png` | L9.20 Vue 3 TypeScript 完整 | Clean educational infographic explaining 「Vue 3 TypeScript 完整」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：型別好用、寫 Vue 必開 TS |
| `ch09_l9_21.png` | L9.21 Vue 樣式：Scoped CSS / CSS Modules / Tailwind | Clean educational infographic explaining 「Vue 樣式：Scoped CSS / CSS Modules / Tailwind」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：元件樣式怎管？scoped 簡單、Tailwind 主流 |
| `ch09_l9_23.png` | L9.23 Vue 與 React 全面對比 | Clean educational infographic explaining 「Vue 與 React 全面對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：2026 學哪個？兩個都會最強、但實務選一個深耕 |

**Ch10 Next.js / Nuxt**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch10_l10_1.png` | L10.1 為什麼純 React / Vue 不夠？ | Clean educational infographic explaining 「為什麼純 React / Vue 不夠？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Next.js 是「React 的全端框架」—React 寫前端、Next 加上路由 / SSR / API / 部署一條龍。 |
| `ch10_l10_4.png` | L10.4 Server Components vs Client Components | Clean educational infographic explaining 「Server Components vs Client Components」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Client Components：「需要互動時用 "use client"」—按鈕 / 表單 / hook 都要這個。 |
| `ch10_l10_8.png` | L10.8 資料抓取與三層快取 | Clean educational infographic explaining 「資料抓取與三層快取」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Data Fetching：「在 Server Component 直接 fetch」—async function + await、超直觀。 |
| `ch10_l10_13.png` | L10.13 Parallel Routes + Intercepting Routes | Clean educational infographic explaining 「Parallel Routes + Intercepting Routes」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Image Optimization：&lt;Image&gt; 自動優化圖片—lazy load / WebP / 響應式尺寸全包。 |
| `ch10_l10_17.png` | L10.17 Nuxt useFetch / useAsyncData / $fetch | Clean educational infographic explaining 「Nuxt useFetch / useAsyncData / $fetch」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Parallel Routes / Intercepting Routes：「同一頁同時顯示多個 route」—進階用法。 |
| `ch10_l10_21.png` | L10.21 Next vs Nuxt 完整對照 | Clean educational infographic explaining 「Next vs Nuxt 完整對照」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Edge Runtime：「全球邊緣節點跑你的 code」—latency 趨近 0。 |
| `ch10_l10_23.png` | L10.23 效能優化清單 | Clean educational infographic explaining 「效能優化清單」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Next.js vs Remix vs Astro：2026 全端框架比較—場景選對工具。 |

**Ch11 行動裝置 App**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch11_l11_8.png` | L11.8 AsyncStorage + SecureStore + MMKV | Clean educational infographic explaining 「AsyncStorage + SecureStore + MMKV」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：本地儲存—一般 / 敏感 / 高效能各有工具 |
| `ch11_l11_16.png` | L11.16 App 效能優化 | Clean educational infographic explaining 「App 效能優化」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：60fps 滑順 vs 卡頓 = 留存差 10 倍 |
| `ch11_l11_24.png` | L11.24 Mobile Auth 深度：JWT / OAuth / Biometric | Clean educational infographic explaining 「Mobile Auth 深度：JWT / OAuth / Biometric」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不只 login、還有 token refresh、生物辨識、SSO |

**Ch12 資安基礎**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch12_l12_3.png` | L12.3 XSS：跨站腳本攻擊 | Clean educational infographic explaining 「XSS：跨站腳本攻擊」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：攻擊者注入 JS 到網頁、偷 cookie / 操作 user |
| `ch12_l12_6.png` | L12.6 JWT 安全使用 | Clean educational infographic explaining 「JWT 安全使用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：現代 web auth 標準、但用錯一樣不安全 |
| `ch12_l12_7.png` | L12.7 HTTPS + TLS + 證書 | Clean educational infographic explaining 「HTTPS + TLS + 證書」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不走 HTTPS = 中間人可看 / 改流量 |
| `ch12_l12_10.png` | L12.10 Session vs JWT vs OAuth | Clean educational infographic explaining 「Session vs JWT vs OAuth」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：三種主流 auth 方式、各有場景 |
| `ch12_l12_11.png` | L12.11 Authentication vs Authorization | Clean educational infographic explaining 「Authentication vs Authorization」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：「你是誰」vs「你能做什麼」—兩件事 |
| `ch12_l12_19.png` | L12.19 滲透測試 vs 紅隊 | Clean educational infographic explaining 「滲透測試 vs 紅隊」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：主動找漏洞、別等駭客來 |

**Ch13 SEO + GEO**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch13_l13_11.png` | L13.11 SEO 演算法 + 心法 | Clean educational infographic explaining 「SEO 演算法 + 心法」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Google 怎麼決定排名？ |

**Ch14 PWA 跨平台**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch14_l14_14.png` | L14.14 IndexedDB 實戰 | Clean educational infographic explaining 「IndexedDB 實戰」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：localStorage 不夠用、用 IndexedDB |

**Ch15 前端 DevOps**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch15_l15_10.png` | L15.10 npm vs yarn vs pnpm vs bun | Clean educational infographic explaining 「npm vs yarn vs pnpm vs bun」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：套件管理器選哪個？2026 各有強項 |
| `ch15_l15_15.png` | L15.15 Code Quality 工具棧 | Clean educational infographic explaining 「Code Quality 工具棧」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：ESLint / Prettier / TypeScript / Husky |

**Ch16 後端世界全圖**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch16_l16_2.png` | L16.2 HTTP 協定完整：method、status、header、cookie | Clean educational infographic explaining 「HTTP 協定完整：method、status、header、cookie」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：HTTP 是「網路的共通語言」—瀏覽器跟伺服器溝通的標準協議。 |
| `ch16_l16_3.png` | L16.3 API 設計模式：REST / GraphQL / gRPC / WebSocket / tRPC | Clean educational infographic explaining 「API 設計模式：REST / GraphQL / gRPC / WebSocket / tRPC」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：HTTP Methods（GET / POST / PUT / DELETE）是「要做什麼動作」—讀 / 建立 / 更新 / 刪除。 |
| `ch16_l16_5.png` | L16.5 後端語言全覽：11 個主流選擇 | Clean educational infographic explaining 「後端語言全覽：11 個主流選擇」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：REST API 是「設計 API 的一套通用規矩」—2026 仍是最主流。 |
| `ch16_l16_6.png` | L16.6 怎麼選後端語言：5 個維度決策 | Clean educational infographic explaining 「怎麼選後端語言：5 個維度決策」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：GraphQL 是「客戶端問什麼伺服器給什麼」—解決 REST 過取 / 少取問題。 |
| `ch16_l16_8.png` | L16.8 認證與授權：JWT、Session、OAuth、RBAC、ABAC | Clean educational infographic explaining 「認證與授權：JWT、Session、OAuth、RBAC、ABAC」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：REST vs GraphQL vs gRPC：三種 API 風格比較—場景選對工具。 |
| `ch16_l16_9.png` | L16.9 Background Job / Queue：Redis、RabbitMQ、Kafka | Clean educational infographic explaining 「Background Job / Queue：Redis、RabbitMQ、Kafka」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Auth 認證：「確認你是誰」—Session / JWT / OAuth 三種主流。 |
| `ch16_l16_10.png` | L16.10 Cache 策略：Redis、Memcached、CDN | Clean educational infographic explaining 「Cache 策略：Redis、Memcached、CDN」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JWT（JSON Web Token）是「自帶簽名的身分證」—2026 API 認證主流。 |
| `ch16_l16_11.png` | L16.11 Rate Limiting + API 防護 | Clean educational infographic explaining 「Rate Limiting + API 防護」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：OAuth：「用 Google / Facebook 帳號登入別的網站」—第三方認證標準。 |
| `ch16_l16_12.png` | L16.12 WebSocket、SSE、長輪詢：即時通訊 | Clean educational infographic explaining 「WebSocket、SSE、長輪詢：即時通訊」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Database 入門：「資料怎麼存」—關聯式（SQL）vs 文件式（NoSQL）。 |
| `ch16_l16_14.png` | L16.14 日誌 / 監控 / 追蹤：Logging、Metrics、Tracing | Clean educational infographic explaining 「日誌 / 監控 / 追蹤：Logging、Metrics、Tracing」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JOIN：「把兩個表合在一起」—訂單 + 使用者資料一起拿。 |
| `ch16_l16_15.png` | L16.15 效能優化：N+1、connection pool、index、異步 | Clean educational infographic explaining 「效能優化：N+1、connection pool、index、異步」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Index（索引）是「資料庫的快速查找」—沒索引大表查找慢 1000 倍。 |
| `ch16_l16_19.png` | L16.19 HTTP 完整：method / status code / header / cookies | Clean educational infographic explaining 「HTTP 完整：method / status code / header / cookies」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：所有 web 互動的底層、會 HTTP 才會 debug 任何網路問題 |
| `ch16_l16_20.png` | L16.20 REST API 設計原則 | Clean educational infographic explaining 「REST API 設計原則」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不只「能跑」、設計好的 REST 讓 API 自然好用 |
| `ch16_l16_21.png` | L16.21 API 認證：API Key / OAuth / JWT 對比 | Clean educational infographic explaining 「API 認證：API Key / OAuth / JWT 對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：API 怎麼確定「是你」？3 大主流認證方式各有適用場景 |

**Ch17 SQL 資料庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch17_l17_1.png` | L17.1 什麼是 SQL？為什麼學了 50 年還在用？ | Clean educational infographic explaining 「什麼是 SQL？為什麼學了 50 年還在用？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：SQL 就是「跟資料庫說話的語言」—跟 DB 說「給我所有使用者」「加新訂單」「改這欄」。 |
| `ch17_l17_13.png` | L17.13 DELETE：刪除資料 / 軟刪除 vs 硬刪除 | Clean educational infographic explaining 「DELETE：刪除資料 / 軟刪除 vs 硬刪除」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：DELETE = 「刪資料」—但 production 推薦軟刪除（用 deleted_at 標記）、不真的 DELETE。 |
| `ch17_l17_14.png` | L17.14 INNER JOIN：把兩個表合起來最常見的方式 | Clean educational infographic explaining 「INNER JOIN：把兩個表合起來最常見的方式」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：INNER JOIN = 「兩邊都有的才出現」—80% 場景用這個。 |
| `ch17_l17_15.png` | L17.15 LEFT JOIN：找出沒下單的客戶 | Clean educational infographic explaining 「LEFT JOIN：找出沒下單的客戶」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：LEFT JOIN = 「左邊全保留、右邊沒對應補 NULL」—找「缺什麼」的神器。 |
| `ch17_l17_16.png` | L17.16 JOIN 進階：CROSS JOIN / SELF JOIN / LATERAL | Clean educational infographic explaining 「JOIN 進階：CROSS JOIN / SELF JOIN / LATERAL」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：JOIN 不只 INNER 跟 LEFT—還有產生組合、自我關聯、橫向關聯三種進階。 |
| `ch17_l17_19.png` | L17.19 索引（Index）：查詢從 10 秒到 0.01 秒 | Clean educational infographic explaining 「索引（Index）：查詢從 10 秒到 0.01 秒」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：索引 = 「資料庫的目錄」—沒索引大表查找慢 1000 倍、加了索引秒回。 |
| `ch17_l17_20.png` | L17.20 EXPLAIN：找出慢查詢的偵探刀 | Clean educational infographic explaining 「EXPLAIN：找出慢查詢的偵探刀」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：EXPLAIN = 「告訴你這個 query 怎麼跑」—走不走索引、預計多久、卡在哪—一目了然。 |
| `ch17_l17_21.png` | L17.21 Transaction：保證資料一致性 | Clean educational infographic explaining 「Transaction：保證資料一致性」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Transaction = 「全部成功、或全部失敗」—轉帳必用、不然錢消失。 |
| `ch17_l17_22.png` | L17.22 View / Materialized View：把複雜 query 包成虛擬表 | Clean educational infographic explaining 「View / Materialized View：把複雜 query 包成虛擬表」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：View = 「儲存好的 SELECT」—之後直接 SELECT view 就好、不用每次寫複雜 JOIN。 |
| `ch17_l17_25.png` | L17.25 Full-Text Search：DB 內建的全文搜尋 | Clean educational infographic explaining 「Full-Text Search：DB 內建的全文搜尋」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：PG 內建全文搜尋—不用裝 Elasticsearch、tsvector + GIN 索引就能做出秒級中文搜尋。 |

**Ch18 NoSQL 資料庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch18_l18_1.png` | L18.1 什麼是 NoSQL？跟 SQL 差在哪？ | Clean educational infographic explaining 「什麼是 NoSQL？跟 SQL 差在哪？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：NoSQL = 「Not Only SQL」—不是反 SQL、是補它的不足。彈性 schema、橫向擴展、特殊用途各有強項。 |
| `ch18_l18_3.png` | L18.3 Firebase：Google 出的雲端後端神器 | Clean educational infographic explaining 「Firebase：Google 出的雲端後端神器」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Firebase = 「Google 雲端後端 BaaS」—Firestore（DB）+ Auth + Storage + Hosting + Functions 一條龍。學生 / Indie 首選。 |
| `ch18_l18_4.png` | L18.4 Redis：把網站加速 10 倍的記憶體 DB | Clean educational infographic explaining 「Redis：把網站加速 10 倍的記憶體 DB」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Redis = 「記憶體裡的鍵值資料庫」—資料存在 RAM、讀寫快過硬碟 100 倍。快取 / Session / 排行榜 / 限流必備。 |
| `ch18_l18_5.png` | L18.5 Vector Database：AI 應用的核心 | Clean educational infographic explaining 「Vector Database：AI 應用的核心」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Vector DB = 「以語意搜尋的資料庫」—不是搜關鍵字、是搜「意思接近的」。RAG / 推薦 / 圖搜圖必備。 |
| `ch18_l18_10.png` | L18.10 Firebase Firestore：純前端的後端 | Clean educational infographic explaining 「Firebase Firestore：純前端的後端」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Google 的 BaaS（Backend as a Service）—免後端、純 JS 前端直接讀寫 |
| `ch18_l18_12.png` | L18.12 Vector DB 完整：pgvector / Pinecone / Qdrant | Clean educational infographic explaining 「Vector DB 完整：pgvector / Pinecone / Qdrant」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：AI 時代的核心 DB—相似度搜尋、RAG 必備 |
| `ch18_l18_14.png` | L18.14 NoSQL 索引 + 效能調校 | Clean educational infographic explaining 「NoSQL 索引 + 效能調校」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：沒 index 一樣慢、但策略跟 SQL 略不同 |
| `ch18_l18_15.png` | L18.15 SQL vs NoSQL 對比 + 怎麼選 | Clean educational infographic explaining 「SQL vs NoSQL 對比 + 怎麼選」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不是「誰好」、是「什麼場景用什麼」 |
| `ch18_l18_18.png` | L18.18 Neo4j / Graph DB：社交 + 推薦 | Clean educational infographic explaining 「Neo4j / Graph DB：社交 + 推薦」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：存「關係」、找朋友的朋友 SQL 5 JOIN、Cypher 一行 |
| `ch18_l18_21.png` | L18.21 Backup / Restore：永遠別賭 | Clean educational infographic explaining 「Backup / Restore：永遠別賭」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Production DB 出事 = 公司倒、Day 1 設好 |

**Ch19 DB 進階**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch19_l19_2.png` | L19.2 Index 深入：B-tree / GIN / GiST | Clean educational infographic explaining 「Index 深入：B-tree / GIN / GiST」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不同 index 適合不同 query |
| `ch19_l19_4.png` | L19.4 Transaction + Isolation Levels | Clean educational infographic explaining 「Transaction + Isolation Levels」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：多筆操作要嘛全成、要嘛全敗 |

**Ch20 API 設計**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch20_l20_1.png` | L20.1 API 設計總圖：REST / GraphQL / tRPC | Clean educational infographic explaining 「API 設計總圖：REST / GraphQL / tRPC」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：三種主流 API 風格、各有適合場景 |
| `ch20_l20_2.png` | L20.2 RESTful 設計原則 | Clean educational infographic explaining 「RESTful 設計原則」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：URL 是名詞、動詞用 HTTP method |
| `ch20_l20_3.png` | L20.3 GraphQL 入門 | Clean educational infographic explaining 「GraphQL 入門」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：一個 endpoint、客戶端決定要什麼 |
| `ch20_l20_4.png` | L20.4 tRPC：TS 全端神器 | Clean educational infographic explaining 「tRPC：TS 全端神器」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：TS 推斷、無需 schema、Next.js 黃金搭檔 |
| `ch20_l20_6.png` | L20.6 GraphQL：Schema-First 設計 | Clean educational infographic explaining 「GraphQL：Schema-First 設計」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：一個 endpoint、client 決定要什麼 |

**Ch21 認證授權**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch21_l21_4.png` | L21.4 RBAC + RLS：細緻權限 | Clean educational infographic explaining 「RBAC + RLS：細緻權限」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不只「管理員 vs 用戶」、要更細 |
| `ch21_l21_5.png` | L21.5 Session vs JWT 實作 | Clean educational infographic explaining 「Session vs JWT 實作」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：兩種主流 token 管理 |
| `ch21_l21_6.png` | L21.6 Session vs JWT vs Cookie 完整對比 | Clean educational infographic explaining 「Session vs JWT vs Cookie 完整對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：3 種 auth 方式、各有適合場景 |

**Ch23 雲端架構**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch23_l23_6.png` | L23.6 AWS / GCP / Azure 比較 | Clean educational infographic explaining 「AWS / GCP / Azure 比較」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：三大雲、各有強項 |

**Ch25 網域 + DNS + SSL**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch25_l25_1.png` | L25.1 網域註冊 + 管理 | Clean educational infographic explaining 「網域註冊 + 管理」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：買網域、設 DNS、上線你的網站 |
| `ch25_l25_6.png` | L25.6 DNS 完整心法 | Clean educational infographic explaining 「DNS 完整心法」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：網址背後的對照表系統 |
| `ch25_l25_7.png` | L25.7 SSL / HTTPS / Let's Encrypt | Clean educational infographic explaining 「SSL / HTTPS / Let's Encrypt」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：HTTPS 不是選項、是必須 |
| `ch25_l25_10.png` | L25.10 CDN + DNS 進階整合 | Clean educational infographic explaining 「CDN + DNS 進階整合」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：邊緣 + 智能 routing |

**Ch26 Python 基礎**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch26_l26_3.png` | L26.3 基本型態：int / float / str / bool | Clean educational infographic explaining 「基本型態：int / float / str / bool」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：變數 / 型別：Python 是動態型別—不用宣告 type、直接給值。 |
| `ch26_l26_12.png` | L26.12 Type Hints + mypy：靜態型別檢查 | Clean educational infographic explaining 「Type Hints + mypy：靜態型別檢查」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：File I/O：讀寫檔案—open / read / write—爬蟲 / 資料分析必備。 |
| `ch26_l26_18.png` | L26.18 特徵工程 + train/test split | Clean educational infographic explaining 「特徵工程 + train/test split」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Async / Await：「Python 的非同步」—FastAPI / aiohttp 基礎。 |
| `ch26_l26_19.png` | L26.19 評估指標：accuracy / precision / recall / F1 / AUC | Clean educational infographic explaining 「評估指標：accuracy / precision / recall / F1 / AUC」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Type Hints：「Python 加上型別標註」—像 TypeScript、可選但建議用。 |
| `ch26_l26_21.png` | L26.21 深度學習基礎：神經網路 / 反向傳播 | Clean educational infographic explaining 「深度學習基礎：神經網路 / 反向傳播」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：FastAPI：「2026 Python 後端首選」—async + 自動 OpenAPI 文件、極快。 |
| `ch26_l26_27.png` | L26.27 Async / Dependency Injection | Clean educational infographic explaining 「Async / Dependency Injection」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Celery：「背景任務佇列」—寄信 / 處理影片 / 大型計算放後面跑。 |
| `ch26_l26_29.png` | L26.29 認證：JWT / OAuth | Clean educational infographic explaining 「認證：JWT / OAuth」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Python 效能優化:profiler / multiprocessing / Cython—讓 Python 飛起來。 |
| `ch26_l26_31.png` | L26.31 Django + DRF 對比 | Clean educational infographic explaining 「Django + DRF 對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Python 跟資料分析：Pandas + Jupyter—資料科學家的 Excel 替代品。 |

**Ch27 Python 資料分析**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch27_l27_1.png` | L27.1 為什麼 Python 是資料分析霸主？ | Clean educational infographic explaining 「為什麼 Python 是資料分析霸主？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Python 在資料分析的地位 = JavaScript 在前端的地位—2026 全球資料分析師 90% 用它。 |
| `ch27_l27_3.png` | L27.3 NumPy：所有資料分析的底層 | Clean educational infographic explaining 「NumPy：所有資料分析的底層」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：NumPy = 「Python 的高速計算引擎」—向量化計算快 Python 100 倍。Pandas / TF / PyTorch 全基於它。 |
| `ch27_l27_5.png` | L27.5 matplotlib + seaborn：畫圖兩件套 | Clean educational infographic explaining 「matplotlib + seaborn：畫圖兩件套」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：matplotlib = 「畫圖底層」、seaborn = 「美化 + 統計圖」—兩個一起用、什麼圖都能畫。 |
| `ch27_l27_16.png` | L27.16 A/B Test 統計分析 | Clean educational infographic explaining 「A/B Test 統計分析」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：產品經理推 A vs B、誰好？不靠感覺、用統計顯著性 |

**Ch28 Python 爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch28_l28_11.png` | L28.11 反爬蟲：UA / Cookie / 代理 | Clean educational infographic explaining 「反爬蟲：UA / Cookie / 代理」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：網站擋你？這些招數讓你像真人 |
| `ch28_l28_14.png` | L28.14 Async 爬蟲：httpx | Clean educational infographic explaining 「Async 爬蟲：httpx」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：並發 100 個 URL 不要 for loop、用 async |
| `ch28_l28_15.png` | L28.15 登入 + Session 爬蟲 | Clean educational infographic explaining 「登入 + Session 爬蟲」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：抓需要登入才能看的資料 |
| `ch28_l28_21.png` | L28.21 爬蟲監控 + 錯誤處理 | Clean educational infographic explaining 「爬蟲監控 + 錯誤處理」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：一個錯就死 vs 持續穩定—靠監控 |

**Ch29 JavaScript 爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch29_l29_1.png` | L29.1 Node.js 爬蟲 vs Python 爬蟲 | Clean educational infographic explaining 「Node.js 爬蟲 vs Python 爬蟲」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：兩個都行—Python 文件多 / Node 對 JS 渲染天然友善。看你後端用什麼、選一個。 |

**Ch30 跨語言爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch30_l30_7.png` | L30.7 Python vs Node vs Go：爬蟲語言對比 | Clean educational infographic explaining 「Python vs Node vs Go：爬蟲語言對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不同語言爬蟲各有所長 |
| `ch30_l30_22.png` | L30.22 儲存策略：CSV vs Parquet vs DB | Clean educational infographic explaining 「儲存策略：CSV vs Parquet vs DB」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不同階段用不同 storage |

**Ch31 Node.js 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch31_l31_1.png` | L31.1 Node.js 是什麼？為什麼後端用 JS | Clean educational infographic explaining 「Node.js 是什麼？為什麼後端用 JS」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Node.js 就是「讓 JavaScript 跑在伺服器」—2009 革命性發明、改變整個生態。 |
| `ch31_l31_3.png` | L31.3 第一個 HTTP server + Node 內建 API | Clean educational infographic explaining 「第一個 HTTP server + Node 內建 API」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Event Loop：「Node 為什麼這麼快」—單執行緒但用非同步 I/O 處理高併發。 |
| `ch31_l31_5.png` | L31.5 ES Modules vs CommonJS | Clean educational infographic explaining 「ES Modules vs CommonJS」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：fs 模組：「讀寫檔案」—Node 內建、最基礎的能力。 |
| `ch31_l31_6.png` | L31.6 npm / pnpm / yarn / bun：套件管理 | Clean educational infographic explaining 「npm / pnpm / yarn / bun：套件管理」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：http 模組：「Node 內建可開伺服器」—雖然平常用 Express、但底層是它。 |
| `ch31_l31_10.png` | L31.10 Hono / Fastify：modern 替代品 | Clean educational infographic explaining 「Hono / Fastify：modern 替代品」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：REST API with Express：15 行 code 寫出可用 API—Node 後端入門。 |
| `ch31_l31_12.png` | L31.12 Zod：驗證 + 型別推導 | Clean educational infographic explaining 「Zod：驗證 + 型別推導」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Auth：JWT / Passport / NextAuth—Node 的認證主流。 |
| `ch31_l31_13.png` | L31.13 JWT 認證 + bcrypt 密碼 | Clean educational infographic explaining 「JWT 認證 + bcrypt 密碼」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：WebSocket with Socket.IO：「即時通訊」—聊天 / 推播 / 多人協作。 |
| `ch31_l31_20.png` | L31.20 Bun vs Node vs Deno：2026 runtime 戰 | Clean educational infographic explaining 「Bun vs Node vs Deno：2026 runtime 戰」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Performance：cluster / PM2 / 監控—讓 Node 撐住高流量。 |
| `ch31_l31_21.png` | L31.21 tRPC：全 TypeScript 全端 | Clean educational infographic explaining 「tRPC：全 TypeScript 全端」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Hono / Fastify：「2026 Node 後端新星」—比 Express 快 3 倍。 |

**Ch32 Go 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch32_l32_2.png` | L32.2 變數、型別、常數 | Clean educational infographic explaining 「變數、型別、常數」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Go 為什麼快：「編譯成原生機器碼」—不像 JS / Python 要在 runtime 翻譯。 |
| `ch32_l32_16.png` | L32.16 Gin / Fiber / Chi：主流框架對比 | Clean educational infographic explaining 「Gin / Fiber / Chi：主流框架對比」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：編譯與部署：「Go 跨平台編譯神器」—一行 build 出 Mac / Linux / Windows binary。 |
| `ch32_l32_19.png` | L32.19 測試 + Benchmark | Clean educational infographic explaining 「測試 + Benchmark」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：gRPC：「Google 出的高效 RPC」—Go 的 native 玩具。 |
| `ch32_l32_20.png` | L32.20 部署：Docker + 跨平台編譯 | Clean educational infographic explaining 「部署：Docker + 跨平台編譯」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：整章實戰：用 Go 寫一個 CLI 工具 + 一個 REST API—體驗 Go 的雙重身份。 |

**Ch33 Rust 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch33_l33_2.png` | L33.2 SEO 原理：搜尋引擎怎麼運作 | Clean educational infographic explaining 「SEO 原理：搜尋引擎怎麼運作」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：為什麼學 Rust：「能寫 C 速度的程式、又不會記憶體錯誤」—2026 系統語言首選。 |
| `ch33_l33_6.png` | L33.6 Sitemap、robots.txt、canonical | Clean educational infographic explaining 「Sitemap、robots.txt、canonical」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Option / Result：「Rust 不用 null 跟 exception」—用型別表達。 |
| `ch33_l33_8.png` | L33.8 Core Web Vitals：頁面速度 | Clean educational infographic explaining 「Core Web Vitals：頁面速度」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Traits：「Rust 的 interface」—定義行為、type 實作。 |
| `ch33_l33_9.png` | L33.9 Backlink：誰連結你比你多重要 | Clean educational infographic explaining 「Backlink：誰連結你比你多重要」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Async Rust：「Rust 的非同步」—Tokio 是事實標準。 |
| `ch33_l33_10.png` | L33.10 內容行銷：E-E-A-T 與 Pillar / Cluster | Clean educational infographic explaining 「內容行銷：E-E-A-T 與 Pillar / Cluster」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Tokio：「Rust 的 async runtime」—99% Rust async 用它。 |
| `ch33_l33_15.png` | L33.15 AI 搜尋引擎完整名單 | Clean educational infographic explaining 「AI 搜尋引擎完整名單」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Error Handling：anyhow / thiserror—生產級 Rust 的標配。 |
| `ch33_l33_24.png` | L33.24 Rust async/await：Tokio runtime 完整 | Clean educational infographic explaining 「Rust async/await：Tokio runtime 完整」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：tokio 是 Rust 的 Node.js runtime—99% 後端 / CLI 用它 |
| `ch33_l33_25.png` | L33.25 Axum：Rust 最熱門 Web 框架 | Clean educational infographic explaining 「Axum：Rust 最熱門 Web 框架」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：tower + tokio + serde 黃金組合、效能爆量、type-safe |

**Ch34 Java + Spring Boot**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch34_l34_1.png` | L34.1 Java 為什麼仍是主流 | Clean educational infographic explaining 「Java 為什麼仍是主流」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：2026 Java 仍是企業 backend 第一 |
| `ch34_l34_2.png` | L34.2 Spring Boot 起步 + REST API | Clean educational infographic explaining 「Spring Boot 起步 + REST API」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：5 分鐘建一個企業級 API |

**Ch35 C# + .NET**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch35_l35_1.png` | L35.1 C# + .NET 為什麼選 | Clean educational infographic explaining 「C# + .NET 為什麼選」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Microsoft 出、跨平台、企業愛 |
| `ch35_l35_2.png` | L35.2 ASP.NET Core 起步 | Clean educational infographic explaining 「ASP.NET Core 起步」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：建一個 REST API、跟 Spring Boot 類似 |

**Ch37 WordPress 接案**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch37_l37_1.png` | L37.1 WordPress 為什麼仍是接案金礦 | Clean educational infographic explaining 「WordPress 為什麼仍是接案金礦」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：43% 全網用 WordPress、台灣中小企業最愛 |

**Ch39 LINE Bot + LIFF**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch39_l39_1.png` | L39.1 LINE 生態系總圖：官方帳號 vs Bot vs LIFF | Clean educational infographic explaining 「LINE 生態系總圖：官方帳號 vs Bot vs LIFF」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：台灣 2300 萬人都用 LINE、商業必懂 |

**Ch40 Kotlin / Dart**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch40_l40_1.png` | L40.1 Kotlin vs Dart：兩大 Mobile 語言 | Clean educational infographic explaining 「Kotlin vs Dart：兩大 Mobile 語言」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Android 原生 vs Flutter 跨平台 |
| `ch40_l40_4.png` | L40.4 Kotlin 進階：Coroutines + Flow | Clean educational infographic explaining 「Kotlin 進階：Coroutines + Flow」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Kotlin 並發 / async 神器 |

**Ch42 接案完整流程**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch42_l42_1.png` | L42.1 接案 vs 全職：怎麼選 | Clean educational infographic explaining 「接案 vs 全職：怎麼選」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不是「誰好」、是「適合誰」 |

**Ch43 專案管理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch43_l43_1.png` | L43.1 為什麼工程師也要懂專案管理 | Clean educational infographic explaining 「為什麼工程師也要懂專案管理」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：專案管理就是「把雜亂事情整理出輕重緩急」—工程師不是只寫 code、更要會規劃。 |
| `ch43_l43_2.png` | L43.2 三大流派：瀑布、敏捷、Lean | Clean educational infographic explaining 「三大流派：瀑布、敏捷、Lean」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Agile vs Waterfall：「敏捷 vs 瀑布」—2026 軟體業 90% 用 Agile。 |
| `ch43_l43_12.png` | L43.12 變更管理：對抗 Scope Creep | Clean educational infographic explaining 「變更管理：對抗 Scope Creep」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Gantt Chart：「橫向時間軸」—大型瀑布專案常用、軟體業少用。 |
| `ch43_l43_22.png` | L43.22 Linear：2026 最熱 PM 工具 | Clean educational infographic explaining 「Linear：2026 最熱 PM 工具」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：為什麼新一代 startup 全部從 Jira 跑 Linear？因為速度快 5 倍、UI 美 5 倍 |

**Ch44 產品經理 PdM**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch44_l44_1.png` | L44.1 PdM vs PM：真實工作差別 | Clean educational infographic explaining 「PdM vs PM：真實工作差別」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：PdM 跟 PM 不一樣：「PdM 決定做什麼 / PM 決定怎麼做」。 |
| `ch44_l44_11.png` | L44.11 GTM：Go-to-Market 怎麼上線 | Clean educational infographic explaining 「GTM：Go-to-Market 怎麼上線」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：RICE Framework：Reach × Impact × Confidence / Effort—具體分數比較。 |
| `ch44_l44_18.png` | L44.18 B2B vs B2C：完全不同思維 | Clean educational infographic explaining 「B2B vs B2C：完全不同思維」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Launch Planning：「產品上線前要做的所有事」—行銷 / 客服 / 文件 / Monitor。 |

**Ch45 跨職能協作**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch45_l45_1.png` | L45.1 為什麼跨職能會痛：incentive 不同 | Clean educational infographic explaining 「為什麼跨職能會痛：incentive 不同」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：跨職能協作就是「工程 + 設計 + PM + 行銷 + 業務 一起做產品」—2026 indie 跟大公司都要會。 |
| `ch45_l45_2.png` | L45.2 工程 × 設計 | Clean educational infographic explaining 「工程 × 設計」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：工程師 vs 設計師：「兩種思維」—工程重邏輯 / 設計重感受。 |
| `ch45_l45_5.png` | L45.5 工程 × 行銷 | Clean educational infographic explaining 「工程 × 行銷」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：工程師 vs PM：「兩種優先序」—工程重「做對」/ PM 重「做對的事」。 |
| `ch45_l45_9.png` | L45.9 工程 × HR | Clean educational infographic explaining 「工程 × HR」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Async Communication：「不一定要開會」—寫好文件 + 訊息常比會議有效。 |
| `ch45_l45_14.png` | L45.14 跨團隊衝突處理 | Clean educational infographic explaining 「跨團隊衝突處理」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Time Zone：「跨時區團隊怎麼合作」—Async / 重疊時段 / 文件化。 |
| `ch45_l45_21.png` | L45.21 Code Review 文化：給 feedback 不傷感情 | Clean educational infographic explaining 「Code Review 文化：給 feedback 不傷感情」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：「這 code 爛」vs「建議用 X pattern」—同樣意思、效果差 10 倍 |
| `ch45_l45_22.png` | L45.22 遠端工作 + Async 文化 | Clean educational infographic explaining 「遠端工作 + Async 文化」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不是「全員上線」、是「文件先、會議後」 |

**Ch46 AI/ML 原理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch46_l46_2.png` | L46.2 機器學習三大類 | Clean educational infographic explaining 「機器學習三大類」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Machine Learning vs Deep Learning：ML 是大類、DL 是其中之一。 |
| `ch46_l46_4.png` | L46.4 Transformer：為什麼改變一切 | Clean educational infographic explaining 「Transformer：為什麼改變一切」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：訓練（Training）：「不斷調整模型權重、讓答案更接近正確」。 |
| `ch46_l46_5.png` | L46.5 LLM 是什麼：GPT / Claude / Gemini 怎麼運作 | Clean educational infographic explaining 「LLM 是什麼：GPT / Claude / Gemini 怎麼運作」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Loss Function：「衡量答錯多嚴重」—訓練的目標就是讓 loss 變小。 |
| `ch46_l46_8.png` | L46.8 Prompt Engineering 入門 | Clean educational infographic explaining 「Prompt Engineering 入門」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Overfitting：「模型死背題目、考新題不會」—AI 工程師最頭痛問題。 |
| `ch46_l46_13.png` | L46.13 RAG 完整：Retrieval Augmented Generation | Clean educational infographic explaining 「RAG 完整：Retrieval Augmented Generation」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Attention：「Transformer 的核心」—算每個字跟其他字的關聯度。 |
| `ch46_l46_14.png` | L46.14 Embedding：文字變向量的魔法 | Clean educational infographic explaining 「Embedding：文字變向量的魔法」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：LLM（大語言模型）：「Transformer 放超大、訓練超久」—GPT / Claude 的本質。 |
| `ch46_l46_17.png` | L46.17 LangChain / LangGraph 入門 | Clean educational infographic explaining 「LangChain / LangGraph 入門」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Vector Database：「存 embedding 的資料庫」—RAG / 推薦 / 搜尋必備。Pinecone / pgvector。 |
| `ch46_l46_19.png` | L46.19 LlamaIndex：RAG 專家 | Clean educational infographic explaining 「LlamaIndex：RAG 專家」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Fine-tuning：「用你的資料微調模型」—讓 LLM 學你公司的特殊知識。 |
| `ch46_l46_20.png` | L46.20 Fine-tune vs RAG vs Prompt：怎麼選 | Clean educational infographic explaining 「Fine-tune vs RAG vs Prompt：怎麼選」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Prompt Engineering：「會問問題比會寫程式重要」—2026 最被低估的技能。 |
| `ch46_l46_23.png` | L46.23 多模態：圖片 / 語音 / 影片 AI | Clean educational infographic explaining 「多模態：圖片 / 語音 / 影片 AI」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Diffusion Model：「Midjourney / DALL-E / Stable Diffusion 的原理」—生圖核心。 |

**Ch47 AI 應用工程**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch47_l47_4.png` | L47.4 客服 / 對話：10 種 AI 應用 | Clean educational infographic explaining 「客服 / 對話：10 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Prompt Engineering 實戰：「Role + Context + Task + Format」—4 大要素。 |
| `ch47_l47_5.png` | L47.5 銷售 / 行銷 / SEO：12 種 AI 應用 | Clean educational infographic explaining 「銷售 / 行銷 / SEO：12 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：System Prompt：「給 AI 設個性 / 規則」—Persona 設計核心。 |
| `ch47_l47_6.png` | L47.6 教育 / 學習 / 訓練：10 種 AI 應用 | Clean educational infographic explaining 「教育 / 學習 / 訓練：10 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Few-shot Learning：「給 AI 看幾個例子、它就會」—prompt 最有效技巧之一。 |
| `ch47_l47_11.png` | L47.11 房地產 / 仲介：6 種 AI 應用 | Clean educational infographic explaining 「房地產 / 仲介：6 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：RAG 實作：用 vector DB + LLM 做專業知識問答—企業 AI 主流場景。 |
| `ch47_l47_12.png` | L47.12 餐飲 / 旅遊 / 服務業：10 種 AI 應用 | Clean educational infographic explaining 「餐飲 / 旅遊 / 服務業：10 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Embedding 實戰：用 text-embedding 把文字變向量—語意搜尋的關鍵。 |
| `ch47_l47_13.png` | L47.13 製造 / 物流：6 種 AI 應用 | Clean educational infographic explaining 「製造 / 物流：6 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Vector Search：用 cosine similarity 找最近向量—RAG 第一步。 |
| `ch47_l47_17.png` | L47.17 開發 / IT 維運：12 種 AI 應用 | Clean educational infographic explaining 「開發 / IT 維運：12 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Cost Optimization：「LLM API 怎麼省錢」—prompt 短 / 用便宜模型 / cache。 |
| `ch47_l47_19.png` | L47.19 個人生產力 / 助手：12 種 AI 應用 | Clean educational infographic explaining 「個人生產力 / 助手：12 種 AI 應用」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Safety / Guardrails：「防止 AI 講錯話 / 被攻擊」—Prompt injection 防範。 |
| `ch47_l47_22.png` | L47.22 一人公司 indie hacker 怎麼用 AI | Clean educational infographic explaining 「一人公司 indie hacker 怎麼用 AI」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：整章實戰：用 Next.js + Claude API 做一個 AI 客服 SaaS—Streaming + RAG + Memory + 金流。 |
| `ch47_l47_25.png` | L47.25 RAG 系統完整實作：給 AI 你的知識庫 | Clean educational infographic explaining 「RAG 系統完整實作：給 AI 你的知識庫」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Vector 搜尋 + LLM 生成 = AI 知道你的私人文件 |

**Ch48 Vibe Coding**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch48_l48_19.png` | L48.19 AI 寫前端 vs 後端 vs DevOps 差異 | Clean educational infographic explaining 「AI 寫前端 vs 後端 vs DevOps 差異」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Vibe Coding 心法：「會問問題比會寫程式重要」—2026 工程師核心能力轉變。 |
| `ch48_l48_22.png` | L48.22 Prompt 寫法：給 AI 寫對 code | Clean educational infographic explaining 「Prompt 寫法：給 AI 寫對 code」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不是「幫我寫」、要「給 context + 範例 + 限制」 |

**Ch50 n8n 自動化**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch50_l50_1.png` | L50.1 為什麼要學自動化？ | Clean educational infographic explaining 「為什麼要學自動化？」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：n8n 是「拖拉式的自動化平台」—把重複工作交給機器、不用寫太多 code。 |
| `ch50_l50_2.png` | L50.2 n8n vs Zapier vs Make 怎麼選 | Clean educational infographic explaining 「n8n vs Zapier vs Make 怎麼選」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：為什麼學 n8n：「Zapier 的 open source 版」—免費、自架、無限 workflow。 |
| `ch50_l50_13.png` | L50.13 實戰 3：客服 RAG bot | Clean educational infographic explaining 「實戰 3：客服 RAG bot」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：RAG Workflow：用 n8n 做知識庫問答—vector DB + LLM 在 n8n 內串。 |

**Ch52 AI 設計**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch52_l52_2.png` | L52.2 Midjourney + Prompt 工程 | Clean educational infographic explaining 「Midjourney + Prompt 工程」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：寫對 prompt = 神圖、寫錯 = 廢圖 |
| `ch52_l52_4.png` | L52.4 Midjourney 進階 Prompt + Style Code | Clean educational infographic explaining 「Midjourney 進階 Prompt + Style Code」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：不只「a cat」、要設計感 |

**Ch53 AI 導演 / 短影音**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch53_l53_4.png` | L53.4 Runway / Pika / Luma 比較 | Clean educational infographic explaining 「Runway / Pika / Luma 比較」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：影片 AI 三巨頭、各有強項 |

**Ch59 一人公司 / Indie**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch59_l59_1.png` | L59.1 為什麼是一人公司時代 | Clean educational infographic explaining 「為什麼是一人公司時代」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：一人公司就是「不上班、自己當老闆」—2026 趨勢、AI 讓這事變得可行。 |
| `ch59_l59_2.png` | L59.2 三條路：freelance vs SaaS vs creator | Clean educational infographic explaining 「三條路：freelance vs SaaS vs creator」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Indie Hacker 是什麼：「自己做產品、賺生活費」—不追億級獨角獸、追自由。 |
| `ch59_l59_3.png` | L59.3 找第一個客戶（接案） | Clean educational infographic explaining 「找第一個客戶（接案）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：為什麼現在能做一人公司：AI + SaaS + Stripe + 雲端—基礎設施齊全。 |

**Ch61 附錄 A：前端三劍客大全**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch61_l61_2.png` | L61.2 CSS 屬性完整大全（300+） | Clean educational infographic explaining 「CSS 屬性完整大全（300+）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：從 align-content 到 z-index，所有 CSS 屬性依類別整理。 |
| `ch61_l61_3.png` | L61.3 JavaScript API 完整大全（200+） | Clean educational infographic explaining 「JavaScript API 完整大全（200+）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Array、Object、String、DOM、Window、Promise 等核心 API 全部整理。 |

**Ch62 附錄 B：後端 / 資料庫速查**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch62_l62_1.png` | L62.1 SQL 完整速查（含 Window Functions、CTE、Index） | Clean educational infographic explaining 「SQL 完整速查（含 Window Functions、CTE、Index）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：從 SELECT 到 Window Functions、CTE、索引優化全在一頁。 |
| `ch62_l62_4.png` | L62.4 HTTP / REST / Status Code 速查 | Clean educational infographic explaining 「HTTP / REST / Status Code 速查」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Methods、Headers、Status Code、CORS、Cache 完整對照。 |

**Ch63 附錄 C：AI / Prompt 工法大全**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch63_l63_4.png` | L63.4 RAG / Embedding / Vector DB 名詞表 | Clean educational infographic explaining 「RAG / Embedding / Vector DB 名詞表」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：RAG、向量檢索、chunking 策略、Vector DB 比較。 |

**Ch66 附錄 F：創作 / 設計速查**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch66_l66_1.png` | L66.1 配色系統（Material / Tailwind / Apple HIG 完整色票） | Clean educational infographic explaining 「配色系統（Material / Tailwind / Apple HIG 完整色票）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：色彩理論、可讀對比、accessibility 顏色 |
| `ch66_l66_3.png` | L66.3 設計原則 + 範例（CRAP 法則） | Clean educational infographic explaining 「設計原則 + 範例（CRAP 法則）」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：對比、重複、對齊、親密性 |

**Ch67 附錄 G：法律 / 隱私 / 安全**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch67_l67_4.png` | L67.4 Cookie / Privacy Policy 範本 | Clean educational infographic explaining 「Cookie / Privacy Policy 範本」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：中英文範本、Cookie banner 工法 |

**Ch68 附錄 H：高階工程師修煉路徑**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch68_l68_1.png` | L68.1 什麼是高階工程師？跟 senior 的差別 | Clean educational infographic explaining 「什麼是高階工程師？跟 senior 的差別」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：從『寫好 code』升級到『讓系統不會壞』 |
| `ch68_l68_2.png` | L68.2 單元測試（Unit Test）— 不是寫給老闆看的 | Clean educational infographic explaining 「單元測試（Unit Test）— 不是寫給老闆看的」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：為什麼測試是高階工程師的基本功、不寫測試的人都會踩這些坑 |
| `ch68_l68_7.png` | L68.7 並發 / 分散式 — 兩個人一起改一個東西 | Clean educational infographic explaining 「並發 / 分散式 — 兩個人一起改一個東西」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：race condition、lock、為什麼分散式系統會壞 |
| `ch68_l68_10.png` | L68.10 Code Review — 寫的人 vs 看的人 | Clean educational infographic explaining 「Code Review — 寫的人 vs 看的人」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：好的 review 文化讓團隊變強、爛的讓人想離職 |
| `ch68_l68_11.png` | L68.11 Mentoring — 把 junior 帶起來 | Clean educational infographic explaining 「Mentoring — 把 junior 帶起來」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：技術 senior 比較好當、教得會別人的 senior 才稀有 |
| `ch68_l68_16.png` | L68.16 First Principles — 從根本想、不照搬 | Clean educational infographic explaining 「First Principles — 從根本想、不照搬」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Elon Musk 為什麼能做火箭：問「為什麼這樣？」直到問不下去 |

**Ch69 附錄 I：學習資源庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch69_l69_6.png` | L69.6 AI / Prompt 書籍與資源 | Clean educational infographic explaining 「AI / Prompt 書籍與資源」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：AI 領域變太快、書 + 部落格 + 論文一起看。 |

**Ch70 附錄 J：程式碼遊樂場**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch70_l70_4.png` | L70.4 AI / ML 遊樂場 | Clean educational infographic explaining 「AI / ML 遊樂場」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：玩 LLM、訓練模型、看 prompt 效果。 |

**Ch71 除錯聖經 · Debug 思維建立**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch71_l71_1.png` | L71.1 AI 為什麼也會卡 Bug | Clean educational infographic explaining 「AI 為什麼也會卡 Bug」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：就算你用最強的 AI 寫程式，bug 還是會發生—— bug 不是「你太笨」也不是「AI 不夠強」，而是寫程式的本質。 |

**Ch72 React 進階**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch72_l72_5.png` | L72.5 Server Component vs Client Component 心智模型 | Clean educational infographic explaining 「Server Component vs Client Component 心智模型」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Next.js 預設 Server Component (沒 JS、SEO 友善)、加 `'use client'` 才變 Client (有互動)。一條線分兩世界。 |

**Ch73 Vue 進階**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch73_l73_2.png` | L73.2 Pinia — Vue 官方狀態管理 (取代 Vuex) | Clean educational infographic explaining 「Pinia — Vue 官方狀態管理 (取代 Vuex)」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Pinia 是 Vue 3 官方推薦的狀態管理、比 Vuex 簡單 90%、TypeScript 支援好、是 2026 業界標配。 |
| `ch73_l73_4.png` | L73.4 進階 SFC — Teleport / Suspense / v-memo | Clean educational infographic explaining 「進階 SFC — Teleport / Suspense / v-memo」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：進階 Vue 三大武器：Teleport (跨 DOM 樹移動 modal)、Suspense (處理 async component loading)、v-memo (列表性能優化)。 |
| `ch73_l73_5.png` | L73.5 Vue 性能優化清單 | Clean educational infographic explaining 「Vue 性能優化清單」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：10 個業界 Vue 性能技巧、從 v-show vs v-if 到 shallowRef、列表虛擬滾動、code splitting。 |

**Ch74 Vite — 現代前端 build 工具**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch74_l74_1.png` | L74.1 為什麼 Vite — 跟 Webpack 的本質差異 | Clean educational infographic explaining 「為什麼 Vite — 跟 Webpack 的本質差異」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：Webpack 啟動 dev server 要 30 秒、Vite 只要 1 秒。原因：Vite 用瀏覽器原生 ES Module、不用打包就能跑。 |

**Ch75 HTTP 協定完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch75_l75_5.png` | L75.5 CORS / HTTPS / HTTP2 / HTTP3 — 跨域 + 加密 + 新版協定 | Clean educational infographic explaining 「CORS / HTTPS / HTTP2 / HTTP3 — 跨域 + 加密 + 新版協定」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. 重點：CORS 是瀏覽器的保護機制：不同網域之間預設不能互相 fetch、要 server 開白名單才行。HTTPS / HTTP2 / HTTP3 是不同代的 HTTP 升級版。 |

---

## 4. 🔵 C 類：流程 / 架構圖（共 132 條）

> prompt 已含「flowchart + 節點箭頭 + 顏色分類」風格。

**Ch01 HTML 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch01_l1_10.png` | L1.10 JSON-LD 結構化資料：Google 富片段的秘密 | Technical flowchart / architecture diagram of 「JSON-LD 結構化資料：Google 富片段的秘密」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：JSON-LD 是給 AI 跟 Google 看的「結構化說明書」—讓你的網頁有機會出現在「富片段」（評分星星、價格、FAQ 直接顯示）。 |
| `ch01_l1_21.png` | L1.21 結構化資料：JSON-LD / Schema.org | Technical flowchart / architecture diagram of 「結構化資料：JSON-LD / Schema.org」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Google 不只讀文字、讀結構化資料才知道你是部落格 / 商店 / 食譜 |

**Ch03 UI/UX 設計原理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch03_l3_8.png` | L3.8 Form：完整表單流程 | Technical flowchart / architecture diagram of 「Form：完整表單流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Nielsen 10 大可用性原則—UX 界的「10 誡」、做產品時拿來檢查。 |

**Ch04 JavaScript 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch04_l4_6.png` | L4.6 陣列：最常用的資料結構 | Technical flowchart / architecture diagram of 「陣列：最常用的資料結構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：迴圈（for / while）是「重複做同一件事 N 次」—不用複製貼上 100 行。 |
| `ch04_l4_14.png` | L4.14 Fetch API 與網路請求 | Technical flowchart / architecture diagram of 「Fetch API 與網路請求」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：事件監聽（addEventListener）是「等使用者做動作再執行」—點擊 / 輸入 / 滾動。 |

**Ch06 JSON 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch06_l6_6.png` | L6.6 巢狀結構與資料正規化 | Technical flowchart / architecture diagram of 「巢狀結構與資料正規化」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：JSON-LD 是「給 Google + AI 看的 JSON」—加在網頁裡讓搜尋引擎理解內容。 |
| `ch06_l6_15.png` | L6.15 JSON Schema：驗證資料結構 | Technical flowchart / architecture diagram of 「JSON Schema：驗證資料結構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不只看「能 parse」、JSON Schema 驗證「結構對不對」 |

**Ch07 程式邏輯共通**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch07_l7_5.png` | L7.5 流程控制 1：條件（if / else / switch / pattern match） | Technical flowchart / architecture diagram of 「流程控制 1：條件（if / else / switch / pattern match）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：If / else 條件判斷是「程式的岔路口」—符合條件走 A、不然走 B。 |
| `ch07_l7_6.png` | L7.6 流程控制 2：迴圈（for / while / 迭代器） | Technical flowchart / architecture diagram of 「流程控制 2：迴圈（for / while / 迭代器）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Switch / Match 是「多分支選擇」—比一連串 if 更清楚。 |
| `ch07_l7_8.png` | L7.8 資料結構 1：陣列（List / Array） | Technical flowchart / architecture diagram of 「資料結構 1：陣列（List / Array）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Function（函式）是「把一段邏輯包起來、取名字、重複用」。 |
| `ch07_l7_9.png` | L7.9 資料結構 2：字典（Dict / Map / HashMap） | Technical flowchart / architecture diagram of 「資料結構 2：字典（Dict / Map / HashMap）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Scope（作用域）是「變數在哪裡可以被看到」—local / global / closure。 |
| `ch07_l7_10.png` | L7.10 資料結構 3：Set / Tuple / Stack / Queue / Tree / Graph | Technical flowchart / architecture diagram of 「資料結構 3：Set / Tuple / Stack / Queue / Tree / Graph」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Recursion（遞迴）是「函式自己呼叫自己」—解某些問題超漂亮。 |
| `ch07_l7_15.png` | L7.15 記憶體模型：Stack / Heap / 指標 / GC | Technical flowchart / architecture diagram of 「記憶體模型：Stack / Heap / 指標 / GC」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：資料結構：Array / Map / Set / Stack / Queue—不同結構解不同問題。 |
| `ch07_l7_25.png` | L7.25 字串處理 + 正則表達式 | Technical flowchart / architecture diagram of 「字串處理 + 正則表達式」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Refactoring（重構）：「不改功能、只改結構」—把舊 code 變漂亮。 |

**Ch08 React 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch08_l8_10.png` | L8.10 useMemo + useCallback：性能優化 | Technical flowchart / architecture diagram of 「useMemo + useCallback：性能優化」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Custom Hook 是「把可重用邏輯抽出來」—自己寫的 hook、像 useState 一樣好用。 |
| `ch08_l8_16.png` | L8.16 Data Fetching：React Query | Technical flowchart / architecture diagram of 「Data Fetching：React Query」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Tanstack Query / SWR：「API 資料管理的神器」—快取 / 重抓 / loading state 全包。 |
| `ch08_l8_19.png` | L8.19 Testing：Vitest + Testing Library | Technical flowchart / architecture diagram of 「Testing：Vitest + Testing Library」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Performance Optimization：memo / useMemo / useCallback—避免不必要的重渲染。 |
| `ch08_l8_21.png` | L8.21 2026 React stack：Next.js + Tailwind + shadcn | Technical flowchart / architecture diagram of 「2026 React stack：Next.js + Tailwind + shadcn」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Error Boundary：「某個 component 壞了不要整個 App 掛掉」。 |
| `ch08_l8_25.png` | L8.25 React Performance：memo / useMemo / useCallback 何時用 | Technical flowchart / architecture diagram of 「React Performance：memo / useMemo / useCallback 何時用」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不是「永遠包 memo」—濫用反而傷效能。學會何時該優化 |

**Ch10 Next.js / Nuxt**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch10_l10_2.png` | L10.2 五種渲染模式深入 | Technical flowchart / architecture diagram of 「五種渲染模式深入」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：App Router 是「Next.js 的新路由系統」—資料夾結構即路由、2024 起主流。 |
| `ch10_l10_3.png` | L10.3 Next.js 14+ App Router 完整架構 | Technical flowchart / architecture diagram of 「Next.js 14+ App Router 完整架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Server Components：「在伺服器跑的 React」—Next.js 14+ 預設、效能極高。 |
| `ch10_l10_9.png` | L10.9 Streaming + Suspense + Loading UI | Technical flowchart / architecture diagram of 「Streaming + Suspense + Loading UI」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Caching：Next.js 4 層快取系統—Request Memoization / Data Cache / Full Route Cache / Router Cache。 |
| `ch10_l10_11.png` | L10.11 Middleware：請求中介層 | Technical flowchart / architecture diagram of 「Middleware：請求中介層」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：API Routes：「在 Next.js 裡寫後端 API」—app/api/route.ts 就是 endpoint。 |
| `ch10_l10_12.png` | L10.12 圖片字型優化 | Technical flowchart / architecture diagram of 「圖片字型優化」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Middleware：「請求進來前先過一遍」—驗證 / redirect / A/B test 全在這。 |
| `ch10_l10_16.png` | L10.16 Nuxt 3 架構 | Technical flowchart / architecture diagram of 「Nuxt 3 架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Streaming：「一段段送 HTML、不用等全部好」—大頁面也能秒開。 |

**Ch11 行動裝置 App**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch11_l11_5.png` | L11.5 狀態管理：Zustand + TanStack Query | Technical flowchart / architecture diagram of 「狀態管理：Zustand + TanStack Query」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：2026 主流組合—Zustand 管 client、Query 管 server |

**Ch12 資安基礎**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch12_l12_4.png` | L12.4 CSRF：跨站請求偽造 | Technical flowchart / architecture diagram of 「CSRF：跨站請求偽造」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：攻擊者騙 user 用 user 身份做事 |
| `ch12_l12_17.png` | L12.17 Zero Trust 架構 | Technical flowchart / architecture diagram of 「Zero Trust 架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：「永遠驗證、不信任預設」的安全模型 |

**Ch13 SEO + GEO**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch13_l13_3.png` | L13.3 Technical SEO | Technical flowchart / architecture diagram of 「Technical SEO」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：網站速度慢 / 結構亂 = 內容再好沒用 |
| `ch13_l13_9.png` | L13.9 內容生產流程 | Technical flowchart / architecture diagram of 「內容生產流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：一個人持續寫 100 篇？流程化、可 |
| `ch13_l13_12.png` | L13.12 Schema.org 結構化資料深入 | Technical flowchart / architecture diagram of 「Schema.org 結構化資料深入」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：讓 Google 顯示 rich snippet、CTR +30% |
| `ch13_l13_24.png` | L13.24 SEO 接案完整流程 + 報價 | Technical flowchart / architecture diagram of 「SEO 接案完整流程 + 報價」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：會 SEO 月入 NT$ 30-200k |

**Ch14 PWA 跨平台**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch14_l14_16.png` | L14.16 Push Notification 完整流程 | Technical flowchart / architecture diagram of 「Push Notification 完整流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：從 VAPID 到 user 看到通知 |
| `ch14_l14_20.png` | L14.20 PWA 接案：報價 + 流程 | Technical flowchart / architecture diagram of 「PWA 接案：報價 + 流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：會 PWA = 月入 NT$ 30-100k |

**Ch15 前端 DevOps**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch15_l15_6.png` | L15.6 Preview Deploy + Staging | Technical flowchart / architecture diagram of 「Preview Deploy + Staging」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：每個 PR 一個獨立網址、review 神器 |
| `ch15_l15_7.png` | L15.7 Monitoring：Sentry + Better Stack | Technical flowchart / architecture diagram of 「Monitoring：Sentry + Better Stack」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：上線後不監控 = 瞎飛 |
| `ch15_l15_9.png` | L15.9 Production 部署 SOP | Technical flowchart / architecture diagram of 「Production 部署 SOP」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不只 push、要有流程 |
| `ch15_l15_14.png` | L15.14 Monorepo：Turborepo / Nx / pnpm workspace | Technical flowchart / architecture diagram of 「Monorepo：Turborepo / Nx / pnpm workspace」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：多個 package 一個 repo |

**Ch16 後端世界全圖**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch16_l16_1.png` | L16.1 後端到底在做什麼？請求生命週期完整解析 | Technical flowchart / architecture diagram of 「後端到底在做什麼？請求生命週期完整解析」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：後端就是「網站的廚房」—使用者看不到、但所有資料 / 邏輯 / 帳號都在這。 |
| `ch16_l16_4.png` | L16.4 後端架構：Monolith / Microservice / Serverless / Edge | Technical flowchart / architecture diagram of 「後端架構：Monolith / Microservice / Serverless / Edge」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Status Code（200 / 404 / 500）是「伺服器的回應狀態」—成功 / 沒找到 / 壞了。 |
| `ch16_l16_17.png` | L16.17 後端架構模式 + API 設計原則 | Technical flowchart / architecture diagram of 「後端架構模式 + API 設計原則」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：API 文件：OpenAPI / Swagger—寫 API 必附文件、不然沒人會用。 |

**Ch17 SQL 資料庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch17_l17_23.png` | L17.23 Trigger / Function：DB 內建邏輯 | Technical flowchart / architecture diagram of 「Trigger / Function：DB 內建邏輯」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Trigger = 「INSERT / UPDATE 發生時自動跑 code」—像 DB 的 webhook。 |

**Ch18 NoSQL 資料庫**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch18_l18_6.png` | L18.6 SQL vs NoSQL 怎麼選？決策指南 | Technical flowchart / architecture diagram of 「SQL vs NoSQL 怎麼選？決策指南」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：沒有「最好」的、只有「適合」的—看 4 個維度決定：資料結構 / 關聯複雜度 / 一致性需求 / 規模。 |
| `ch18_l18_9.png` | L18.9 MongoDB Aggregation Pipeline | Technical flowchart / architecture diagram of 「MongoDB Aggregation Pipeline」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Mongo 的 GROUP BY + JOIN = aggregation pipeline、複雜分析的核心 |
| `ch18_l18_11.png` | L18.11 Redis 完整：5 種資料結構 + 應用場景 | Technical flowchart / architecture diagram of 「Redis 完整：5 種資料結構 + 應用場景」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Redis 是「記憶體裡的瑞士刀」—快取、排行榜、訊息佇列、計數器全包 |

**Ch19 DB 進階**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch19_l19_12.png` | L19.12 Multi-tenant 架構 | Technical flowchart / architecture diagram of 「Multi-tenant 架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：一個 DB 服務多個 tenant、3 種模式 |

**Ch20 API 設計**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch20_l20_8.png` | L20.8 Webhook 設計 + 安全 | Technical flowchart / architecture diagram of 「Webhook 設計 + 安全」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：第三方通知你、不是你 poll |

**Ch21 認證授權**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch21_l21_2.png` | L21.2 密碼 + OAuth + Magic Link | Technical flowchart / architecture diagram of 「密碼 + OAuth + Magic Link」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：三種主流認證流程 |

**Ch22 部署 + Docker**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch22_l22_8.png` | L22.8 Zero-downtime Deploy | Technical flowchart / architecture diagram of 「Zero-downtime Deploy」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：上線時不能掛、要無縫切換 |

**Ch23 雲端架構**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch23_l23_1.png` | L23.1 雲端架構總圖：AWS / GCP / Azure | Technical flowchart / architecture diagram of 「雲端架構總圖：AWS / GCP / Azure」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：三巨頭各有強項、Indie 不必全學 |
| `ch23_l23_5.png` | L23.5 Microservice vs Monolith | Technical flowchart / architecture diagram of 「Microservice vs Monolith」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不是「微服務一定好」、看規模 + 團隊 |

**Ch24 監控與 Logs**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch24_l24_3.png` | L24.3 Logs：結構化 + 集中化 | Technical flowchart / architecture diagram of 「Logs：結構化 + 集中化」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不是 console.log、是 structured + searchable |
| `ch24_l24_8.png` | L24.8 Structured Logging | Technical flowchart / architecture diagram of 「Structured Logging」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：一行 message 不夠、用 JSON 結構化 |

**Ch26 Python 基礎**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch26_l26_5.png` | L26.5 if / for / while + Comprehension | Technical flowchart / architecture diagram of 「if / for / while + Comprehension」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：List / Tuple / Dict / Set—Python 4 大資料結構—每個有不同用途。 |
| `ch26_l26_23.png` | L26.23 CNN / RNN / Transformer：3 大架構 | Technical flowchart / architecture diagram of 「CNN / RNN / Transformer：3 大架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Flask：「Python 的微型框架」—輕量、彈性、新手第一個後端框架。 |
| `ch26_l26_28.png` | L26.28 SQLAlchemy 2.0 + Alembic | Technical flowchart / architecture diagram of 「SQLAlchemy 2.0 + Alembic」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Deploy Python App：Gunicorn / Uvicorn / Docker—讓 Python 上線。 |

**Ch27 Python 資料分析**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch27_l27_7.png` | L27.7 實戰：完整資料分析流程 | Technical flowchart / architecture diagram of 「實戰：完整資料分析流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：把整章學的整合成完整報告—讀資料 → 清洗 → 探索 → 視覺化 → 結論。 |

**Ch28 Python 爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch28_l28_2.png` | L28.2 Requests + BeautifulSoup：靜態頁神器 | Technical flowchart / architecture diagram of 「Requests + BeautifulSoup：靜態頁神器」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Requests 抓 HTML、BeautifulSoup 解析—學會這兩個 = 80% 網站能爬。 |
| `ch28_l28_6.png` | L28.6 IP 池 / Proxy 服務：被封 IP 的救星 | Technical flowchart / architecture diagram of 「IP 池 / Proxy 服務：被封 IP 的救星」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Proxy = 「中間人 IP」—你的請求經過 Proxy 出去、對方看到的是 Proxy 的 IP、不是你的。 |
| `ch28_l28_7.png` | L28.7 實戰：完整爬蟲專案（爬 PChome 商品） | Technical flowchart / architecture diagram of 「實戰：完整爬蟲專案（爬 PChome 商品）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：把整章所學整合：Requests + BS4 + Playwright + Pandas + 儲存—爬 PChome 24h 某分類所有商品、存成 CSV。 |
| `ch28_l28_8.png` | L28.8 requests + BeautifulSoup：爬蟲基本盤 | Technical flowchart / architecture diagram of 「requests + BeautifulSoup：爬蟲基本盤」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Python 爬蟲入門、抓網頁 + 解析 HTML 瑞士刀 |

**Ch29 JavaScript 爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch29_l29_2.png` | L29.2 fetch + Cheerio：Node 最輕量組合 | Technical flowchart / architecture diagram of 「fetch + Cheerio：Node 最輕量組合」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Node 內建 fetch + Cheerio（jQuery 風格）= 「Node 版的 Requests + BeautifulSoup」。輕、快、語法熟。 |
| `ch29_l29_6.png` | L29.6 實戰：爬蝦皮商品（完整 Node 專案） | Technical flowchart / architecture diagram of 「實戰：爬蝦皮商品（完整 Node 專案）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：爬蝦皮（React SPA）= 「Playwright + 攔 API + 並發」—2026 最完整 Node 爬蟲流程。 |
| `ch29_l29_12.png` | L29.12 攔截 + 修改 Network | Technical flowchart / architecture diagram of 「攔截 + 修改 Network」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不只看 response、能改 / mock—debug 神器 |
| `ch29_l29_15.png` | L29.15 Curl Impersonate：TLS fingerprint | Technical flowchart / architecture diagram of 「Curl Impersonate：TLS fingerprint」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：requests 偽裝不了 TLS、需特殊工具 |
| `ch29_l29_18.png` | L29.18 TypeScript 爬蟲：型別安全 | Technical flowchart / architecture diagram of 「TypeScript 爬蟲：型別安全」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：爬蟲資料結構複雜、TS 救命 |

**Ch30 跨語言爬蟲**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch30_l30_6.png` | L30.6 實戰：千萬規模爬蟲架構設計 | Technical flowchart / architecture diagram of 「實戰：千萬規模爬蟲架構設計」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：整合本章所學：Go colly + Redis Queue + Postgres + Kubernetes—每天爬 1 千萬頁的真實架構。 |
| `ch30_l30_21.png` | L30.21 資料清理 + ETL pipeline | Technical flowchart / architecture diagram of 「資料清理 + ETL pipeline」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：抓到的資料 90% 要清理 |

**Ch31 Node.js 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch31_l31_4.png` | L31.4 package.json + npm scripts | Technical flowchart / architecture diagram of 「package.json + npm scripts」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Async / Callbacks / Promises：Node 的非同步演化史—2026 全用 async / await。 |
| `ch31_l31_8.png` | L31.8 Async：Promise、async/await、Event Loop | Technical flowchart / architecture diagram of 「Async：Promise、async/await、Event Loop」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Middleware：「請求進來前先過一遍」—Express 的核心概念。 |

**Ch32 Go 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch32_l32_3.png` | L32.3 流程控制：if / for / switch | Technical flowchart / architecture diagram of 「流程控制：if / for / switch」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Go 語法：「故意設計得無聊」—只有 25 個關鍵字、學一週就掌握。 |
| `ch32_l32_7.png` | L32.7 Pointer：指標完整 | Technical flowchart / architecture diagram of 「Pointer：指標完整」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Struct：「Go 的物件」—沒 class、但能組合出複雜結構。 |
| `ch32_l32_18.png` | L32.18 認證 JWT + middleware | Technical flowchart / architecture diagram of 「認證 JWT + middleware」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Microservices：「Go 是微服務首選」—小、快、單檔部署、容易 scale。 |
| `ch32_l32_22.png` | L32.22 Go Concurrency：goroutine + channel 進階 | Technical flowchart / architecture diagram of 「Go Concurrency：goroutine + channel 進階」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Go 的殺手特色—輕量級線程 + 通訊管道、寫 server 不用學 callback |

**Ch33 Rust 完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch33_l33_1.png` | L33.1 行銷 vs 工程師：為什麼工程師該懂 | Technical flowchart / architecture diagram of 「行銷 vs 工程師：為什麼工程師該懂」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Rust 是「最安全、最快的鋼鐵戰士語言」—Mozilla 出的、連續 8 年 Stack Overflow 最愛。 |
| `ch33_l33_5.png` | L33.5 JSON-LD 結構化資料完整 | Technical flowchart / architecture diagram of 「JSON-LD 結構化資料完整」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Cargo：「Rust 的套件管理 + 建置工具」—一條龍體驗。 |
| `ch33_l33_19.png` | L33.19 社群行銷：IG / Threads / Dcard / X | Technical flowchart / architecture diagram of 「社群行銷：IG / Threads / Dcard / X」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Cargo Workspaces：「Monorepo 多套件管理」—大型 Rust 專案的組織方式。 |

**Ch38 電商 + 金流物流**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch38_l38_1.png` | L38.1 電商架構總圖 | Technical flowchart / architecture diagram of 「電商架構總圖」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不只「商品 + 購物車」、是完整生態 |
| `ch38_l38_3.png` | L38.3 物流整合 + 電商完整流程 | Technical flowchart / architecture diagram of 「物流整合 + 電商完整流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：台灣物流：黑貓 + 7-11 + 全家 |
| `ch38_l38_4.png` | L38.4 電商架構：自建 vs 平台 | Technical flowchart / architecture diagram of 「電商架構：自建 vs 平台」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Shopify / WooCommerce / 自架 / 蝦皮 |

**Ch39 LINE Bot + LIFF**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch39_l39_4.png` | L39.4 LINE Developer：Provider + Channel 概念 | Technical flowchart / architecture diagram of 「LINE Developer：Provider + Channel 概念」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：寫 LINE Bot 前必懂的基礎架構 |
| `ch39_l39_5.png` | L39.5 LINE Bot Webhook：接收訊息 | Technical flowchart / architecture diagram of 「LINE Bot Webhook：接收訊息」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：寫 Bot 第一步：能收到用戶訊息 |

**Ch43 專案管理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch43_l43_21.png` | L43.21 Agile / Scrum 完整流程 | Technical flowchart / architecture diagram of 「Agile / Scrum 完整流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：為什麼大公司全部跑 Agile？因為計畫 1 年只完成 30%、計畫 2 週完成 90% |

**Ch45 跨職能協作**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch45_l45_19.png` | L45.19 工程師跟設計師溝通：Figma Dev Mode + Tokens | Technical flowchart / architecture diagram of 「工程師跟設計師溝通：Figma Dev Mode + Tokens」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不只看設計稿、看 Figma layer 結構 + design tokens、轉成 code 才快 |
| `ch45_l45_24.png` | L45.24 On-call + Incident response | Technical flowchart / architecture diagram of 「On-call + Incident response」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：24/7 production 服務需有人接手—輪班 + playbook |

**Ch46 AI/ML 原理**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch46_l46_11.png` | L46.11 結構化輸出：JSON Mode / Pydantic / Zod | Technical flowchart / architecture diagram of 「結構化輸出：JSON Mode / Pydantic / Zod」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：RNN / LSTM：「看順序的 AI」—預測股票 / 語音 / 翻譯（2017 前主流）。 |
| `ch46_l46_12.png` | L46.12 串流（Streaming）：邊產邊顯示 | Technical flowchart / architecture diagram of 「串流（Streaming）：邊產邊顯示」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Transformer：「2017 革命性架構」—ChatGPT / Claude / Gemini 都用它。 |
| `ch46_l46_16.png` | L46.16 Agent 架構：ReAct / Plan-Execute / Multi-agent | Technical flowchart / architecture diagram of 「Agent 架構：ReAct / Plan-Execute / Multi-agent」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Embedding：「把文字變數字、讓 AI 理解語意」—向量資料庫的基礎。 |
| `ch46_l46_25.png` | L46.25 AI 倫理與偏見 | Technical flowchart / architecture diagram of 「AI 倫理與偏見」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：整章總複習：用 PyTorch 訓練一個小 CNN 辨識貓狗—從零理解 AI 訓練全流程。 |

**Ch47 AI 應用工程**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch47_l47_3.png` | L47.3 寫作 / 翻譯 / 編輯：10 種 AI 應用 | Technical flowchart / architecture diagram of 「寫作 / 翻譯 / 編輯：10 種 AI 應用」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：API 串接：「打 HTTP request、收回應」—5 行 code 接 AI。 |
| `ch47_l47_8.png` | L47.8 法律 / 合規：8 種 AI 應用 | Technical flowchart / architecture diagram of 「法律 / 合規：8 種 AI 應用」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Streaming Response：「邊回答邊顯示」—ChatGPT 那種「字一個一個跑」的效果。 |
| `ch47_l47_9.png` | L47.9 金融 / 投資 / 會計：10 種 AI 應用 | Technical flowchart / architecture diagram of 「金融 / 投資 / 會計：10 種 AI 應用」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Function Calling / Tool Use：「讓 AI 呼叫你的 function」—agent 基礎。 |
| `ch47_l47_21.png` | L47.21 政府 / 公部門 / NGO：6 種 AI 應用 | Technical flowchart / architecture diagram of 「政府 / 公部門 / NGO：6 種 AI 應用」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：AI Agent 設計：「給 AI 多個工具、讓它自己選」—agent 起點。 |

**Ch48 Vibe Coding**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch48_l48_6.png` | L48.6 Prompt 即架構：怎麼跟 AI 下指令 | Technical flowchart / architecture diagram of 「Prompt 即架構：怎麼跟 AI 下指令」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Vibe Coding 工作流：「先設計、再交給 AI」—不是丟一句「做個 X」就完。 |
| `ch48_l48_9.png` | L48.9 多 Agent 工作流：分工才會強 | Technical flowchart / architecture diagram of 「多 Agent 工作流：分工才會強」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：AI Refactoring：「讓 AI 重構你的舊 code」—1 小時做完之前 1 週的事。 |
| `ch48_l48_10.png` | L48.10 實戰：SnowRealm 雙 Agent 完整流程 | Technical flowchart / architecture diagram of 「實戰：SnowRealm 雙 Agent 完整流程」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：AI Debug：「跟 AI 一起 debug」—貼 error 給它、5 分鐘找出原因。 |

**Ch49 AI Agent**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch49_l49_1.png` | L49.1 什麼是 Agent？跟 LLM、Tool Use 怎麼分？ | Technical flowchart / architecture diagram of 「什麼是 Agent？跟 LLM、Tool Use 怎麼分？」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：AI Agent 就是「會自己跑任務的 AI」—不只回答問題、會主動操作工具、執行多步驟。 |
| `ch49_l49_2.png` | L49.2 Agent 進化簡史（2022-2026） | Technical flowchart / architecture diagram of 「Agent 進化簡史（2022-2026）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Agent vs LLM：「能不能自主行動」—關鍵差別。 |
| `ch49_l49_3.png` | L49.3 ReAct 架構：Agent 最經典 | Technical flowchart / architecture diagram of 「ReAct 架構：Agent 最經典」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：ReAct Loop：「Reasoning + Acting」—Agent 的基本循環。 |
| `ch49_l49_5.png` | L49.5 Multi-Agent 架構 | Technical flowchart / architecture diagram of 「Multi-Agent 架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Memory：「Agent 怎麼記住事情」—short-term（context）/ long-term（vector DB）。 |
| `ch49_l49_6.png` | L49.6 從零實作 Agent Loop | Technical flowchart / architecture diagram of 「從零實作 Agent Loop」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Planning：「先想清楚再動手」—複雜任務 agent 必備。 |
| `ch49_l49_7.png` | L49.7 Tool Use 完整 | Technical flowchart / architecture diagram of 「Tool Use 完整」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Multi-Agent：「多個 agent 分工合作」—像團隊。 |
| `ch49_l49_8.png` | L49.8 Memory 系統：Agent 怎麼「記住事」 | Technical flowchart / architecture diagram of 「Memory 系統：Agent 怎麼「記住事」」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Function Calling Schema：「告訴 AI 工具長什麼樣」—JSON Schema 定義。 |
| `ch49_l49_10.png` | L49.10 Browser Agent | Technical flowchart / architecture diagram of 「Browser Agent」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：OpenAI Function Calling：「GPT 的工具呼叫」—跟 Anthropic 類似、格式不同。 |
| `ch49_l49_11.png` | L49.11 Agent 框架比較：LangGraph / CrewAI / AutoGen / Mastra | Technical flowchart / architecture diagram of 「Agent 框架比較：LangGraph / CrewAI / AutoGen / Mastra」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：MCP Server：「自製 agent 工具」—Anthropic 2024 標準、爆紅中。 |
| `ch49_l49_12.png` | L49.12 OpenAI Assistants / Anthropic Skills | Technical flowchart / architecture diagram of 「OpenAI Assistants / Anthropic Skills」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：RAG Agent：「會查文件的 agent」—企業內部知識庫應用最多。 |
| `ch49_l49_14.png` | L49.14 Research Agent：自動做研究 | Technical flowchart / architecture diagram of 「Research Agent：自動做研究」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Computer Use：「Claude 會操作整個電腦」—Anthropic 2024 出、2026 成熟。 |
| `ch49_l49_15.png` | L49.15 Customer Service Agent | Technical flowchart / architecture diagram of 「Customer Service Agent」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Agent Evaluation：「怎麼測 agent 好不好」—難題。 |
| `ch49_l49_16.png` | L49.16 Sales / 業務 Agent | Technical flowchart / architecture diagram of 「Sales / 業務 Agent」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Agent Safety：「防止 agent 做傻事」—Production 部署必懂。 |
| `ch49_l49_17.png` | L49.17 個人助手 Agent | Technical flowchart / architecture diagram of 「個人助手 Agent」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Cost Control：「Agent 跑久了會吃很多 token」—一不小心一天 $1000。 |
| `ch49_l49_18.png` | L49.18 Agent 安全：sandbox / 權限 / budget | Technical flowchart / architecture diagram of 「Agent 安全：sandbox / 權限 / budget」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Agent Frameworks：LangChain / LangGraph / CrewAI / AutoGen—別自己造輪。 |
| `ch49_l49_19.png` | L49.19 Production 部署 + 監控 | Technical flowchart / architecture diagram of 「Production 部署 + 監控」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Anthropic Skills：「Claude 的擴充能力」—2025 出、改變 agent 設計。 |
| `ch49_l49_20.png` | L49.20 Agent 失敗模式 + Debug | Technical flowchart / architecture diagram of 「Agent 失敗模式 + Debug」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Browser Agent 實戰：用 Playwright + Claude 寫網頁自動化 agent。 |
| `ch49_l49_21.png` | L49.21 Agent + RAG + 多模態 = 終極組合 | Technical flowchart / architecture diagram of 「Agent + RAG + 多模態 = 終極組合」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Production Agent：「真的能上線的 agent 怎麼設計」—可觀測 / 可恢復 / 可審計。 |
| `ch49_l49_22.png` | L49.22 2026-2030 Agent 趨勢 + indie 機會 | Technical flowchart / architecture diagram of 「2026-2030 Agent 趨勢 + indie 機會」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：整章實戰：用 Claude API + MCP 寫一個能 Plan + Execute 的 agent。 |
| `ch49_l49_23.png` | L49.23 Multi-Agent 架構：多個 AI 分工合作 | Technical flowchart / architecture diagram of 「Multi-Agent 架構：多個 AI 分工合作」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不是一個 AI 做全部—多個專業 AI 互相協作、像公司分部門 |

**Ch50 n8n 自動化**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch50_l50_4.png` | L50.4 Trigger 跟 Action：n8n 兩大基本 | Technical flowchart / architecture diagram of 「Trigger 跟 Action：n8n 兩大基本」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Trigger：「workflow 怎麼開始」—Webhook / Schedule / Manual。 |
| `ch50_l50_5.png` | L50.5 條件分支 + 迴圈 | Technical flowchart / architecture diagram of 「條件分支 + 迴圈」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：HTTP Request Node：「打 API 的萬用節點」—串接任何 SaaS。 |
| `ch50_l50_8.png` | L50.8 HTTP Request：呼叫任何 API | Technical flowchart / architecture diagram of 「HTTP Request：呼叫任何 API」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Expressions：「在 node 裡寫小邏輯」—類 JS、簡單運算。 |
| `ch50_l50_12.png` | L50.12 實戰 2：自動內容工廠 | Technical flowchart / architecture diagram of 「實戰 2：自動內容工廠」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：AI Agent in n8n：2024 起 n8n 內建 AI Agent 節點—LangChain 風格。 |
| `ch50_l50_16.png` | L50.16 Monitoring + Observability | Technical flowchart / architecture diagram of 「Monitoring + Observability」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Webhook：「外面打過來觸發 workflow」—串其他服務常用。 |
| `ch50_l50_18.png` | L50.18 2026-2030 自動化趨勢 + Agent 混合架構 | Technical flowchart / architecture diagram of 「2026-2030 自動化趨勢 + Agent 混合架構」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：整章實戰：用 n8n 做一個自動化日報系統—Gmail / 行事曆 / Slack / AI 摘要全自動。 |
| `ch50_l50_21.png` | L50.21 Webhook + API 整合：n8n 變後端 | Technical flowchart / architecture diagram of 「Webhook + API 整合：n8n 變後端」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：用 n8n Webhook 取代寫 server—輕量自動化跑得起來 |
| `ch50_l50_22.png` | L50.22 n8n + AI Agent：自動化 + LLM 整合 | Technical flowchart / architecture diagram of 「n8n + AI Agent：自動化 + LLM 整合」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：把 GPT / Claude / Gemini 接進 workflow、變自動化 AI 助理 |

**Ch51 AI 寫作 / 小說**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch51_l51_2.png` | L51.2 小說寫作：世界觀 + 角色 + 大綱 | Technical flowchart / architecture diagram of 「小說寫作：世界觀 + 角色 + 大綱」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：寫小說最難的不是「字」、是「結構」 |
| `ch51_l51_6.png` | L51.6 Prompt 工程：寫作向 | Technical flowchart / architecture diagram of 「Prompt 工程：寫作向」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：不只「幫我寫」、要結構化 |

**Ch59 一人公司 / Indie**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch59_l59_14.png` | L59.14 Solo SaaS Stack（AI 加速版） | Technical flowchart / architecture diagram of 「Solo SaaS Stack（AI 加速版）」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Content Marketing：「寫部落格 / 拍影片帶來客戶」—長期玩法。 |

**Ch63 附錄 C：AI / Prompt 工法大全**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch63_l63_2.png` | L63.2 Prompt 工法 30 個模板 | Technical flowchart / architecture diagram of 「Prompt 工法 30 個模板」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：角色扮演、CoT、Few-shot、結構化輸出等實戰模板。 |

**Ch64 附錄 D：開發工具速查**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch64_l64_2.png` | L64.2 npm / yarn / pnpm 指令對照 | Technical flowchart / architecture diagram of 「npm / yarn / pnpm 指令對照」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：三大 package manager 指令對照、含 monorepo。 |

**Ch67 附錄 G：法律 / 隱私 / 安全**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch67_l67_1.png` | L67.1 個資法 / GDPR 重點與差異 | Technical flowchart / architecture diagram of 「個資法 / GDPR 重點與差異」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：什麼是個資、Lawful basis、處理流程 |

**Ch75 HTTP 協定完整**

| 檔名 | Lesson | prompt |
|---|---|---|
| `ch75_l75_1.png` | L75.1 HTTP 是什麼？URL 拆解 + 一個 request 的生命週期 | Technical flowchart / architecture diagram of 「HTTP 是什麼？URL 拆解 + 一個 request 的生命週期」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：HTTP 是 client (瀏覽器) 跟 server (後端) 用來說話的協定、像兩人講電話的「語法」、URL 是電話號碼。 |
| `ch75_l75_4.png` | L75.4 Headers + Cookie + Auth — 真正的「商業邏輯」在這 | Technical flowchart / architecture diagram of 「Headers + Cookie + Auth — 真正的「商業邏輯」在這」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. 重點：Header 是 request / response 的 metadata、藏在 body 之外。Cookie 是 server 寫在 client 上的小紙條、自動回送。 |

---

## 5. 用量小結

| 類型 | 條數 |
|---|---|
| A 操作教學 | 93 |
| B 概念解說 | 267 |
| C 流程架構 | 132 |
| **合計** | **492** |

建議先做 A 類（新手最卡）+ B 類前端核心（ch02/04/05/07），看效果再往下。
